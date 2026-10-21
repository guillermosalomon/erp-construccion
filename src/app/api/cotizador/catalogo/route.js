import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CUADRILLAS_DEFAULT, cuadrillaParaCategoria, rendimientoSugerido } from '@/lib/cotizador/config';
import { estimarPrecioReferencia } from '@/lib/cotizador/pricing-ref';

export const revalidate = 600; // Cache 10 min

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = createClient(supabaseUrl, supabaseAnonKey);

    // Autenticar internamente con usuario del sistema para leer composición y cargos con RLS
    await sb.auth.signInWithPassword({
      email: 'guillermosalomonsolarte@gmail.com',
      password: 'l043211?',
    }).catch(e => console.warn('Auth catálogo warning:', e.message));

    let cuadrillas = CUADRILLAS_DEFAULT;
    const { data: dbCuadrillas } = await sb.from('cotizador_cuadrillas').select('*');
    if (dbCuadrillas && dbCuadrillas.length > 0) {
      cuadrillas = dbCuadrillas;
    }

    // Traer APUs
    const { data: apus, error: apuErr } = await sb
      .from('apu')
      .select('id, codigo, nombre, unidad, rendimiento, categoria_apu, tipo')
      .order('nombre');

    if (apuErr || !apus) {
      console.warn('Fallo cargando APUs para cotizador:', apuErr);
      return NextResponse.json({ catalogo: [], cuadrillas, count: 0 }, { status: 200 });
    }

    // Traer detalles, insumos, ofertas y cargos para calcular el costo REAL idéntico al ERP
    const PAGE = 1000;
    let allDets = [];
    let from = 0;
    while (true) {
      const { data } = await sb.from('apu_detalle').select('*').range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allDets = allDets.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const [
      { data: allInsumos },
      { data: allCargos },
      { data: allOfertas },
    ] = await Promise.all([
      sb.from('insumos').select('*'),
      sb.from('cargos').select('*'),
      sb.from('mk_ofertas').select('*'),
    ]);

    const ofMap = new Map();
    (allOfertas || []).forEach(o => {
      if (o.activo && o.publicado_marketplace) {
        ofMap.set(o.insumo_id, Number(o.precio_venta));
      }
    });

    const insMap = new Map((allInsumos || []).map(i => [i.id, i]));
    const cargoMap = new Map((allCargos || []).map(c => [c.id, c]));

    // Función de cálculo idéntica al ERP StoreContext
    function calcApuCost(apuId, visited = new Set()) {
      if (visited.has(apuId)) return 0;
      visited.add(apuId);
      const dets = allDets.filter(dt => dt.apu_id === apuId);
      let total = 0;

      for (const dt of dets) {
        const cant = Number(dt.cantidad) || 0;
        const desp = Number(dt.desperdicio_pct) || 0;
        const factor = cant * (1 + desp / 100);

        if (dt.insumo_id) {
          const i = insMap.get(dt.insumo_id);
          let precio = Number(i?.precio_unitario) || ofMap.get(dt.insumo_id) || 0;
          const uIns = (i?.unidad || '').toLowerCase().trim();
          const uDet = (dt.unidad_detalle || '').toLowerCase().trim();

          if (uIns === 'bto' && uDet === 'kg') precio = precio / 50;
          else if (uIns === 'gal' && uDet === 'lt') precio = precio / 3.785;

          total += factor * precio;
        } else if (dt.cargo_id) {
          const c = cargoMap.get(dt.cargo_id);
          const precioMes = Number(c?.precio_unitario) || 2000000;
          const p_hr = precioMes / 192;
          const unDet = (dt.unidad_detalle || 'Hr').toLowerCase();
          let precio = p_hr;
          if (unDet === 'dia' || unDet === 'día') precio = p_hr * 8;
          total += factor * precio;
        } else if (dt.apu_hijo_id) {
          total += factor * calcApuCost(dt.apu_hijo_id, new Set(visited));
        }
      }
      return total;
    }

    // Filtrar 'BASICOS' puros
    const apusCurados = apus.filter(a => a.categoria_apu !== 'BASICOS' || a.unidad === 'M3');

    const catalogo = apusCurados.map(a => {
      const cat = a.categoria_apu || 'GENERAL';
      const cq = cuadrillaParaCategoria(cat, cuadrillas);
      const costoERP = Math.round(calcApuCost(a.id));
      // Si el APU tiene desglose en el ERP usa el costo real exacto; si no, recurre al valor de referencia
      const precioUnit = costoERP > 0 ? costoERP : estimarPrecioReferencia(cat, a.unidad, a.nombre);
      const rend = rendimientoSugerido(a.unidad, cq.codigo, a.rendimiento);

      return {
        id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        unidad: a.unidad || 'Un',
        categoria: cat,
        capitulo: cat,
        cuadrilla_codigo: cq.codigo,
        cuadrilla_nombre: cq.nombre,
        cuadrilla_color: cq.color,
        precio_unitario: precioUnit,
        rendimiento: rend,
      };
    });

    return NextResponse.json({
      success: true,
      count: catalogo.length,
      catalogo,
      cuadrillas,
      actualizado: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error en /api/cotizador/catalogo:', err);
    return NextResponse.json({ error: 'Error obteniendo catálogo' }, { status: 500 });
  }
}
