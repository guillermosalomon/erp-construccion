import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Invita un usuario por correo (Supabase Auth admin) y crea su perfil.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo servidor). El llamador debe enviar
 * su access token (Authorization: Bearer) y tener rol ADMIN o correo corporativo.
 */
const ROLES = ['ADMIN', 'STAFF', 'RESIDENTE', 'CUADRILLA', 'VENDEDOR', 'CLIENTE'];
const ADMIN_EMAILS = ['gsalo90@outlook.com', 'guillermosalomonsolarte@gmail.com', 'arq.guillermo_salomon@kalarti.com'];

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({
      ok: false,
      error: 'Invitación no disponible: configure SUPABASE_SERVICE_ROLE_KEY en el servidor. Mientras tanto, el usuario puede registrarse en la web y luego asignarle el rol aquí.',
    }, { status: 501 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Verificar al llamador
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ ok: false, error: 'Sesión requerida' }, { status: 401 });
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
  const callerEmail = (caller.user.email || '').toLowerCase();
  const { data: callerProfile } = await admin.from('profiles').select('role, roles').eq('id', caller.user.id).maybeSingle();
  const callerRoles = [callerProfile?.role, ...(callerProfile?.roles || [])].map((r) => String(r || '').toUpperCase());
  const esAdmin = callerRoles.includes('ADMIN') || callerEmail.endsWith('@kalarti.com') || ADMIN_EMAILS.includes(callerEmail);
  if (!esAdmin) return NextResponse.json({ ok: false, error: 'Solo administradores pueden invitar usuarios' }, { status: 403 });

  // 2. Validar datos
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const email = String(body.email || '').trim().toLowerCase();
  const nombre = String(body.nombre || '').trim() || email.split('@')[0];
  const role = ROLES.includes(String(body.role || '').toUpperCase()) ? String(body.role).toUpperCase() : 'CLIENTE';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Correo no válido' }, { status: 400 });
  }

  // 3. Invitar
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/erp` : undefined;
  const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, nombre, telefono: body.telefono || undefined, ciudad: body.ciudad || undefined },
    redirectTo,
  });
  if (invErr) {
    return NextResponse.json({ ok: false, error: `No se pudo invitar: ${invErr.message}` }, { status: 400 });
  }

  // 4. Crear/actualizar perfil (tolerante a columnas nuevas faltantes)
  const userId = inv?.user?.id;
  if (userId) {
    const base = { id: userId, email, nombre, role };
    const extendido = { ...base, roles: [role], telefono: body.telefono || null, ciudad: body.ciudad || null, activo: true };
    const r = await admin.from('profiles').upsert(extendido, { onConflict: 'id' });
    if (r.error) await admin.from('profiles').upsert(base, { onConflict: 'id' });
  }

  return NextResponse.json({ ok: true, userId, mensaje: `Invitación enviada a ${email}` });
}
