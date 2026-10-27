import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PRODUCTOS } from '@/lib/cotizador/config';

const CATALOGO_PRECIOS_SERVIDOR = {
  EXPORTAR_EXCEL: {
    title: 'Exportación Presupuesto Excel Profesional — KALARTI',
    unitPrice: PRODUCTOS.export?.precio?.COP || 19900,
    productoDb: 'export',
  },
  export: {
    title: 'Exportación Presupuesto Excel Profesional — KALARTI',
    unitPrice: PRODUCTOS.export?.precio?.COP || 19900,
    productoDb: 'export',
  },
  PLAN_SUSCRIPCION_MENSUAL: {
    title: 'Plan Profesional Mensual — KALARTI ERP/Cotizador',
    unitPrice: 49900,
    productoDb: 'mensual',
  },
  mensual: {
    title: 'Plan Profesional Mensual — KALARTI ERP/Cotizador',
    unitPrice: PRODUCTOS.mensual?.precio?.COP || 49900,
    productoDb: 'mensual',
  },
  PLAN_SUSCRIPCION_SEMESTRAL: {
    title: 'Plan Profesional Semestral — KALARTI ERP/Cotizador',
    unitPrice: PRODUCTOS.semestral?.precio?.COP || 99900,
    productoDb: 'semestral',
  },
  semestral: {
    title: 'Plan Profesional Semestral — KALARTI ERP/Cotizador',
    unitPrice: PRODUCTOS.semestral?.precio?.COP || 99900,
    productoDb: 'semestral',
  },
  PLAN_SUSCRIPCION_ANUAL: {
    title: 'Plan Profesional Anual — KALARTI ERP/Cotizador',
    unitPrice: PRODUCTOS.anual?.precio?.COP || 179900,
    productoDb: 'anual',
  },
  anual: {
    title: 'Plan Profesional Anual — KALARTI ERP/Cotizador',
    unitPrice: PRODUCTOS.anual?.precio?.COP || 179900,
    productoDb: 'anual',
  },
};

export async function POST(request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MERCADOPAGO_ACCESS_TOKEN no está configurado en el servidor.' },
        { status: 503 }
      );
    }

    // 1. Inicializar cliente con el token privado
    const client = new MercadoPagoConfig({
      accessToken,
    });

    const body = await request.json();
    const { tipoProducto = 'EXPORTAR_EXCEL', referenciaId, userEmail, userId } = body;

    // 2. Precios fijados en servidor (nunca tomados ciegamente del frontend)
    const configProducto =
      CATALOGO_PRECIOS_SERVIDOR[tipoProducto] || CATALOGO_PRECIOS_SERVIDOR.EXPORTAR_EXCEL;
    const title = configProducto.title;
    const unitPrice = configProducto.unitPrice;
    const refSafe = referenciaId || `KALARTI-${configProducto.productoDb.toUpperCase()}-${Date.now()}`;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const isHttps = siteUrl.startsWith('https://');

    // Si estamos en entorno de pruebas con un Vendedor Test (@testuser.com),
    // Mercado Pago exige que payer.email también sea un Comprador Test (@testuser.com).
    const testPayerEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL;
    const payerEmail =
      testPayerEmail && !String(userEmail || '').endsWith('@testuser.com')
        ? testPayerEmail
        : userEmail || 'cliente@ejemplo.com';

    // 3. Crear la preferencia en Mercado Pago (Checkout Pro)
    const preference = new Preference(client);
    const prefBody = {
      items: [
        {
          id: String(refSafe),
          title,
          quantity: 1,
          unit_price: Number(unitPrice),
          currency_id: 'COP',
        },
      ],
      payer: {
        email: payerEmail,
      },
      external_reference: String(refSafe),
      back_urls: {
        success: `${siteUrl}/cotizador?pago=success&tipo=${encodeURIComponent(tipoProducto)}&ref=${encodeURIComponent(refSafe)}`,
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
        tipo_producto: tipoProducto,
        producto_db: configProducto.productoDb,
        referencia_id: String(refSafe),
        user_email: userEmail || null,
        user_id: userId || null,
      },
    };

    const result = await preference.create({ body: prefBody });

    // 4. Devolver únicamente la URL de redirección e identificador
    return NextResponse.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      id: result.id,
    });
  } catch (error) {
    console.error('Error creando preferencia Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de pago' },
      { status: 500 }
    );
  }
}
