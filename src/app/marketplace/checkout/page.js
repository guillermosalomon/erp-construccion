'use client';

/* ============================================================
   Tienda virtual Kalarti — checkout
   Requiere sesión de cliente. Crea mk_pedidos + pagos_plataforma
   y redirige a MercadoPago o a las instrucciones de pago.
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fmt, readCart, writeCart, cartSubtotal, generarNumeroPedido, upsertPerfilCliente,
  getAccessToken, TiendaHeader, AuthBox, ui, MUNICIPIO_DEFAULT,
} from '../_lib/shared';

const METODOS = [
  { id: 'mercadopago', label: 'Mercado Pago (Checkout Pro)', desc: 'Pago seguro en línea con PSE, Tarjeta débito/crédito, Nequi o Efecty.' },
];

export default function CheckoutPage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [cart, setCart] = useState([]);
  const [f, setF] = useState({ nombre: '', telefono: '', direccion: '', municipio: MUNICIPIO_DEFAULT, tipo_entrega: 'DESPACHO', notas: '', metodo_pago: 'mercadopago' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setCart(readCart());
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => { setUser(data?.session?.user || null); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Prellenar datos del cliente
  useEffect(() => {
    if (!user || !supabase) return;
    const md = user.user_metadata || {};
    setF((p) => ({ ...p, nombre: p.nombre || md.nombre || '', telefono: p.telefono || md.telefono || '' }));
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setF((p) => ({
        ...p,
        nombre: p.nombre || data.nombre || '',
        telefono: p.telefono || data.telefono || data.whatsapp || '',
        municipio: data.ciudad || p.municipio,
      }));
    });
  }, [user]);

  const soloSobrantes = useMemo(() => cart.length > 0 && cart.every((i) => i.origen === 'SOBRANTE'), [cart]);
  const tipoEntrega = soloSobrantes ? f.tipo_entrega : 'DESPACHO';
  const subtotal = cartSubtotal(cart);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const confirmar = async (e) => {
    e.preventDefault();
    if (!supabase || !user) return;
    if (!cart.length) { setMsg('Tu carrito está vacío.'); return; }
    if (!f.nombre.trim() || !f.telefono.trim()) { setMsg('Nombre y teléfono son obligatorios.'); return; }
    if (tipoEntrega === 'DESPACHO' && (!f.direccion.trim() || !f.municipio.trim())) { setMsg('Indica la dirección y el municipio de entrega.'); return; }
    setBusy(true); setMsg('');
    try {
      await upsertPerfilCliente(user, { nombre: f.nombre.trim(), telefono: f.telefono.trim(), ciudad: f.municipio.trim() });
      const items = cart.map((i) => ({
        oferta_id: i.id, insumo_id: i.insumo_id, nombre: i.nombre, unidad: i.unidad,
        cantidad: Number(i.cantidad), precio: Number(i.precio), origen: i.origen,
        bodega_id: i.bodega_id || null, categoria: i.categoria,
      }));
      const pedido = {
        comprador_id: user.id, user_id: user.id,
        numero: generarNumeroPedido(), items, subtotal, comision: 0, total: subtotal,
        comprador_nombre: f.nombre.trim(), comprador_telefono: f.telefono.trim(), comprador_email: user.email,
        direccion_entrega: tipoEntrega === 'DESPACHO' ? f.direccion.trim() : 'Retiro en sitio',
        municipio_entrega: f.municipio.trim(), tipo_entrega: tipoEntrega, metodo_pago: f.metodo_pago,
        estado: 'PENDIENTE_PAGO', estado_pago: 'pendiente', notas: f.notas.trim() || null,
      };
      const { data: creado, error } = await supabase.from('mk_pedidos').insert({ ...pedido, metodo_pago: 'mercadopago' }).select().single();
      if (error) throw new Error(`No se pudo crear el pedido: ${error.message}`);

      const { error: ep } = await supabase.from('pagos_plataforma').insert({
        user_id: user.id, producto: 'marketplace', moneda: 'COP', monto: subtotal,
        proveedor: 'mercadopago', estado: 'pendiente', mk_pedido_id: creado.id,
      });
      if (ep) console.warn('pagos_plataforma:', ep.message);

      const token = await getAccessToken();
      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pedidoId: creado.id }),
      });
      const out = await res.json().catch(() => ({}));
      const redirectUrl = out.init_point || out.url;
      if (redirectUrl) {
        writeCart([]);
        window.location.href = redirectUrl;
        return;
      }

      throw new Error(out.mensaje || out.error || 'No se pudo iniciar la pasarela de Mercado Pago.');
    } catch (err) {
      setMsg(err.message || 'No se pudo completar el pedido.');
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <TiendaHeader />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px 64px' }}>
        <a href="/marketplace" style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}>← Seguir comprando</a>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '10px 0 20px' }}>Finalizar compra</h1>

        {!authReady ? (
          <div style={ui.card}>Cargando…</div>
        ) : !user ? (
          <AuthBox onAuthed={setUser} titulo="Crea tu cuenta para comprar" />
        ) : cart.length === 0 ? (
          <div style={{ ...ui.card, textAlign: 'center' }}>
            Tu carrito está vacío. <a href="/marketplace" style={{ color: '#2563eb' }}>Ir a la tienda</a>
          </div>
        ) : (
          <form onSubmit={confirmar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
            <section style={{ ...ui.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Datos de entrega</h2>
              <div><label style={ui.label}>Nombre completo</label><input style={ui.input} value={f.nombre} onChange={set('nombre')} required /></div>
              <div><label style={ui.label}>Teléfono / WhatsApp</label><input style={ui.input} value={f.telefono} onChange={set('telefono')} inputMode="tel" required /></div>
              {soloSobrantes && (
                <div>
                  <label style={ui.label}>Tipo de entrega</label>
                  <select style={ui.input} value={f.tipo_entrega} onChange={set('tipo_entrega')}>
                    <option value="DESPACHO">Despacho a domicilio</option>
                    <option value="RETIRO_EN_SITIO">Retiro en la obra</option>
                  </select>
                </div>
              )}
              {tipoEntrega === 'DESPACHO' && (
                <div><label style={ui.label}>Dirección</label><input style={ui.input} value={f.direccion} onChange={set('direccion')} placeholder="Calle, número, barrio" /></div>
              )}
              <div><label style={ui.label}>Municipio</label><input style={ui.input} value={f.municipio} onChange={set('municipio')} /></div>
              <div><label style={ui.label}>Notas (opcional)</label><textarea style={{ ...ui.input, minHeight: 70 }} value={f.notas} onChange={set('notas')} /></div>

              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 0' }}>Método de pago</h2>
              {METODOS.map((m) => (
                <label key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 8, border: '2px solid #2563eb', background: '#eff6ff', cursor: 'pointer' }}>
                  <input type="radio" name="metodo" checked readOnly />
                  <span><strong style={{ fontSize: 14 }}>{m.label}</strong><br /><span style={{ fontSize: 12, color: '#64748b' }}>{m.desc}</span></span>
                </label>
              ))}
            </section>

            <aside style={{ ...ui.card, position: 'sticky', top: 90 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>Resumen del pedido</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {cart.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                    <span style={{ color: '#334155' }}>
                      {i.cantidad} × {i.nombre}
                      <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{i.origen === 'SOBRANTE' ? `Sobrante · ${i.municipio}` : 'Despacho directo'}</span>
                    </span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{fmt(i.precio * i.cantidad)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>Total</span><span>{fmt(subtotal)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 14px' }}>El valor del envío se confirma al coordinar el despacho.</div>
              {msg && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
              <button type="submit" disabled={busy} style={{ ...ui.btnPrimary, width: '100%', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Procesando…' : f.metodo_pago === 'mercadopago' ? 'Pagar con MercadoPago' : 'Confirmar pedido'}
              </button>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Sesión: {user.email}</div>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
