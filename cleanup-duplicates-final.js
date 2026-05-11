const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
  console.log('✅ Autenticado en Supabase');

  console.log('📊 Iniciando limpieza profunda de duplicados en apu_detalle...');
  
  // Traer todos los detalles con paginación
  let detalles = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error: detErr } = await supabase
      .from('apu_detalle')
      .select('id, apu_id, insumo_id, apu_hijo_id, cargo_id, cantidad')
      .range(from, from + pageSize - 1);
      
    if (detErr) {
      console.error('Error al traer detalles:', detErr.message);
      return;
    }
    
    detalles = detalles.concat(data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
    console.log(`Cargados ${detalles.length} registros...`);
  }

  console.log(`Total de registros a analizar: ${detalles.length}`);

  const seen = new Set();
  const duplicates = [];

  for (const d of detalles) {
    // Generar una llave única basada en todos los campos que definen el contenido del ítem
    const key = `${d.apu_id}_${d.insumo_id}_${d.apu_hijo_id}_${d.cargo_id}_${d.cantidad}`;
    
    if (seen.has(key)) {
      duplicates.push(d.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`🔎 Se encontraron ${duplicates.length} filas exactamente duplicadas.`);

  if (duplicates.length > 0) {
    // Borrar en bloques de 50 para evitar errores de URL muy larga
    for (let i = 0; i < duplicates.length; i += 50) {
      const chunk = duplicates.slice(i, i + 50);
      const { error: delErr } = await supabase
        .from('apu_detalle')
        .delete()
        .in('id', chunk);
        
      if (delErr) {
        console.error(`Error borrando bloque ${i}:`, delErr.message);
      } else {
        console.log(`✅ Borrado bloque ${i + 1} a ${Math.min(i + 50, duplicates.length)}`);
      }
    }
    console.log('✨ Limpieza de duplicados terminada con éxito.');
  } else {
    console.log('🎉 No se encontraron duplicados exactos.');
  }
}

main().catch(err => console.error('Error fatal:', err));
