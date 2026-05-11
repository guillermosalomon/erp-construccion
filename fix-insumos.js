const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Unidades correctas para construcción (tal como vienen en el Excel)
const UNIT_FIX = {
  'm': 'ML',     // Metro Lineal
  'saco': 'Bto', // Bulto
  'gl': 'Gal',   // Galón
};

async function main() {
  // 1. Autenticar
  console.log('Autenticando...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
  const userId = authData.user.id;
  console.log('✅ Autenticado:', userId);

  // 2. Leer seed para obtener las categorías originales de cada insumo
  const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'seed-insumos.json'), 'utf8'));
  const seedMap = {};
  seedData.insumos.forEach(i => { seedMap[i.nombre.toLowerCase()] = i.categoria; });

  // 3. Crear categorías que no existan en la BD
  const categoriasExcel = seedData.categorias; // 20 categorías
  console.log(`\n📁 Creando ${categoriasExcel.length} categorías...`);
  
  const { data: existingCats } = await supabase.from('categorias').select('*');
  const existingCatNames = new Set((existingCats || []).map(c => c.nombre.toUpperCase()));
  
  const catMap = {}; // nombre -> id
  (existingCats || []).forEach(c => { catMap[c.nombre.toUpperCase()] = c.id; });

  for (const catName of categoriasExcel) {
    if (!existingCatNames.has(catName.toUpperCase())) {
      const { data, error } = await supabase.from('categorias').insert({ nombre: catName, user_id: userId }).select().single();
      if (error) {
        console.error(`  ❌ Cat "${catName}": ${error.message}`);
      } else {
        catMap[catName.toUpperCase()] = data.id;
        console.log(`  ✅ ${catName} -> ${data.id}`);
      }
    } else {
      console.log(`  ⏩ ${catName} (ya existe)`);
    }
  }

  // 4. Traer todos los insumos de la BD
  console.log('\n📊 Leyendo insumos de la BD...');
  const { data: allInsumos, error: fetchErr } = await supabase.from('insumos').select('id, nombre, unidad, categoria_id, notas');
  if (fetchErr) { console.error('Error:', fetchErr.message); return; }
  console.log(`  ${allInsumos.length} insumos encontrados`);

  // 5. Actualizar cada insumo: asignar categoría + corregir unidad
  let updated = 0;
  let errors = 0;

  for (const insumo of allInsumos) {
    const catName = seedMap[insumo.nombre.toLowerCase()];
    const updates = {};
    let needsUpdate = false;

    // Asignar categoría si la tiene en el Excel
    if (catName && catMap[catName.toUpperCase()]) {
      const targetCatId = catMap[catName.toUpperCase()];
      if (insumo.categoria_id !== targetCatId) {
        updates.categoria_id = targetCatId;
        needsUpdate = true;
      }
    }

    // Corregir unidades
    if (UNIT_FIX[insumo.unidad]) {
      updates.unidad = UNIT_FIX[insumo.unidad];
      needsUpdate = true;
    }

    // Limpiar notas (quitar el "Cat: ..." que ya no se necesita)
    if (insumo.notas && insumo.notas.startsWith('Cat: ')) {
      updates.notas = '';
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error } = await supabase.from('insumos').update(updates).eq('id', insumo.id);
      if (error) {
        console.error(`  ❌ ${insumo.nombre}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    }
    process.stdout.write(`\r  ⏳ Procesados: ${updated} actualizados de ${allInsumos.length}...`);
  }

  console.log(`\n\n✅ RESULTADO:`);
  console.log(`  Categorías creadas: ${categoriasExcel.length - existingCatNames.size}`);
  console.log(`  Insumos actualizados: ${updated}`);
  console.log(`  Errores: ${errors}`);
  console.log(`\nRecarga la página (F5) para ver los cambios.`);
}

main().catch(err => console.error('Error fatal:', err));
