/**
 * Helpers de servidor (solo usar en route handlers).
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cliente con service role (salta RLS). Devuelve null si no está configurado. */
export function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) return null;
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cliente que actúa como el usuario (respeta RLS). */
export function getUserClient(token) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

export function getBearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
}

/** Valida el token del usuario. Devuelve { user, token, client } o null. */
export async function getUserFromRequest(request) {
  const token = getBearer(request);
  if (!token) return null;
  const client = getUserClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user, token, client };
}

/* ─── Rate limit simple en memoria (por instancia) ─── */
const buckets = new Map();
export function rateLimit(key, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}

/* ─── WhatsApp (Twilio) ─── */
export async function sendTeamWhatsApp(body, to) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';
  const dest = to || process.env.KALARTI_TEAM_PHONE || '+573177725056';
  if (!sid || !tok) {
    console.warn('[WhatsApp] Twilio no configurado. Mensaje no enviado:\n' + body);
    return { skipped: true };
  }
  const form = new URLSearchParams();
  form.append('From', `whatsapp:${from}`);
  form.append('To', `whatsapp:${dest}`);
  // WhatsApp limita a 1600 caracteres
  form.append('Body', body.length > 1550 ? body.slice(0, 1550) + '…' : body);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  return res.json();
}

export function siteOrigin(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
