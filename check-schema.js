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

  // Read Excel
  const wb = XLSX.readFile(path.join(__dirname, 'public', 'APU_ERP_2.xlsx'));
  const sheet = wb.Sheets['APU'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Load existing data
  const { data: insumos } = await supabase.from('insumos').select('id, nombre, unidad');
  const { data: cargos } = await supabase.from('cargos').select('id, nombre');
  const { data: apusDB } = await supabase.from('apu').select('id, nombre');
  const { data: detallesDB } = await supabase.from('apu_detalle').select('id, apu_id');
  
  const insumoMap = new Map();
  (insumos || []).forEach(i => insumoMap.set(i.nombre.toLowerCase().trim(), i));
  const cargoMap = new Map();
  (cargos || []).forEach(c => cargoMap.set(c.nombre.toLowerCase().trim(), c));
  const apuMap = new Map();
  (apusDB || []).forEach(a => { apuMap.set(a.nombre.toUpperCase(), a.id); apuMap.set(a.nombre, a.id); });

  // Parse APUs
  const apus = [];
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
      apus.push(currentApu);
      continue;
    }

    if (c0 && c1 && c2 && currentApu) {
      const cl = c2.toLowerCase().trim();
      if (cl === 'desperdicio') { currentApu.desperdicio_pct = c4 * 100; continue; }
      if (cl.includes('herramienta menor')) { currentApu.herramienta_menor_pct = c4 * 100; continue; }
      if (cl.startsWith('andamios')) continue;

      let type = 'insumo';
      if (cl.startsWith('m de o')) type = 'cargo';
      else if (c2 === c2.toUpperCase() && c2.length > 2 && /[A-Z]/.test(c2)) type = 'sub_apu';

      currentApu.components.push({ name: c2, unit: c3, cantidad: c4, type });
    }
  }

  // Analyze what's missing
  const missingInsumos = new Map(); // name -> {unit, count, apus[]}
  const missingCargos = new Map();
  const missingSubApus = new Map();
  let totalComponents = 0;
  let matchedComponents = 0;
  let apusWithNoDetalles = 0;

  for (const apu of apus) {
    const apuId = apuMap.get(apu.name) || apuMap.get(apu.name.toUpperCase());
    let matched = 0;
    
    for (const comp of apu.components) {
      totalComponents++;
      const cl = comp.name.toLowerCase().trim();
      
      if (comp.type === 'insumo') {
        if (insumoMap.has(cl)) { matched++; matchedComponents++; }
        else {
          if (!missingInsumos.has(cl)) missingInsumos.set(cl, { name: comp.name, unit: comp.unit, count: 0, apus: [] });
          const m = missingInsumos.get(cl);
          m.count++;
          if (m.apus.length < 3) m.apus.push(apu.name);
        }
      } else if (comp.type === 'cargo') {
        const cargoName = comp.name.replace(/^M de O\s*-?\s*/i, '').trim().toLowerCase();
        if (cargoMap.has(cargoName)) { matched++; matchedComponents++; }
        else {
          if (!missingCargos.has(cargoName)) missingCargos.set(cargoName, { name: comp.name, count: 0 });
          missingCargos.get(cargoName).count++;
        }
      } else if (comp.type === 'sub_apu') {
        const subId = apuMap.get(comp.name.toUpperCase()) || apuMap.get(comp.name);
        if (subId) { matched++; matchedComponents++; }
        else {
          if (!missingSubApus.has(comp.name)) missingSubApus.set(comp.name, { count: 0 });
          missingSubApus.get(comp.name).count++;
        }
      }
    }
    
    if (matched === 0 && apu.components.length > 0) apusWithNoDetalles++;
  }

  // Check detalles in DB per APU
  const detCountByApu = {};
  (detallesDB || []).forEach(d => { detCountByApu[d.apu_id] = (detCountByApu[d.apu_id] || 0) + 1; });
  const apusWithZeroDetalles = (apusDB || []).filter(a => !detCountByApu[a.id]);

  console.log('=== DIAGNÓSTICO DE IMPORTACIÓN ===\n');
  console.log(`Total APUs en Excel: ${apus.length}`);
  console.log(`Total APUs en Supabase: ${apusDB?.length || 0}`);
  console.log(`Total detalles en Supabase: ${detallesDB?.length || 0}`);
  console.log(`APUs SIN detalles en Supabase: ${apusWithZeroDetalles.length}`);
  console.log(`\nComponentes total en Excel: ${totalComponents}`);
  console.log(`Componentes matcheados: ${matchedComponents} (${(matchedComponents/totalComponents*100).toFixed(1)}%)`);
  
  console.log(`\n--- INSUMOS FALTANTES (${missingInsumos.size}) ---`);
  [...missingInsumos.values()]
    .sort((a,b) => b.count - a.count)
    .forEach(m => console.log(`  [${m.count}x] "${m.name}" (${m.unit}) — usado en: ${m.apus.join(', ')}`));

  console.log(`\n--- CARGOS FALTANTES (${missingCargos.size}) ---`);
  [...missingCargos.values()].forEach(m => console.log(`  [${m.count}x] "${m.name}"`));

  console.log(`\n--- SUB-APUs FALTANTES (${missingSubApus.size}) ---`);
  [...missingSubApus.entries()].forEach(([name, m]) => console.log(`  [${m.count}x] "${name}"`));

  console.log(`\n--- APUS SIN DETALLES (primeros 20) ---`);
  apusWithZeroDetalles.slice(0, 20).forEach(a => console.log(`  - ${a.nombre}`));
}

main().catch(e => console.error('Fatal:', e));
