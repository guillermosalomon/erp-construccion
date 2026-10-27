const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedOrdenesYAgenda() {
  const { generarOrdenesCompraProgramadas } = await import('./src/lib/compras-engine.js');
  console.log('🔄 Generando Órdenes de Compra y Agenda para Casa Ricaurte y Hospital Civil...');

  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  if (aErr) return console.error('Auth error:', aErr);
  const userId = auth.user.id;

  // 1. Obtener proyectos y sus ítems
  const { data: proys } = await supabase.from('proyectos').select('*');
  const { data: items } = await supabase.from('presupuesto_items').select('*');
  const { data: apus } = await supabase.from('apu').select('*');
  const { data: apuDets } = await supabase.from('apu_detalle').select('*');
  const { data: insumos } = await supabase.from('insumos').select('*');
  const { data: provs } = await supabase.from('erp_proveedores').select('*');

  const apuMap = {};
  const insMap = new Map((insumos || []).map(i => [i.id, i]));

  (apus || []).forEach(a => {
    const dets = (apuDets || []).filter(d => d.apu_id === a.id);
    const comps = dets.map(d => {
      const ins = insMap.get(d.insumo_id);
      return {
        tipo: ins?.tipo || 'MATERIAL',
        nombre: ins?.nombre || a.nombre,
        unidad: d.unidad_detalle || ins?.unidad || 'UN',
        cantidad: Number(d.cantidad) || 1,
        precio_unitario: Number(ins?.precio_unitario) || 10000,
      };
    });
    apuMap[a.id] = { ...a, componentes: comps };
  });

  // Limpiar órdenes y agenda previas
  await supabase.from('erp_ordenes_compra').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pos_agenda').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  let totalOCs = 0;
  let totalAgenda = 0;

  for (const p of proys) {
    const pItems = (items || []).filter(i => i.proyecto_id === p.id);
    if (pItems.length === 0) continue;

    console.log(`\n📦 Generando compras para: ${p.nombre} (${pItems.length} actividades)...`);

    const ordenes = generarOrdenesCompraProgramadas({
      presupuestoItems: pItems,
      catalogoMap: apuMap,
      proyectoId: p.id,
      fechaBase: '2026-11-01',
    });

    console.log(`- Órdenes sugeridas por fecha: ${ordenes.length}`);

    for (const oc of ordenes.slice(0, 15)) {
      // Buscar ID de proveedor si existe
      const provObj = (provs || []).find(pr => pr.nombre.toLowerCase().trim() === oc.proveedor_nombre.toLowerCase().trim());

      const ocPayload = {
        numero_orden: oc.numero_orden,
        proyecto_id: p.id,
        proveedor_id: provObj ? provObj.id : null,
        proveedor_nombre: oc.proveedor_nombre,
        fecha_programada: oc.fecha_programada,
        fecha_entrega_esperada: oc.fecha_programada,
        estado: 'pendiente',
        items: oc.items.slice(0, 8),
        total: oc.total,
        notas: `Compra programada al proveedor más económico para ${p.nombre}`,
        user_id: userId,
      };

      const { data: dOc, error: eOc } = await supabase.from('erp_ordenes_compra').insert(ocPayload).select().single();
      if (!eOc && dOc) {
        totalOCs++;

        // Insertar en pos_agenda
        const agendaPayload = {
          titulo: `📥 Recepción: ${oc.proveedor_nombre} (${oc.numero_orden})`,
          descripcion: `Entrega de insumos para obra: ${p.nombre}. Total: $${oc.total.toLocaleString('es-CO')}`,
          tipo: 'recepcion_proveedor',
          fecha_programada: `${oc.fecha_programada}T08:00:00Z`,
          prioridad: 'alta',
          estado: 'pendiente',
          contacto_nombre: oc.proveedor_nombre,
          direccion: p.ubicacion || 'Pasto (Nariño)',
          relacion_id: dOc.id,
          user_id: userId,
        };

        const { error: eAg } = await supabase.from('pos_agenda').insert(agendaPayload);
        if (!eAg) totalAgenda++;
      }
    }
  }

  console.log(`\n🎉 Generación finalizada exitosamente:`);
  console.log(`- erp_ordenes_compra: ${totalOCs} órdenes creadas`);
  console.log(`- pos_agenda: ${totalAgenda} tareas y despachos agendados`);
}

seedOrdenesYAgenda().catch(console.error);
