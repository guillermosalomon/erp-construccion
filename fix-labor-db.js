const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizeKey(str) {
  if (!str) return '';
  return str.toString().replace(/\s+/g, '').replace(/\./g, '').toUpperCase().trim();
}

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
  const uid = authData.user.id;
  console.log('✅ Autenticado en Supabase');

  // 1. Cargar Cargos y normalizarlos
  const { data: cargos } = await supabase.from('cargos').select('id, nombre');
  const cargoMap = new Map();
  cargos.forEach(c => {
    cargoMap.set(removeAccents(c.nombre), c.id);
  });
  console.log(`👷 ${cargos.length} cargos cargados y normalizados.`);

  // 2. Cargar APUs de la DB para saber cuáles no tienen M.O.
  const { data: apus } = await supabase.from('apu').select('id, nombre');
  const { data: detalles } = await supabase.from('apu_detalle').select('apu_id, cargo_id');
  const hasLabor = new Set();
  detalles.forEach(d => { if (d.cargo_id) hasLabor.add(d.apu_id); });
  
  const apusSinLabor = apus.filter(a => !hasLabor.has(a.id));
  console.log(`🔍 Encontrados ${apusSinLabor.length} APUs sin Mano de Obra en la DB.`);

  // 3. Leer Excel para buscar la M.O. faltante
  const wb = XLSX.readFile(path.join(__dirname, 'public', 'APU_ERP_2.xlsx'));
  const sheet = wb.Sheets['APU'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const apuIdMap = new Map();
  apusSinLabor.forEach(a => { apuIdMap.set(normalizeKey(a.nombre), a.id); });

  const laborToAdd = [];
  let currentApuId = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const c1 = String(row[1] || '').trim(); // ITEM (Nombre APU)
    const c2 = String(row[2] || '').trim(); // UNITARIO (Cargo o Insumo)
    const c4 = parseFloat(row[4]) || 0;     // CANTIDAD

    if (c1) {
      currentApuId = apuIdMap.get(normalizeKey(c1));
    }

    if (currentApuId && c2.toLowerCase().startsWith('m de o')) {
      const cargoNameClean = c2.replace(/^M de O\s*-?\s*/i, '').trim();
      const cargoId = cargoMap.get(removeAccents(cargoNameClean));
      
      if (cargoId) {
        laborToAdd.push({
          apu_id: currentApuId,
          cargo_id: cargoId,
          cantidad: c4,
          user_id: uid
        });
      }
    }
  }

  console.log(`🚀 Preparados ${laborToAdd.length} registros de Mano de Obra para insertar.`);

  if (laborToAdd.length > 0) {
    let inserted = 0;
    for (let i = 0; i < laborToAdd.length; i += 50) {
      const chunk = laborToAdd.slice(i, i + 50);
      const { error } = await supabase.from('apu_detalle').insert(chunk);
      if (error) {
        console.error('Error insertando M.O:', error.message);
      } else {
        inserted += chunk.length;
      }
      process.stdout.write(`\r  Progreso: ${inserted}/${laborToAdd.length}`);
    }
    console.log(`\n✅ Éxito: Se han restaurado ${inserted} cargos de mano de obra en los APUs.`);
  } else {
    console.log('🤷 No se encontró mano de obra compatible en el Excel para los APUs vacíos.');
  }
}

main().catch(err => console.error('Fatal:', err));
