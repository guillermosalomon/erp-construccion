'use client';

/* ============================================================
   Tienda virtual Kalarti — utilidades compartidas (web pública)
   Carrito (localStorage), formato, normalización de ofertas y
   caja de autenticación para clientes.
   ============================================================ */

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const CART_KEY = 'kalarti_mk_cart_v1';
export const MUNICIPIO_DEFAULT = 'Pasto';

export const fmt = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);

/** Normaliza texto: minúsculas y sin tildes */
export const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Convierte una fila de mk_ofertas (con joins) en un producto de la tienda */
export function ofertaToProducto(o) {
  const origen = (o.origen || 'CATALOGO').toUpperCase() === 'SOBRANTE' ? 'SOBRANTE' : 'CATALOGO';
  const precio = origen === 'SOBRANTE'
    ? Number(o.precio_liquidacion || o.precio_venta || 0)
    : Number(o.precio_venta || 0);
  const municipio = origen === 'SOBRANTE'
    ? (o.bodega?.municipio || o.ciudad || MUNICIPIO_DEFAULT)
    : (o.ciudad || MUNICIPIO_DEFAULT);
  return {
    id: o.id,
    insumo_id: o.insumo_id,
    nombre: o.nombre_comercial || o.insumo?.nombre || 'Producto',
    categoria: (o.categoria || o.insumo?.categoria || 'General').trim(),
    unidad: o.unidad || o.insumo?.unidad || 'und',
    precio,
    origen,
    bodega_id: o.bodega_id || null,
    municipio: String(municipio).split(',')[0].trim() || MUNICIPIO_DEFAULT,
    sector: o.sector || '',
    stock: origen === 'SOBRANTE' ? Number(o.stock_disponible || 0) : null,
  };
}

/* ─── Carrito ─── */
export function readCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items || []));
    window.dispatchEvent(new Event('kalarti-cart-change'));
  } catch { /* almacenamiento lleno o bloqueado */ }
}

export const cartSubtotal = (items) => (items || []).reduce((s, i) => s + Number(i.precio || 0) * Number(i.cantidad || 0), 0);

/** Limita la cantidad al stock real en sobrantes; catálogo sin límite práctico */
export const clampQty = (item, qty) => {
  const q = Math.max(1, Math.floor(Number(qty) || 1));
  return item.stock_max ? Math.min(q, item.stock_max) : Math.min(q, 9999);
};

export function generarNumeroPedido() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `MK-${ymd}-${rnd}`;
}

export const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

/** Número WhatsApp colombiano: agrega 57 si hace falta */
export function waNumber(tel) {
  const d = soloDigitos(tel);
  if (!d) return '';
  if (d.startsWith('57') && d.length >= 12) return d;
  return `57${d}`;
}

/** Lee DATOS_PAGO desde global_config (valor JSON en texto) */
export async function loadDatosPago() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('global_config').select('valor').eq('clave', 'DATOS_PAGO').maybeSingle();
    if (!data?.valor) return null;
    return typeof data.valor === 'string' ? JSON.parse(data.valor) : data.valor;
  } catch {
    return null;
  }
}

/** Crea/actualiza el perfil del cliente tolerando columnas faltantes */
export async function upsertPerfilCliente(user, { nombre, telefono, ciudad } = {}) {
  if (!supabase || !user?.id) return;
  const full = {
    id: user.id,
    email: user.email,
    nombre: nombre || user.user_metadata?.nombre || null,
    role: 'CLIENTE',
    telefono: telefono || null,
    whatsapp: telefono ? soloDigitos(telefono) : null,
    ciudad: ciudad || null,
  };
  const { error } = await supabase.from('profiles').upsert(full, { onConflict: 'id' });
  if (error) {
    // Columnas nuevas aún no creadas: reintento con lo mínimo
    const { error: e2 } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, nombre: full.nombre, role: 'CLIENTE' }, { onConflict: 'id' });
    if (e2) console.warn('No se pudo guardar el perfil:', e2.message);
  }
}

/** Carga todas las ofertas publicadas y activas, en lotes de 1000, con insumo y bodega */
export async function loadOfertasPublicadas() {
  if (!supabase) return [];
  const selects = [
    '*, insumo:insumos(nombre, unidad, categoria), bodega:bodegas(municipio)',
    '*, insumo:insumos(nombre, unidad, categoria)',
    '*',
  ];
  for (const sel of selects) {
    const out = [];
    let ok = true;
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await supabase
        .from('mk_ofertas')
        .select(sel)
        .eq('publicado_marketplace', true)
        .eq('activo', true)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) { ok = false; break; }
      out.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    if (ok) return out;
  }
  return [];
}

/* ─── Estados del pedido web ─── */
export const ESTADOS_PEDIDO = ['PENDIENTE_PAGO', 'PENDIENTE_CONTACTO', 'CONFIRMADO_CON_PROVEEDOR', 'EN_RUTA', 'ENTREGADO'];
export const ESTADO_PEDIDO_LABEL = {
  PENDIENTE_PAGO: 'Pago pendiente',
  PENDIENTE_CONTACTO: 'Pago recibido',
  CONFIRMADO_CON_PROVEEDOR: 'Confirmado',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};
