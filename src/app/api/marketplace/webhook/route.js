import { NextResponse } from 'next/server';
import { supabaseServidor, obtenerPagoMP, aplicarPagoAprobado, tieneServiceKey } from '../_lib';

/**
 * POST /api/marketplace/webhook — notificaciones de MercadoPago.
 * Requiere SUPABASE_SERVICE_ROLE_KEY para actualizar el pedido (no hay sesión de usuario).
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const tipo = body?.type || body?.topic || searchParams.get('type') || searchParams.get('topic');
    const paymentId = body?.data?.id || searchParams.get('data.id') || searchParams.get('id');
    if (tipo !== 'payment' || !paymentId) return NextResponse.json({ ok: true, ignorado: true });

    const pago = await obtenerPagoMP(paymentId);
    if (!pago) return NextResponse.json({ ok: false, mensaje: 'Pago no encontrado' });
    if (pago.status === 'approved' && pago.external_reference && tieneServiceKey()) {
      const r = await aplicarPagoAprobado(supabaseServidor(request), pago.external_reference, pago);
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ ok: true, status: pago.status, service_key: tieneServiceKey() });
  } catch (err) {
    console.error('Error en /api/marketplace/webhook:', err);
    // 200 para que MercadoPago no reintente indefinidamente por errores internos
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
