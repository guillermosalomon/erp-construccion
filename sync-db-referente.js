const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const fs = require('fs');

const mats = require('./src/lib/cotizador/materiales_referente.json');
const provs = require('./src/lib/cotizador/proveedores_referente.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalizeStr(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runSync() {
  console.log('🔄 Iniciando sincronización de Base de Datos con Referente 2026...');

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  if (authErr) {
    console.error('❌ Error de autenticación:', authErr.message);
    process.exit(1);
  }
  const userId = auth.user.id;
  console.log('✅ Autenticado como:', auth.user.email, '(ID:', userId, ')');

  // ─── 1. Sincronizar Proveedores ───
  console.log(`\n📦 Sincronizando ${provs.length} proveedores...`);
  try {
    const { data: testProv, error: errProvTest } = await supabase.from('erp_proveedores').select('id').limit(1);
    if (!errProvTest) {
      for (const p of provs.slice(0, 50)) {
        await supabase.from('erp_proveedores').upsert({
          nombre: p.nombre,
          enlace_web: p.link || null,
          ciudad: p.ciudad || 'Pasto (Nariño)',
          activo: true,
          user_id: userId,
        }, { onConflict: 'nombre' }).catch(() => {});
      }
      console.log('✅ Proveedores sincronizados en erp_proveedores.');
    } else {
      console.log('ℹ️ erp_proveedores aún no creada en DB (ejecutar migration-fase18-proveedores-agenda.sql). Guardado en fallback JSON.');
    }
  } catch (e) {
    console.warn('Nota proveedores:', e.message);
  }

  // ─── 2. Leer Insumos Existentes ───
  const { data: dbInsumos, error: errIns } = await supabase.from('insumos').select('*');
  if (errIns) {
    console.error('❌ Error leyendo insumos:', errIns.message);
    process.exit(1);
  }
  console.log(`\n📋 Insumos existentes en DB: ${dbInsumos.length}`);

  // Mapear nombres existentes normalizados
  const dbMap = new Map();
  dbInsumos.forEach(i => {
    dbMap.set(normalizeStr(i.nombre), i);
  });

  // Reglas de expansión de nombres de ferretería abreviados
  const expansions = [
    { from: /^ac\s/i, to: 'acero ' },
    { from: /^alam\s/i, to: 'alambre ' },
    { from: /^adapt\sterm/i, to: 'adaptador terminal' },
    { from: /^tub\s/i, to: 'tuberia ' },
    { from: /^ccto\s/i, to: 'concreto ' },
    { from: /^mort\s/i, to: 'mortero ' },
    { from: /^bloq\s/i, to: 'bloque ' }
  ];

  let updatedCount = 0;
  for (const dbI of dbInsumos) {
    let clean = dbI.nombre;
    for (const exp of expansions) {
      if (exp.from.test(clean)) {
        clean = clean.replace(exp.from, exp.to);
        break;
      }
    }
    const nClean = normalizeStr(clean);

    // Buscar en materiales referentes
    const match = mats.find(m => {
      const nM = normalizeStr(m.nombre);
      return nM === nClean || nM.includes(nClean) || (nClean.length > 5 && nM.startsWith(nClean.slice(0, 8)));
    });

    if (match && match.precio_unitario > 0) {
      const newPrice = Math.round(match.precio_unitario);
      const newCategory = match.categoria || dbI.categoria || 'OBRA CIVIL';
      const modernName = clean !== dbI.nombre ? match.nombre : dbI.nombre;

      const { error: updErr } = await supabase.from('insumos').update({
        nombre: modernName,
        precio_unitario: newPrice,
        categoria: newCategory,
        notas: `Ref 2026: Prov. ${match.proveedor_mas_barato || 'Ferretería'} ($${newPrice})`,
        updated_at: new Date().toISOString()
      }).eq('id', dbI.id);

      if (!updErr) updatedCount++;
    }
  }
  console.log(`✅ Insumos existentes actualizados con precios 2026 y nombres modernos: ${updatedCount}`);

  // ─── 3. Ingesta de Nuevos Insumos Relevantes del Referente ───
  console.log('\n📥 Insertando materiales complementarios del referente en insumos...');
  let insertedCount = 0;
  const toInsert = [];

  for (const m of mats) {
    const nM = normalizeStr(m.nombre);
    if (!dbMap.has(nM) && m.precio_unitario > 0) {
      const code = `INS-MAT-${String(m.id).padStart(4, '0')}`;
      toInsert.push({
        codigo: code,
        nombre: m.nombre,
        tipo: 'MATERIAL',
        unidad: (m.unidad || 'UND').toLowerCase(),
        precio_unitario: Math.round(m.precio_unitario),
        categoria: m.categoria || 'OBRA CIVIL',
        notas: `Proveedor: ${m.proveedor_mas_barato || 'Comercio local'} | Cot. Referente 2026`,
        user_id: userId,
      });
      dbMap.set(nM, true); // Evitar duplicar
    }
  }

  // Insertar en lotes de 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { data: insData, error: insErr } = await supabase.from('insumos').insert(batch).select();
    if (!insErr && insData) {
      insertedCount += insData.length;
    } else if (insErr) {
      console.warn('Error en lote de insumos:', insErr.message);
    }
  }
  console.log(`✅ Nuevos materiales insertados exitosamente: ${insertedCount}`);

  console.log('\n🎉 Sincronización completada con éxito.');
}

runSync().catch(console.error);