export const METODO_PAGO_LABEL = { mercadopago: 'MercadoPago', transferencia: 'Transferencia bancaria', qr_breb: 'QR Bre-B' };

/** Token de la sesión actual (para llamar las API del servidor bajo RLS) */
export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/** Sube un comprobante al bucket 'comprobantes'. Devuelve la URL o null si no es posible. */
export async function subirComprobante(file, { userId, pedidoId } = {}) {
  if (!supabase || !file) return null;
  try {
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${userId || 'anon'}/${pedidoId || 'pedido'}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) return null;
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(path);
    return data?.publicUrl || path;
  } catch {
    return null;
  }
}

/**
 * Registra el comprobante en pagos_plataforma (estado 'en_revision'; si la política
 * solo permite 'pendiente', reintenta así) y marca el pedido como en revisión si RLS lo permite.
 */
export async function registrarComprobante({ user, pedido, comprobanteUrl }) {
  if (!supabase || !user || !pedido) return false;
  const base = {
    user_id: user.id, producto: 'marketplace', moneda: 'COP', monto: Number(pedido.total) || 0,
    proveedor: pedido.metodo_pago === 'qr_breb' ? 'qr_breb' : 'transferencia',
    mk_pedido_id: pedido.id, comprobante_url: comprobanteUrl || null, referencia: pedido.numero || null,
  };
  let { error } = await supabase.from('pagos_plataforma').insert({ ...base, estado: 'en_revision' });
  if (error) ({ error } = await supabase.from('pagos_plataforma').insert({ ...base, estado: 'pendiente' }));
  if (error) {
    const sinRef = { ...base };
    delete sinRef.referencia;
    ({ error } = await supabase.from('pagos_plataforma').insert({ ...sinRef, estado: 'pendiente' }));
  }
  // Solo personal Kalarti puede actualizar pedidos; si no se permite, se ignora.
  try { await supabase.from('mk_pedidos').update({ estado_pago: 'en_revision' }).eq('id', pedido.id); } catch { /* RLS */ }
  return !error;
}

/* ─── Estilos compartidos ─── */
export const ui = {
  input: { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 },
  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnGhost: { background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 },
};

/* ─── Encabezado público ─── */
export function TiendaHeader({ cartCount = 0, onCart }) {
  return (
    <nav style={{ background: '#0f172a', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: 12 }}>
      <a href="/marketplace" style={{ fontSize: 22, fontWeight: 800, color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="Kalarti" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
        Tienda Kalarti
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 500 }}>Ecosistema</Link>
        <Link href="/propiedades" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 500 }}>Inmuebles</Link>
        <a href="/erp" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>Ingresar</a>
        {onCart && (
          <button onClick={onCart} style={{ position: 'relative', background: '#2563eb', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            🛒 Carrito
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -7, right: -7, minWidth: 20, height: 20, borderRadius: 10, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{cartCount}</span>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}

/* ─── Caja de inicio de sesión / registro rápido de clientes ─── */
export function AuthBox({ onAuthed, titulo = 'Ingresa para continuar' }) {
  const [modo, setModo] = useState('registro');
  const [f, setF] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!supabase) { setMsg('Servicio no disponible.'); return; }
    setBusy(true); setMsg('');
    try {
      if (modo === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
        onAuthed?.(data.user);
      } else {
        if (!f.nombre.trim() || !f.telefono.trim()) throw new Error('Nombre y teléfono son obligatorios.');
        if (f.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: { data: { role: 'CLIENTE', nombre: f.nombre.trim(), telefono: f.telefono.trim() } },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await upsertPerfilCliente(data.user, { nombre: f.nombre.trim(), telefono: f.telefono.trim() });
          onAuthed?.(data.user);
        } else {
          setMsg('Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.');
          setModo('login');
        }
      }
    } catch (err) {
      setMsg(err.message || 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...ui.card, maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{titulo}</h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
        {modo === 'login' ? 'Ingresa con tu cuenta de cliente.' : 'Crea tu cuenta de cliente en menos de un minuto.'}
      </p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modo === 'registro' && (
          <>
            <div><label style={ui.label}>Nombre completo</label><input style={ui.input} value={f.nombre} onChange={set('nombre')} required /></div>
            <div><label style={ui.label}>Teléfono / WhatsApp</label><input style={ui.input} value={f.telefono} onChange={set('telefono')} inputMode="tel" required /></div>
          </>
        )}
        <div><label style={ui.label}>Correo electrónico</label><input style={ui.input} type="email" value={f.email} onChange={set('email')} required /></div>
        <div><label style={ui.label}>Contraseña</label><input style={ui.input} type="password" value={f.password} onChange={set('password')} required /></div>
        {msg && <div style={{ fontSize: 13, color: msg.startsWith('Cuenta creada') ? '#15803d' : '#b91c1c' }}>{msg}</div>}
        <button type="submit" style={{ ...ui.btnPrimary, opacity: busy ? 0.7 : 1 }} disabled={busy}>
          {busy ? 'Procesando…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>
      <div style={{ marginTop: 14, fontSize: 13, color: '#475569', textAlign: 'center' }}>
        {modo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
        <button onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>
          {modo === 'login' ? 'Regístrate' : 'Ingresa'}
        </button>
      </div>
    </div>
  );
}
