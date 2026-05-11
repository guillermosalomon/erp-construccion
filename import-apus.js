/**
 * import-apus.js — Import APUs from APU_ERP_2.xlsx into Supabase
 * 
 * Structure:
 * - APU Header: empty col0, empty col1, col2=name, col3=unit, col4=rendimiento
 * - Component: col0=category, col1=parent APU name, col2=component name, col3=unit, col4=quantity
 * - Sub-APU ref: col2 is ALL CAPS and matches another APU name
 * - Desperdicio: col2="Desperdicio", col4=percentage (as decimal, e.g. 0.05 = 5%)
 * - Herramienta menor: col2 contains "Herramienta menor", col4=percentage (as decimal)
 * - M de O: col2 starts with "M de O", treated as cargo/labor reference
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Auth
  const { error: authErr } = await supabase.auth.signInWithPassword({ 
    email: 'guillermosalomonsolarte@gmail.com', password: 'l043211?' 
  });
  if (authErr) { console.error('Auth:', authErr.message); process.exit(1); }
  const uid = (await supabase.auth.getUser()).data.user.id;
  console.log('✅ Autenticado');

  // Read Excel
  const wb = XLSX.readFile(path.join(__dirname, 'public', 'APU_ERP_2.xlsx'));
  const sheet = wb.Sheets['APU'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`📊 ${rows.length} filas leídas`);

  // Load existing insumos for matching
  const { data: existingInsumos } = await supabase.from('insumos').select('id, nombre, unidad');
  const insumoMap = new Map();
  (existingInsumos || []).forEach(i => {
    insumoMap.set(i.nombre.toLowerCase().trim(), i);
  });
  console.log(`📦 ${insumoMap.size} insumos existentes cargados`);

  // Load existing cargos for matching M de O
  const { data: existingCargos } = await supabase.from('cargos').select('id, nombre');
  const cargoMap = new Map();
  (existingCargos || []).forEach(c => {
    cargoMap.set(c.nombre.toLowerCase().trim(), c);
  });
  console.log(`👷 ${cargoMap.size} cargos existentes cargados`);

  // ─── PHASE 1: Parse all APUs from Excel ───
  console.log('\n🔍 Fase 1: Parseando APUs del Excel...');
  
  const apus = []; // { name, unit, rendimiento, category, components: [] }
  let currentApu = null;
  let currentCategory = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const c0 = String(row[0] || '').trim(); // CATEGORIA
    const c1 = String(row[1] || '').trim(); // ITEM (parent APU name)
    const c2 = String(row[2] || '').trim(); // UNITARIO / component name
    const c3 = String(row[3] || '').trim(); // UN
    const c4 = parseFloat(row[4]) || 0;     // RENDIMIENTO / cantidad

    if (!c2) continue; // Skip empty rows

    // Category header (col2 only, no unit/rendimiento — or check if it's a section title)
    if (!c0 && !c1 && c2 && !c3 && !c4) {
      currentCategory = c2;
      continue;
    }

    // APU Header: no col0, no col1, has col2 (name), col3 (unit), col4 (rendimiento)
    if (!c0 && !c1 && c2 && c3 && c4) {
      currentApu = {
        name: c2,
        unit: c3,
        rendimiento: c4,
        category: currentCategory,
        components: [],
        desperdicio_pct: 0,
        herramienta_menor_pct: 0
      };
      apus.push(currentApu);
      continue;
    }

    // Component line: has col0 (category), col1 (parent APU), col2 (component), col3 (unit), col4 (qty)
    if (c0 && c1 && c2 && currentApu) {
      const compNameLower = c2.toLowerCase().trim();
      
      // Check if it's "Desperdicio"
      if (compNameLower === 'desperdicio') {
        currentApu.desperdicio_pct = c4 * 100; // Convert 0.05 → 5%
        continue;
      }
      
      // Check if it's "Herramienta menor"
      if (compNameLower.includes('herramienta menor')) {
        currentApu.herramienta_menor_pct = c4 * 100; // Convert 0.10 → 10%
        continue;
      }

      // Check if it's "Andamios" (equipment, treat as insumo)
      if (compNameLower.startsWith('andamios')) {
        // Skip andamios as they're calculated from rendimiento
        continue;
      }

      // Determine component type
      let type = 'insumo';
      
      // M de O = cargo (labor)
      if (compNameLower.startsWith('m de o')) {
        type = 'cargo';
      }
      // ALL CAPS = sub-APU reference
      else if (c2 === c2.toUpperCase() && c2.length > 2 && /[A-Z]/.test(c2)) {
        type = 'sub_apu';
      }

      currentApu.components.push({
        name: c2,
        unit: c3,
        cantidad: c4,
        type
      });
    }
  }

  console.log(`  ✅ ${apus.length} APUs parseados`);
  
  // Show summary by category
  const catCount = {};
  apus.forEach(a => { catCount[a.category] = (catCount[a.category] || 0) + 1; });
  Object.entries(catCount).forEach(([cat, count]) => {
    console.log(`    📁 ${cat}: ${count} APUs`);
  });

  // ─── PHASE 2: Create APU name → ID mapping ───
  console.log('\n🔧 Fase 2: Creando APUs en Supabase...');
  
  const apuNameToId = new Map();
  const apuRecords = [];
  
  for (const apu of apus) {
    const id = crypto.randomUUID();
    const codigo = `APU-${id.slice(0, 6).toUpperCase()}`;
    
    apuNameToId.set(apu.name.toUpperCase(), id);
    apuNameToId.set(apu.name, id);
    
    apuRecords.push({
      id,
      nombre: apu.name,
      tipo: 'COMPUESTO',
      unidad: apu.unit,
      rendimiento: apu.rendimiento,
      codigo,
      categoria_apu: apu.category,
      user_id: uid
    });
  }

  // Batch insert APUs (in chunks of 50)
  let insertedApus = 0;
  for (let i = 0; i < apuRecords.length; i += 50) {
    const chunk = apuRecords.slice(i, i + 50);
    const { error } = await supabase.from('apu').upsert(chunk);
    if (error) {
      console.error(`  ❌ Error insertando APUs chunk ${i}:`, error.message);
      // Try without categoria_apu
      const safeChunk = chunk.map(({ categoria_apu, ...rest }) => rest);
      const { error: e2 } = await supabase.from('apu').upsert(safeChunk);
      if (e2) console.error(`  ❌ Fallback también falló:`, e2.message);
      else insertedApus += safeChunk.length;
    } else {
      insertedApus += chunk.length;
    }
    process.stdout.write(`\r  Insertando APUs: ${insertedApus}/${apuRecords.length}`);
  }
  console.log(`\n  ✅ ${insertedApus} APUs insertados`);

  // ─── PHASE 3: Create APU detalles ───
  console.log('\n📋 Fase 3: Creando detalles (componentes)...');
  
  const detalleRecords = [];
  let unmatchedInsumos = new Set();
  let unmatchedCargos = new Set();
  let unmatchedSubApus = new Set();

  for (const apu of apus) {
    const apuId = apuNameToId.get(apu.name) || apuNameToId.get(apu.name.toUpperCase());
    if (!apuId) continue;

    for (const comp of apu.components) {
      const detalle = {
        id: crypto.randomUUID(),
        apu_id: apuId,
        insumo_id: null,
        cargo_id: null,
        apu_hijo_id: null,
        cantidad: comp.cantidad,
        desperdicio_pct: apu.desperdicio_pct,
        herramienta_menor_pct: apu.herramienta_menor_pct,
        unidad_detalle: comp.unit || null,
        rendimiento: null,
        user_id: uid
      };

      if (comp.type === 'insumo') {
        // Match insumo by name
        const insumo = insumoMap.get(comp.name.toLowerCase().trim());
        if (insumo) {
          detalle.insumo_id = insumo.id;
        } else {
          unmatchedInsumos.add(comp.name);
          continue; // Skip unmatched insumos
        }
      } else if (comp.type === 'cargo') {
        // Match cargo by name
        const cargoName = comp.name.replace(/^M de O\s*-?\s*/i, '').trim();
        const cargo = cargoMap.get(cargoName.toLowerCase().trim());
        if (cargo) {
          detalle.cargo_id = cargo.id;
        } else {
          unmatchedCargos.add(comp.name);
          continue;
        }
      } else if (comp.type === 'sub_apu') {
        // Match sub-APU by name
        const subApuId = apuNameToId.get(comp.name.toUpperCase()) || apuNameToId.get(comp.name);
        if (subApuId) {
          detalle.apu_hijo_id = subApuId;
        } else {
          unmatchedSubApus.add(comp.name);
          continue;
        }
      }

      // Only add desperdicio to insumo lines, herramienta_menor to cargo lines
      if (comp.type !== 'insumo') detalle.desperdicio_pct = 0;
      if (comp.type !== 'cargo') detalle.herramienta_menor_pct = 0;

      detalleRecords.push(detalle);
    }
  }

  console.log(`  📊 ${detalleRecords.length} detalles a insertar`);
  
  if (unmatchedInsumos.size > 0) {
    console.log(`\n  ⚠️ ${unmatchedInsumos.size} insumos no encontrados:`);
    [...unmatchedInsumos].slice(0, 20).forEach(n => console.log(`    - ${n}`));
    if (unmatchedInsumos.size > 20) console.log(`    ... y ${unmatchedInsumos.size - 20} más`);
  }
  if (unmatchedCargos.size > 0) {
    console.log(`\n  ⚠️ ${unmatchedCargos.size} cargos no encontrados:`);
    [...unmatchedCargos].forEach(n => console.log(`    - ${n}`));
  }
  if (unmatchedSubApus.size > 0) {
    console.log(`\n  ⚠️ ${unmatchedSubApus.size} sub-APUs no encontrados:`);
    [...unmatchedSubApus].slice(0, 20).forEach(n => console.log(`    - ${n}`));
  }

  // Batch insert detalles (in chunks of 50)
  let insertedDetalles = 0;
  for (let i = 0; i < detalleRecords.length; i += 50) {
    const chunk = detalleRecords.slice(i, i + 50);
    const { error } = await supabase.from('apu_detalle').upsert(chunk);
    if (error) {
      // Try without herramienta_menor_pct
      const safeChunk = chunk.map(({ herramienta_menor_pct, ...rest }) => rest);
      const { error: e2 } = await supabase.from('apu_detalle').upsert(safeChunk);
      if (e2) {
        console.error(`\n  ❌ Error en chunk ${i}:`, e2.message);
      } else {
        insertedDetalles += safeChunk.length;
      }
    } else {
      insertedDetalles += chunk.length;
    }
    process.stdout.write(`\r  Insertando detalles: ${insertedDetalles}/${detalleRecords.length}`);
  }

  console.log(`\n\n✅ IMPORTACIÓN COMPLETA`);
  console.log(`   APUs: ${insertedApus}`);
  console.log(`   Detalles: ${insertedDetalles}`);
  console.log(`   Insumos no match: ${unmatchedInsumos.size}`);
  console.log(`   Cargos no match: ${unmatchedCargos.size}`);
  console.log(`   Sub-APUs no match: ${unmatchedSubApus.size}`);
}

main().catch(err => console.error('Fatal:', err));
