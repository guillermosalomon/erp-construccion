import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PRODUCTOS } from '@/lib/cotizador/config';

/**
 * POST /api/pagos/checkout
 * Único medio de pago habilitado: Mercado Pago Checkout Pro con redirección.
 */
export async function POST(request) {
  try {
    const { productoId, email, proyectoId } = await request.json();

    const prod = PRODUCTOS[productoId];
    if (!prod) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 400 });
    }

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        {
          error:
            'MERCADOPAGO_ACCESS_TOKEN no está configurado en el servidor (.env.local).',
        },
        { status: 503 }
      );
    }

    const valor = prod.precio.COP;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const isHttps = siteUrl.startsWith('https://');
    const refSafe = `${productoId}__${proyectoId || 'sin_pry'}__${Date.now()}`;
    const testPayerEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL;
    const payerEmail =
      testPayerEmail && !String(email || '').endsWith('@testuser.com')
        ? testPayerEmail
        : email || 'cliente@ejemplo.com';

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: refSafe,
            title: `Kalarti - ${prod.nombre}`,
            quantity: 1,
            currency_id: 'COP',
            unit_price: Number(valor),
          },
        ],
        payer: { email: payerEmail },
        external_reference: refSafe,
        back_urls: {
          success: `${siteUrl}/cotizador?pago=success&tipo=${encodeURIComponent(productoId)}&ref=${encodeURIComponent(refSafe)}`,
          failure: `${siteUrl}/cotizador?pago=failure`,
          pending: `${siteUrl}/cotizador?pago=pending`,
        },
        ...(isHttps
          ? {
              auto_return: 'approved',
              notification_url: `${siteUrl}/api/webhooks/mercadopago`,
            }
          : {}),
        metadata: {
          tipo_producto: productoId,
          producto_db: productoId,
          referencia_id: refSafe,
          user_email: email || null,
        },
      },
    });

    if (!result?.init_point) {
      return NextResponse.json(
        { error: 'No se pudo generar la preferencia de Mercado Pago.' },
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
    console.error('Error en /api/pagos/checkout:', err);
    return NextResponse.json({ error: 'Error al procesar checkout en Mercado Pago' }, { status: 500 });
  }
}
