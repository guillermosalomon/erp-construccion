import { NextResponse } from 'next/server';
import { CUADRILLAS_DEFAULT, cuadrillaParaCategoria, rendimientoSugerido } from '@/lib/cotizador/config';
import { costoAPU } from '@/lib/apu-engine';
import { ordenCapitulo } from '@/lib/catalogo-taxonomia';
import { crearClienteLectura, cargarDatosCatalogo, aComponentes } from '@/lib/server/catalogo-data';

export const revalidate = 600; // Cache 10 min

const normTxt = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export async function GET() {
  try {
    // Sin credenciales embebidas: service role (si existe) o anon key con RLS de lectura pública
    const sb = crearClienteLectura();
    if (!sb) {
      return NextResponse.json({ catalogo: [], cuadrillas: CUADRILLAS_DEFAULT, count: 0 }, { status: 200 });
    }

    let cuadrillas = CUADRILLAS_DEFAULT;
    const { data: dbCuadrillas } = await sb.from('cotizador_cuadrillas').select('*');
    if (dbCuadrillas && dbCuadrillas.length > 0) {
      cuadrillas = dbCuadrillas;
    }

    // APUs + composición + insumos + cuadrillas + configuración → motor único de costos (idéntico al ERP)
    const datos = await cargarDatosCatalogo(sb);
    if (!datos || !datos.apus.length) {
      return NextResponse.json({ catalogo: [], cuadrillas, count: 0 }, { status: 200 });
    }
    const { apus, ctx } = datos;

    // Excluir básicos puros (salvo concretos/morteros por M3)
    const apusCurados = apus.filter((a) => normTxt(a.categoria_apu) !== 'BASICOS' || normTxt(a.unidad) === 'M3');

    const catalogo = [];
    for (const a of apusCurados) {
      const res = costoAPU(ctx, a.id);
      const total = Math.round(res.total);
      if (!(total > 0)) continue; // Sin costo real → no se publica (sin precios de referencia)

      const cat = a.categoria_apu || 'GENERAL';
      const cq = cuadrillaParaCategoria(cat, cuadrillas);
      const lineaMO = res.lineas.find((l) => l.bucket === 'mano_obra' && l.tipo === 'MANO DE OBRA');

      // Nota: `codigo` NO se expone al cliente
      catalogo.push({
        id: a.id,
        nombre: a.nombre,
        descripcion: a.descripcion || '',
        unidad: a.unidad || 'Un',
        categoria: cat,
        capitulo: cat,
        orden_capitulo: ordenCapitulo(cat),
        cuadrilla_codigo: cq.codigo,
        cuadrilla_nombre: cq.nombre,
        cuadrilla_color: cq.color,
        cuadrilla_mo: lineaMO?.nombre || null,
        precio_unitario: total,
        desglose: {
          equipo: Math.round(res.equipo),
          material: Math.round(res.material),
          mano_obra: Math.round(res.mano_obra),
          transporte: Math.round(res.transporte),
        },
        rendimiento: rendimientoSugerido(a.unidad, cq.codigo, a.rendimiento),
        componentes: aComponentes(res.lineas),
      });
    }

    catalogo.sort((x, y) => (x.orden_capitulo - y.orden_capitulo) || String(x.nombre).localeCompare(String(y.nombre), 'es'));

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
