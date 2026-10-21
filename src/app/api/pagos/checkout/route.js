import { NextResponse } from 'next/server';
import { PRODUCTOS } from '@/lib/cotizador/config';

export async function POST(request) {
  try {
    const { productoId, moneda = 'COP', email, proyectoId } = await request.json();

    const prod = PRODUCTOS[productoId];
    if (!prod) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 400 });
    }

    const valor = prod.precio[moneda] || prod.precio.COP;

    // Mercado Pago Access Token
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;

    // Si tiene configurado Mercado Pago y es COP
    if (mpToken && moneda === 'COP') {
      try {
        const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mpToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                title: `Kalarti - ${prod.nombre}`,
                quantity: 1,
                currency_id: 'COP',
                unit_price: Number(valor),
              },
            ],
            payer: email ? { email } : undefined,
            external_reference: `${productoId}__${proyectoId || 'sin_pry'}__${Date.now()}`,
            back_urls: {
              success: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/cotizador?pago=success`,
              failure: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/cotizador?pago=failure`,
              pending: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/cotizador?pago=pending`,
            },
            auto_return: 'approved',
          }),
        });

        const prefData = await prefRes.json();
        if (prefData.init_point) {
          return NextResponse.json({
            provider: 'mercadopago',
            url: prefData.init_point,
            sandbox_url: prefData.sandbox_init_point,
          });
        }
      } catch (mpErr) {
        console.warn('Error iniciando preferencia MP:', mpErr);
      }
    }

    // Modo enlace directo / WhatsApp de confirmación con pasarela asistida
    const whatsMsg = encodeURIComponent(
      `¡Hola Kalarti! Quiero activar: *${prod.nombre}* (${valor} ${moneda}) para mi proyecto.\nCorreo: ${email || 'por definir'}`
    );
    const checkoutLink = `https://wa.me/573177725056?text=${whatsMsg}`;

    return NextResponse.json({
      provider: 'asistido',
      url: checkoutLink,
      info: {
        producto: prod.nombre,
        valor,
        moneda,
        paypalAvailable: !!paypalClientId,
        mercadopagoAvailable: !!mpToken,
      },
    });
  } catch (err) {
    console.error('Error en /api/pagos/checkout:', err);
    return NextResponse.json({ error: 'Error al procesar checkout' }, { status: 500 });
  }
}
