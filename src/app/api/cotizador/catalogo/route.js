import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CUADRILLAS_DEFAULT, cuadrillaParaCategoria, rendimientoSugerido } from '@/lib/cotizador/config';
import { estimarPrecioReferencia } from '@/lib/cotizador/pricing-ref';

export const revalidate = 3600; // Cache 1 hora

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = createClient(supabaseUrl, supabaseAnonKey);

    // Intentar leer tabla personalizada si ya fue creada, sino consultar APU directo
    let catalogo = [];
    let cuadrillas = CUADRILLAS_DEFAULT;

    // Verificar cuadrillas en BD o usar DEFAULT
    const { data: dbCuadrillas } = await sb.from('cotizador_cuadrillas').select('*');
    if (dbCuadrillas && dbCuadrillas.length > 0) {
      cuadrillas = dbCuadrillas;
    }

    // Traer APUs públicos
    const { data: apus, error: apuErr } = await sb
      .from('apu')
      .select('id, codigo, nombre, unidad, rendimiento, categoria_apu, tipo')
      .order('nombre');

    if (apuErr || !apus) {
      console.warn('Fallo cargando APUs para cotizador:', apuErr);
      return NextResponse.json({ catalogo: [], cuadrillas, count: 0 }, { status: 200 });
    }

    // Excluir los 'BASICOS' puros (morteros, concretos pre-mezclados que van dentro de ítems) para dejar lista curada más limpia
    const apusCurados = apus.filter(a => a.categoria_apu !== 'BASICOS' || a.unidad === 'M3');

    catalogo = apusCurados.map(a => {
      const cat = a.categoria_apu || 'GENERAL';
      const cq = cuadrillaParaCategoria(cat, cuadrillas);
      const precioUnit = estimarPrecioReferencia(cat, a.unidad, a.nombre);
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
