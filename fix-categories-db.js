const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeStr(str) {
  if (!str) return '';
  return str.toString().replace(/\s+/g, '').toUpperCase().trim();
}

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
  console.log('✅ Autenticado en Supabase');

  // 1. Eliminar duplicados en apu_detalle
  console.log('\n🧹 Buscando detalles duplicados en APUs...');
  const { data: detalles, error: detErr } = await supabase.from('apu_detalle').select('id, apu_id, insumo_id, cargo_id');
  if (detErr) { console.error('Error leyendo apu_detalle', detErr); }
  else {
    const uniqueKeys = new Set();
    const idsToDelete = [];
    
    for (const d of detalles) {
      const key = `${d.apu_id}_${d.insumo_id || 'null'}_${d.cargo_id || 'null'}`;
      if (uniqueKeys.has(key)) {
        idsToDelete.push(d.id);
      } else {
        uniqueKeys.add(key);
      }
    }
    
    if (idsToDelete.length > 0) {
      console.log(`⚠️ Encontrados ${idsToDelete.length} detalles duplicados. Eliminando...`);
      // Delete in chunks
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const chunk = idsToDelete.slice(i, i + 100);
        const { error } = await supabase.from('apu_detalle').delete().in('id', chunk);
        if (error) console.error('Error borrando duplicados', error);
      }
      console.log('✅ Duplicados eliminados correctamente.');
    } else {
      console.log('✅ No hay detalles duplicados.');
    }
  }

  // 2. Arreglar Categorías de APUs leyendo el Excel
  console.log('\n📊 Leyendo Excel para arreglar categorías de APUs...');
  const workbook = XLSX.readFile('public/APU_ERP_2.xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

  const apuCategories = {};
  for (let i = 0; i < data.length; i++) {
    const row = data[i] || [];
    const cat = row[0];
    const apuName = row[1];
    if (cat && typeof cat === 'string' && cat === cat.toUpperCase() && apuName && typeof apuName === 'string') {
      apuCategories[normalizeStr(apuName)] = cat.trim();
    }
  }

  const { data: apus, error: apuErr } = await supabase.from('apu').select('id, nombre, categoria_apu');
  if (apuErr) { console.error('Error leyendo APUs', apuErr); return; }

  let countUpdated = 0;
  for (const apu of apus) {
    const norm = normalizeStr(apu.nombre);
    const correctCat = apuCategories[norm];
    
    if (correctCat && apu.categoria_apu !== correctCat) {
      const { error } = await supabase.from('apu').update({ categoria_apu: correctCat }).eq('id', apu.id);
      if (error) {
        console.error(`Error actualizando ${apu.nombre}:`, error.message);
      } else {
        countUpdated++;
      }
    }
  }
  
  console.log(`✅ Categorías de APU arregladas. ${countUpdated} APUs actualizados directamente en la base de datos.`);
}

main().catch(err => console.error('Fatal:', err));
