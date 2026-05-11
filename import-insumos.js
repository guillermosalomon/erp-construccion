const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── CONFIGURACIÓN ──
// Pon aquí tu email y password del ERP
const EMAIL = process.argv[2] || '';
const PASSWORD = process.argv[3] || '';

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Autenticar
  if (!EMAIL || !PASSWORD) {
    console.error('USO: node import-insumos.js tu@email.com tuPassword');
    process.exit(1);
  }

  console.log(`Autenticando como ${EMAIL}...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ 
    email: EMAIL, 
    password: PASSWORD 
  });
  
  if (authErr) {
    console.error('ERROR de autenticación:', authErr.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Autenticado. User ID: ${userId}`);

  // 2. Leer el seed
  const seedPath = path.join(__dirname, 'public', 'seed-insumos.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const insumos = seedData.insumos;
  console.log(`📦 Insumos en el archivo: ${insumos.length}`);

  // 3. Verificar existentes
  const { data: existing } = await supabase.from('insumos').select('nombre');
  const existingNames = new Set((existing || []).map(i => i.nombre.toLowerCase()));
  console.log(`📊 Ya existentes en BD: ${existingNames.size}`);

  // 4. Filtrar nuevos
  const newInsumos = insumos
    .filter(i => i.nombre && !existingNames.has(i.nombre.toLowerCase()))
    .map((i, idx) => ({
      nombre: i.nombre,
      tipo: i.tipo || 'MATERIAL',
      unidad: i.unidad || 'un',
      precio_unitario: i.precio_unitario || 0,
      codigo: `INS-${String(idx + 1).padStart(3, '0')}`,
      notas: i.categoria ? `Cat: ${i.categoria}` : '',
      user_id: userId,
    }));

  console.log(`🆕 Nuevos a insertar: ${newInsumos.length}`);

  if (newInsumos.length === 0) {
    console.log('No hay insumos nuevos.');
    return;
  }

  // 5. Insertar en lotes de 25
  let inserted = 0;
  for (let i = 0; i < newInsumos.length; i += 25) {
    const chunk = newInsumos.slice(i, i + 25);
    const { data, error } = await supabase.from('insumos').insert(chunk).select('id');

    if (error) {
      console.error(`\n❌ Error en lote ${i}-${i + chunk.length}: ${error.message}`);
      // Intentar uno por uno
      for (const item of chunk) {
        const { error: e2 } = await supabase.from('insumos').insert(item);
        if (e2) {
          console.error(`  ❌ ${item.nombre}: ${e2.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data?.length || chunk.length;
    }
    process.stdout.write(`\r  ⏳ ${inserted}/${newInsumos.length} insertados...`);
  }

  console.log(`\n\n✅ LISTO: ${inserted} insumos insertados en Supabase.`);
  console.log('Recarga la página (F5) para verlos en el ERP.');
}

main().catch(err => console.error('Error fatal:', err));
