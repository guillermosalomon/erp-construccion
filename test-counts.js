const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkCounts() {
  const tables = ['insumos', 'apu', 'apu_detalle', 'proyectos', 'presupuesto_items', 'cargos', 'erp_proveedores', 'mk_tiendas', 'mk_puntos_venta', 'mk_ofertas'];

  console.log('=== 1. ANON CLIENT (Sin sesión) ===');
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(t, ':', count, error ? `[Error: ${error.message}]` : '');
  }

  console.log('\n=== 2. AUTH CLIENT (guillermosalomonsolarte@gmail.com) ===');
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  console.log('Logged in as:', auth?.user?.email, 'id:', auth?.user?.id);
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(t, ':', count, error ? `[Error: ${error.message}]` : '');
  }

  // Check what user_ids exist in proyectos and apu
  const { data: apuSample } = await supabase.from('apu').select('user_id').limit(5);
  console.log('Sample apu user_ids:', apuSample);

  const { data: proySample } = await supabase.from('proyectos').select('user_id, nombre').limit(5);
  console.log('Sample proyectos:', proySample);
}

checkCounts().catch(console.error);
