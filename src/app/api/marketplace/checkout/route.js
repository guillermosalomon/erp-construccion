import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabaseServidor, siteUrl } from '../_lib';

/**
 * POST /api/marketplace/checkout  { pedidoId }
 * Crea una preferencia de MercadoPago Checkout Pro (único medio de pago habilitado).
 * El monto se toma del pedido en la base (no del navegador).
 */
export async function POST(request) {
  try {
    const { pedidoId } = await request.json();
    if (!pedidoId) return NextResponse.json({ error: 'Pedido no indicado' }, { status: 400 });

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        {
          error: 'MERCADOPAGO_ACCESS_TOKEN no está configurado en el servidor.',
          mensaje: 'La pasarela de Mercado Pago aún no tiene configurado MERCADOPAGO_ACCESS_TOKEN en .env.local.',
        },
        { status: 503 }
      );
    }

    const sb = supabaseServidor(request);
    if (!sb) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 });
    const { data: pedido, error } = await sb
      .from('mk_pedidos')
      .select('id, numero, total, comprador_email, comprador_nombre')
      .eq('id', pedidoId)
      .maybeSingle();
    if (error || !pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const base = (siteUrl(request) || 'http://localhost:3000').replace(/\/$/, '');
    const isHttps = base.startsWith('https://');
    const volver = `${base}/marketplace/pedido/${pedido.id}`;
    const testPayerEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL;
    const payerEmail =
      testPayerEmail && !String(pedido.comprador_email || '').endsWith('@testuser.com')
        ? testPayerEmail
        : pedido.comprador_email;

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: String(pedido.id),
            title: `Tienda Kalarti - Pedido ${pedido.numero || ''}`.trim(),
            quantity: 1,
            currency_id: 'COP',
            unit_price: Math.round(Number(pedido.total) || 0),
          },
        ],
        payer: payerEmail
          ? { email: payerEmail, name: pedido.comprador_nombre || undefined }
          : undefined,
        external_reference: String(pedido.id),
        back_urls: { success: volver, failure: volver, pending: volver },
        ...(isHttps
          ? {
              auto_return: 'approved',
              notification_url: `${base}/api/marketplace/webhook`,
            }
          : {}),
        statement_descriptor: 'KALARTI',
        metadata: {
          tipo_producto: 'MARKETPLACE',
          producto_db: 'marketplace',
          referencia_id: String(pedido.id),
          user_email: pedido.comprador_email || null,
        },
      },
    });

    if (!result?.init_point) {
      return NextResponse.json(
        { error: 'No se pudo generar el enlace de pago en Mercado Pago.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      provider: 'mercadopago',
      init_point: result.init_point,
      url: result.init_point,
      sandbox_url: result.sandbox_init_point,
      id: result.id,
    });
  } catch (err) {
    console.error('Error en /api/marketplace/checkout:', err);
    return NextResponse.json({ error: 'Error al procesar el pago con Mercado Pago' }, { status: 500 });
  }
}
