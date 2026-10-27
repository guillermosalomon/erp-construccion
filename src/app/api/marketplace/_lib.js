/* ============================================================
   Utilidades de servidor para pagos del Marketplace (Kalarti)
   - Usa SUPABASE_SERVICE_ROLE_KEY si está definida (omite RLS).
   - Si no, actúa con el token del comprador (RLS: solo lee/actualiza
     lo que sus políticas permitan).
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const tieneServiceKey = () => Boolean(SB_URL && SERVICE);

/** Cliente Supabase para el servidor: service role o token del usuario */
export function supabaseServidor(request) {
  if (!SB_URL) return null;
  if (SERVICE) return createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  if (!ANON) return null;
  const auth = request?.headers?.get?.('authorization') || '';
  return createClient(SB_URL, ANON, {
    auth: { persistSession: false },
    global: auth ? { headers: { Authorization: auth } } : undefined,
  });
}

export const siteUrl = (request) => {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (env) return env;
  try { return new URL(request.url).origin; } catch { return ''; }
};

/** Consulta un pago en MercadoPago */
export async function obtenerPagoMP(paymentId) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || !paymentId) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Aplica el resultado de un pago aprobado al pedido y a pagos_plataforma.
 * Devuelve { pedido: bool, pago: bool } según lo que se pudo actualizar.
 */
export async function aplicarPagoAprobado(sb, pedidoId, pago) {
  const out = { pedido: false, pago: false };
  if (!sb || !pedidoId) return out;
  const { data: ped } = await sb.from('mk_pedidos').select('id, estado').eq('id', pedidoId).maybeSingle();
  const cambios = { estado_pago: 'aprobado' };
  if (!ped || ped.estado === 'PENDIENTE_PAGO' || ped.estado === 'PENDIENTE') cambios.estado = 'PENDIENTE_CONTACTO';
  const { data: p1 } = await sb.from('mk_pedidos').update(cambios).eq('id', pedidoId).select('id');
  out.pedido = Boolean(p1 && p1.length);
  const { data: p2 } = await sb
    .from('pagos_plataforma')
    .update({ estado: 'aprobado', pasarela_ref: String(pago?.id || ''), raw: pago || null, updated_at: new Date().toISOString() })
    .eq('mk_pedido_id', pedidoId)
    .eq('proveedor', 'mercadopago')
    .select('id');
  out.pago = Boolean(p2 && p2.length);
  return out;
}
