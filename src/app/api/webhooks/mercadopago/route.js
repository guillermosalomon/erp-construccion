import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { PRODUCTOS } from '@/lib/cotizador/config';

const PLAN_CONFIG = {
  PLAN_SUSCRIPCION_MENSUAL: { plan: 'mensual', dias: 30, ...PRODUCTOS.mensual },
  mensual: { plan: 'mensual', dias: 30, ...PRODUCTOS.mensual },
  PLAN_SUSCRIPCION_SEMESTRAL: { plan: 'semestral', dias: 180, ...PRODUCTOS.semestral },
  semestral: { plan: 'semestral', dias: 180, ...PRODUCTOS.semestral },
  PLAN_SUSCRIPCION_ANUAL: { plan: 'anual', dias: 365, ...PRODUCTOS.anual },
  anual: { plan: 'anual', dias: 365, ...PRODUCTOS.anual },
};

function normalizarProductoDb(tipoProducto, productoDb) {
  if (productoDb && ['export', 'mensual', 'semestral', 'anual', 'marketplace'].includes(productoDb)) {
    return productoDb;
  }
  const t = String(tipoProducto || '').toUpperCase();
  if (t.includes('MENSUAL')) return 'mensual';
  if (t.includes('SEMESTRAL')) return 'semestral';
  if (t.includes('ANUAL')) return 'anual';
  if (t.includes('MARKETPLACE')) return 'marketplace';
  return 'export';
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado' }, { status: 503 });
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const supabaseAdmin = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const topic =
      searchParams.get('topic') ||
      searchParams.get('type') ||
      body?.topic ||
      body?.type;
    const paymentId =
      searchParams.get('data.id') ||
      searchParams.get('id') ||
      body?.data?.id ||
      body?.id;

    if (topic === 'payment' && paymentId) {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      if (paymentData.status === 'approved' && supabaseAdmin) {
        const metadata = paymentData.metadata || {};
        const {
          tipo_producto,
          producto_db,
          referencia_id,
          user_email,
          user_id: metaUserId,
        } = metadata;

        const productoNormalizado = normalizarProductoDb(tipo_producto, producto_db);
        const transaccionId = String(paymentData.id);
        const emailPagador = user_email || paymentData.payer?.email || null;

        // Resolver user_id en profiles si no vino en metadata
        let resolvedUserId = metaUserId || null;
        if (!resolvedUserId && emailPagador) {
          const { data: perfil } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .ilike('email', emailPagador)
            .maybeSingle();
          if (perfil?.id) resolvedUserId = perfil.id;
        }

        // 1. Registrar o actualizar en pagos_plataforma
        const registroCompleto = {
          transaccion_id: transaccionId,
          pasarela_ref: transaccionId,
          user_id: resolvedUserId,
          producto: productoNormalizado,
          moneda: paymentData.currency_id === 'USD' ? 'USD' : 'COP',
          monto: Number(paymentData.transaction_amount) || 0,
          proveedor: 'mercadopago',
          metodo_pago: 'mercadopago',
          estado: 'aprobado',
          estado_pago: 'APROBADO',
          tipo_producto: tipo_producto || productoNormalizado,
          referencia: referencia_id || paymentData.external_reference || null,
          referencia_id: referencia_id || paymentData.external_reference || null,
          user_email: emailPagador,
          raw: paymentData,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabaseAdmin
          .from('pagos_plataforma')
          .upsert(registroCompleto, { onConflict: 'transaccion_id' });

        // Fallback compatible si aún no se han corrido las columnas nuevas en Supabase
        if (upsertErr) {
          await supabaseAdmin.from('pagos_plataforma').insert({
            user_id: resolvedUserId,
            producto: productoNormalizado,
            moneda: paymentData.currency_id === 'USD' ? 'USD' : 'COP',
            monto: Number(paymentData.transaction_amount) || 0,
            proveedor: 'mercadopago',
            estado: 'aprobado',
            pasarela_ref: transaccionId,
            referencia: referencia_id || paymentData.external_reference || null,
            raw: paymentData,
            updated_at: new Date().toISOString(),
          });
        }

        // 2. Si es plan de suscripción (mensual / semestral / anual), extender vigencia +30/+180/+365 días
        const planInfo = PLAN_CONFIG[tipo_producto] || PLAN_CONFIG[productoNormalizado];
        if (planInfo && resolvedUserId) {
          const { data: suscActual } = await supabaseAdmin
            .from('suscripciones')
            .select('id, vence, estado')
            .eq('user_id', resolvedUserId)
            .maybeSingle();

          const ahora = new Date();
          const baseFecha =
            suscActual?.vence && new Date(suscActual.vence) > ahora
              ? new Date(suscActual.vence)
              : ahora;
          const nuevaFechaVence = new Date(
            baseFecha.getTime() + planInfo.dias * 24 * 60 * 60 * 1000
          );

          await supabaseAdmin.from('suscripciones').upsert(
            {
              user_id: resolvedUserId,
              plan: planInfo.plan,
              estado: 'activa',
              vence: nuevaFechaVence.toISOString(),
              max_proyectos: planInfo.max_proyectos || 1,
              max_usuarios: planInfo.max_usuarios || 2,
              puede_editar_apu: Boolean(planInfo.puede_editar_apu),
              proveedor: 'mercadopago',
              pasarela_ref: transaccionId,
              updated_at: ahora.toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error procesando Webhook Mercado Pago:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'mercadopago-webhook' });
}
