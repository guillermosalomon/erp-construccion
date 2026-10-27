import { NextResponse } from 'next/server';
import { supabaseServidor, obtenerPagoMP, aplicarPagoAprobado, tieneServiceKey } from '../_lib';

/**
 * GET /api/marketplace/verificar?pedido=<id>&payment_id=<id>
 * Consulta el pago en MercadoPago. Si está aprobado y corresponde al pedido,
 * actualiza mk_pedidos (estado_pago 'aprobado', estado 'PENDIENTE_CONTACTO') y
 * pagos_plataforma ('aprobado').
 * Con SUPABASE_SERVICE_ROLE_KEY la actualización siempre se aplica. Sin ella se
 * intenta con el token del comprador; si RLS lo impide, solo se devuelve el
 * estado y el personal confirma el pago desde el ERP.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedido');
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
    if (!pedidoId || !paymentId) return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 });
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ status: 'desconocido', mensaje: 'MercadoPago no configurado' });
    }

    const pago = await obtenerPagoMP(paymentId);
    if (!pago) return NextResponse.json({ status: 'no_encontrado' }, { status: 404 });
    if (String(pago.external_reference || '') !== String(pedidoId)) {
      return NextResponse.json({ status: 'no_corresponde' }, { status: 409 });
    }

    const status = pago.status; // approved | pending | in_process | rejected …
    let actualizado = { pedido: false, pago: false };
    if (status === 'approved') {
      const sb = supabaseServidor(request);
      actualizado = await aplicarPagoAprobado(sb, pedidoId, pago);
    }
    return NextResponse.json({
      status,
      monto: pago.transaction_amount,
      actualizado,
      service_key: tieneServiceKey(),
    });
  } catch (err) {
    console.error('Error en /api/marketplace/verificar:', err);
    return NextResponse.json({ error: 'Error verificando el pago' }, { status: 500 });
  }
}
