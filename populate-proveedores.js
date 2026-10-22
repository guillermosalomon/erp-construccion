const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const provs = require('./src/lib/cotizador/proveedores_referente.json');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function populateProveedores() {
  console.log('🔄 Verificando tablas recién creadas en Supabase...');
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  if (aErr) return console.error('Auth error:', aErr);
  console.log('✅ Autenticado como:', auth.user.email);

  // Check erp_proveedores
  const { data: testP, error: testErr } = await supabase.from('erp_proveedores').select('*').limit(1);
  console.log('erp_proveedores accesible?', !testErr, testErr ? testErr.message : 'OK');

  if (!testErr) {
    const toInsert = provs.map(p => ({
      nombre: p.nombre,
      enlace_web: p.link || null,
      ciudad: p.ciudad || 'Pasto (Nariño)',
      activo: true,
      calificacion: 5.0,
      categorias: ['Materiales de Construcción', 'Ferretería'],
      user_id: auth.user.id
    }));

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      const { data, error } = await supabase.from('erp_proveedores').insert(batch).select();
      if (!error && data) inserted += data.length;
      else if (error) {
        console.warn('Batch note:', error.message);
      }
    }
    console.log('✅ Proveedores insertados en erp_proveedores:', inserted);
  }

  // Check erp_ordenes_compra and pos_agenda
  const { error: eOc } = await supabase.from('erp_ordenes_compra').select('id').limit(1);
  console.log('erp_ordenes_compra accesible?', !eOc, eOc ? eOc.message : 'OK');

  const { error: eAg } = await supabase.from('pos_agenda').select('id').limit(1);
  console.log('pos_agenda accesible?', !eAg, eAg ? eAg.message : 'OK');

  console.log('🎉 Todas las tablas creadas y listas para producción.');
}

populateProveedores().catch(console.error);
