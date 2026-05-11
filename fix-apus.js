/**
 * fix-insumos.js — Create missing insumos with correct enum type and reimport their detalles
 */
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');

const supabase = createClient(
  'https://hnbssxtdagzrbedrdynn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo'
);

async function main() {
  await supabase.auth.signInWithPassword({ email: 'guillermosalomonsolarte@gmail.com', password: 'l043211?' });
  const uid = (await supabase.auth.getUser()).data.user.id;

  // Create missing insumos with correct enum 'MATERIAL'
  const missingInsumos = [
    { nombre: 'Formaleta', unidad: 'M2', categoria: 'FERRETERIA' },
    { nombre: 'Dilatación en bronce', unidad: 'ML', categoria: 'FERRETERIA' },
    { nombre: 'Cableado en cobre cal 8', unidad: 'ML', categoria: 'ELECTRICOS' },
    { nombre: 'Cableado en cobre cal 10', unidad: 'ML', categoria: 'ELECTRICOS' },
    { nombre: 'Cableado en cobre cal 12', unidad: 'ML', categoria: 'ELECTRICOS' },
    { nombre: 'Acero 10.5 mm', unidad: 'Kg', categoria: 'ACEROS' },
    { nombre: 'Acero 6 mm', unidad: 'Kg', categoria: 'ACEROS' },
    { nombre: 'Compactación subrasante 90% Proctor M', unidad: 'M2', categoria: 'BASICOS' },
    { nombre: 'Acero 5/8" transfer', unidad: 'Kg', categoria: 'ACEROS' },
    { nombre: 'Empradización directa', unidad: 'M2', categoria: 'BASICOS' },
    { nombre: 'Tomacorriente especial tripolar', unidad: 'Un', categoria: 'ELECTRICOS' },
    { nombre: 'Bloque 2 huecos', unidad: 'Un', categoria: 'BASICOS' },
  ];

  // Excel name → DB name alias map
  const insumoAliases = {
    'formaleta 4u': 'formaleta',
    'dilatacion en bronce sin m.o.': 'dilatación en bronce',
    'cableado en cobre cal 8': 'cableado en cobre cal 8',
    'cableado en cobre cal 10': 'cableado en cobre cal 10',
    'cableado en cobre cal 12': 'cableado en cobre cal 12',
    'acero 10.5 mm': 'acero 10.5 mm',
    'acero 6 mm': 'acero 6 mm',
    'comf, compac subrasante 90% proctor m': 'compactación subrasante 90% proctor m',
    'ac 5/8" transfer': 'acero 5/8" transfer',
    'ac 5/8\\" transfer': 'acero 5/8" transfer',
    'empradiz direc': 'empradización directa',
    'tomacorren especial tripol': 'tomacorriente especial tripolar',
    'bloque 2 h': 'bloque 2 huecos',
  };

  console.log('📦 Creando insumos faltantes...');
  const newInsumoMap = new Map();

  for (const mi of missingInsumos) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('insumos').upsert({
      id, nombre: mi.nombre, unidad: mi.unidad, categoria: mi.categoria,
      tipo: 'MATERIAL', precio_unitario: 0, user_id: uid
    });
    if (error) console.error(`  ❌ ${mi.nombre}:`, error.message);
    else {
      console.log(`  ✅ ${mi.nombre} (${mi.unidad})`);
      newInsumoMap.set(mi.nombre.toLowerCase().trim(), { id, nombre: mi.nombre });
    }
  }

  // Now load ALL insumos including new ones
  const { data: allInsumos } = await supabase.from('insumos').select('id, nombre, unidad');
  const insumoMap = new Map();
  (allInsumos || []).forEach(i => insumoMap.set(i.nombre.toLowerCase().trim(), i));
  
  // Add aliases
  for (const [alias, target] of Object.entries(insumoAliases)) {
    if (target && insumoMap.has(target)) {
      insumoMap.set(alias, insumoMap.get(target));
    }
  }

  // Load APUs and cargos
  const { data: apusDB } = await supabase.from('apu').select('id, nombre');
  const { data: cargos } = await supabase.from('cargos').select('id, nombre');
  const apuMap = new Map();
  (apusDB || []).forEach(a => { apuMap.set(a.nombre, a.id); apuMap.set(a.nombre.toUpperCase(), a.id); });
  const cargoMap = new Map();
  (cargos || []).forEach(c => cargoMap.set(c.nombre.toLowerCase().trim(), c));

  // Get APU IDs that have 0 detalles (using count by apu_id)
  // Due to the 1000 row limit, we need to paginate
  let allDetApuIds = new Set();
  let from = 0;
  while (true) {
    const { data: batch } = await supabase.from('apu_detalle').select('apu_id').range(from, from + 999);
    if (!batch || batch.length === 0) break;
    batch.forEach(d => allDetApuIds.add(d.apu_id));
    from += batch.length;
    if (batch.length < 1000) break;
  }
  console.log(`\n📊 APUs con detalles: ${allDetApuIds.size}/${apusDB?.length}`);
  const emptyApus = (apusDB || []).filter(a => !allDetApuIds.has(a.id));
  console.log(`APUs SIN detalles: ${emptyApus.length}`);

  // Parse Excel for APUs that still have no detalles
  const wb = XLSX.readFile(path.join(__dirname, 'public', 'APU_ERP_2.xlsx'));
  const sheet = wb.Sheets['APU'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const apusParsed = [];
  let currentApu = null;
  let currentCategory = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const c0 = String(row[0] || '').trim();
    const c1 = String(row[1] || '').trim();
    const c2 = String(row[2] || '').trim();
    const c3 = String(row[3] || '').trim();
    const c4 = parseFloat(row[4]) || 0;

    if (!c2) continue;
    if (!c0 && !c1 && c2 && !c3 && !c4) { currentCategory = c2; continue; }
    if (!c0 && !c1 && c2 && c3 && c4) {
      currentApu = { name: c2, unit: c3, rendimiento: c4, category: currentCategory,
                     components: [], desperdicio_pct: 0, herramienta_menor_pct: 0 };
      apusParsed.push(currentApu);
      continue;
    }
    if (c0 && c1 && c2 && currentApu) {
      const cl = c2.toLowerCase().trim();
      if (cl === 'desperdicio') { currentApu.desperdicio_pct = Math.round(c4 * 100); continue; }
      if (cl.includes('herramienta menor')) { currentApu.herramienta_menor_pct = Math.round(c4 * 100); continue; }
      if (cl.startsWith('andamios')) continue;

      let type = 'insumo';
      if (cl.startsWith('m de o') || cl.startsWith('cod-m de o')) type = 'cargo';
      else if (c2 === c2.toUpperCase() && c2.length > 2 && /[A-Z]/.test(c2)) type = 'sub_apu';

      currentApu.components.push({ name: c2, unit: c3, cantidad: c4, type });
    }
  }

  // Build detalles for EMPTY APUs
  console.log('\n📋 Insertando detalles para APUs vacíos...');
  const emptyApuNames = new Set(emptyApus.map(a => a.nombre));
  const newDetalles = [];
  let skipped = 0;

  for (const apu of apusParsed) {
    if (!emptyApuNames.has(apu.name)) continue;
    const apuId = apuMap.get(apu.name) || apuMap.get(apu.name.toUpperCase());
    if (!apuId) continue;

    for (const comp of apu.components) {
      const cl = comp.name.toLowerCase().trim();
      const det = {
        id: crypto.randomUUID(),
        apu_id: apuId,
        insumo_id: null, cargo_id: null, apu_hijo_id: null,
        cantidad: comp.cantidad,
        desperdicio_pct: comp.type === 'insumo' ? apu.desperdicio_pct : 0,
        herramienta_menor_pct: comp.type === 'cargo' ? apu.herramienta_menor_pct : 0,
        unidad_detalle: comp.unit || null,
        rendimiento: null,
        user_id: uid
      };

      if (comp.type === 'insumo') {
        const insumo = insumoMap.get(cl);
        if (!insumo) { skipped++; continue; }
        det.insumo_id = insumo.id;
      } else if (comp.type === 'cargo') {
        const cargoName = comp.name.replace(/^(COD-)?M de O\s*-?\s*/i, '').trim().toLowerCase();
        let cargo = cargoMap.get(cargoName);
        if (!cargo) {
          // Fuzzy match
          for (const [k, c] of cargoMap.entries()) {
            if (k.includes(cargoName.split(' ').pop()) && cargoName.split(' ').pop().length > 3) {
              cargo = c; break;
            }
          }
        }
        if (!cargo) { skipped++; continue; }
        det.cargo_id = cargo.id;
      } else if (comp.type === 'sub_apu') {
        const subId = apuMap.get(comp.name.toUpperCase()) || apuMap.get(comp.name);
        if (!subId) { skipped++; continue; }
        det.apu_hijo_id = subId;
      }

      newDetalles.push(det);
    }
  }

  console.log(`  ${newDetalles.length} detalles nuevos, ${skipped} skipped`);

  let inserted = 0;
  for (let i = 0; i < newDetalles.length; i += 50) {
    const chunk = newDetalles.slice(i, i + 50);
    const { error } = await supabase.from('apu_detalle').upsert(chunk);
    if (error) {
      const safe = chunk.map(({ herramienta_menor_pct, ...r }) => r);
      const { error: e2 } = await supabase.from('apu_detalle').upsert(safe);
      if (!e2) inserted += safe.length;
      else console.error(`  ❌ ${e2.message}`);
    } else {
      inserted += chunk.length;
    }
    process.stdout.write(`\r  Progreso: ${inserted}/${newDetalles.length}`);
  }

  // Final count
  let finalCount = 0;
  let finalApuIds = new Set();
  from = 0;
  while (true) {
    const { data: batch } = await supabase.from('apu_detalle').select('apu_id').range(from, from + 999);
    if (!batch || batch.length === 0) break;
    finalCount += batch.length;
    batch.forEach(d => finalApuIds.add(d.apu_id));
    from += batch.length;
    if (batch.length < 1000) break;
  }
  const stillEmpty = (apusDB || []).filter(a => !finalApuIds.has(a.id));

  console.log(`\n\n✅ COMPLETADO`);
  console.log(`   Detalles insertados: ${inserted}`);
  console.log(`   Total detalles: ${finalCount}`);
  console.log(`   APUs con detalles: ${finalApuIds.size}/${apusDB?.length}`);
  console.log(`   APUs aún vacíos: ${stillEmpty.length}`);
  if (stillEmpty.length > 0) {
    stillEmpty.forEach(a => console.log(`     - ${a.nombre}`));
  }
}

main().catch(e => console.error('Fatal:', e));
