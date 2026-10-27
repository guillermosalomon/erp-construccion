import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * Endpoint de sincronización en tiempo real: ERP -> Cotizador Web.
 * Invalida la caché de /cotizador y /api/cotizador/catalogo al guardar cambios
 * en APUs, insumos, cargos, categorías u ofertas POS.
 */
export async function POST() {
  try {
    revalidatePath('/cotizador');
    revalidatePath('/api/cotizador/catalogo');
    return NextResponse.json({
      revalidated: true,
      paths: ['/cotizador', '/api/cotizador/catalogo'],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error revalidando /cotizador:', err);
    return NextResponse.json({ revalidated: false, error: err?.message || 'Error' }, { status: 500 });
  }
}
