'use client';

/* ============================================================
   Tienda virtual Kalarti — seguimiento del pedido
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  fmt, loadDatosPago, subirComprobante, registrarComprobante, getAccessToken, waNumber,
  ESTADOS_PEDIDO, ESTADO_PEDIDO_LABEL, METODO_PAGO_LABEL, TiendaHeader, AuthBox, ui,
} from '../../_lib/shared';

const ESTADO_PAGO_LABEL = { pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };

export default function PedidoPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [datosPago, setDatosPago] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    loadDatosPago().then(setDatosPago);
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => { setUser(data?.session?.user || null); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const cargar = useCallback(async () => {
    if (!supabase || !id) return;
    const { data } = await supabase.from('mk_pedidos').select('*').eq('id', id).maybeSingle();
    setPedido(data || null);
    setCargando(false);
  }, [id]);

  // Carga el pedido y, si vuelve de MercadoPago, verifica el pago
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      const qs = new URLSearchParams(window.location.search);
      const paymentId = qs.get('payment_id') || qs.get('collection_id');
      if (qs.get('mp') === 'no_disponible') {
        setAviso('MercadoPago no está disponible. Puedes pagar por transferencia o QR Bre-B con los datos de abajo.');
      }
      if (paymentId) {
        try {
          const token = await getAccessToken();
          const r = await fetch(`/api/marketplace/verificar?pedido=${encodeURIComponent(id)}&payment_id=${encodeURIComponent(paymentId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then((x) => x.json());
          if (!vivo) return;
          if (r.status === 'approved') {
            setAviso(r.actualizado?.pedido ? '¡Pago aprobado! Te contactaremos para coordinar la entrega.' : 'Pago aprobado. Nuestro equipo lo confirmará en breve.');
          } else if (r.status === 'pending' || r.status === 'in_process') {
            setAviso('Tu pago está en proceso. Te avisaremos cuando se confirme.');
          } else if (r.status === 'rejected') {
            setAviso('El pago fue rechazado. Puedes intentarlo de nuevo o pagar por transferencia.');
          }
        } catch { /* verificación opcional */ }
      }
      if (vivo) await cargar();
    })();
    return () => { vivo = false; };
  }, [user, id, cargar]);

  const enviarComprobante = async () => {
    if (!archivo || !pedido || !user) return;
    setEnviando(true);
    const url = await subirComprobante(archivo, { userId: user.id, pedidoId: pedido.id });
    if (!url) {
      setAviso('No pudimos subir el archivo. Envíalo por WhatsApp con el botón de abajo.');
      setEnviando(false);
      return;
    }
    await registrarComprobante({ user, pedido, comprobanteUrl: url });
    setAviso('Comprobante recibido. Lo revisaremos y te confirmaremos el pago.');
    setArchivo(null);
    setEnviando(false);
    cargar();
  };

  const pagarMP = async () => {
    const token = await getAccessToken();
    const r = await fetch('/api/marketplace/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ pedidoId: pedido.id }),
    }).then((x) => x.json()).catch(() => ({}));
    if (r.url) window.location.href = r.url;
    else setAviso(r.mensaje || 'MercadoPago no está disponible. Usa transferencia o QR Bre-B.');
  };

  const estadoIdx = pedido ? ESTADOS_PEDIDO.indexOf(pedido.estado === 'PENDIENTE' ? 'PENDIENTE_PAGO' : pedido.estado) : -1;
  const cancelado = pedido?.estado === 'CANCELADO';
  const items = Array.isArray(pedido?.items) ? pedido.items : [];
  const pagoPendiente = pedido && !cancelado && pedido.estado_pago !== 'aprobado';
  const waComprobantes = waNumber(datosPago?.whatsapp_comprobantes);
  const linkComprobante = waComprobantes
    ? `https://wa.me/${waComprobantes}?text=${encodeURIComponent(`Hola Kalarti, envío el comprobante de pago del pedido ${pedido?.numero || ''} por ${fmt(pedido?.total)}.`)}`
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <TiendaHeader />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 64px' }}>
        <a href="/marketplace" style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}>← Volver a la tienda</a>

        {!authReady ? (
          <div style={{ ...ui.card, marginTop: 16 }}>Cargando…</div>
        ) : !user ? (
          <div style={{ marginTop: 16 }}><AuthBox onAuthed={setUser} titulo="Ingresa para ver tu pedido" /></div>
        ) : cargando ? (
          <div style={{ ...ui.card, marginTop: 16 }}>Cargando pedido…</div>
        ) : !pedido ? (
          <div style={{ ...ui.card, marginTop: 16 }}>No encontramos este pedido en tu cuenta.</div>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '12px 0 4px' }}>Pedido {pedido.numero || ''}</h1>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {new Date(pedido.created_at).toLocaleString('es-CO')} · {METODO_PAGO_LABEL[pedido.metodo_pago] || pedido.metodo_pago || '—'} · Pago: {ESTADO_PAGO_LABEL[pedido.estado_pago] || pedido.estado_pago || '—'}
            </div>

            {aviso && <div style={{ ...ui.card, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', marginBottom: 16, padding: 14, fontSize: 14 }}>{aviso}</div>}

            {/* Línea de tiempo */}
            <section style={{ ...ui.card, marginBottom: 16 }}>
              {cancelado ? (
                <div style={{ color: '#b91c1c', fontWeight: 700 }}>Este pedido fue cancelado.</div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                  {ESTADOS_PEDIDO.map((e, i) => {
                    const hecho = i <= estadoIdx;
                    return (
                      <div key={e} style={{ flex: '1 1 110px', textAlign: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 15, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: hecho ? '#2563eb' : '#e2e8f0', color: hecho ? 'white' : '#64748b' }}>
                          {hecho ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: i === estadoIdx ? 800 : 500, color: hecho ? '#0f172a' : '#94a3b8' }}>{ESTADO_PEDIDO_LABEL[e]}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Pago con Mercado Pago (único medio habilitado) */}
            {pagoPendiente && (
              <section style={{ ...ui.card, marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>Pago con Mercado Pago</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: '#334155' }}>
                    Completa el pago seguro de <strong>{fmt(pedido.total)}</strong> mediante Mercado Pago (PSE, Tarjeta débito/crédito, Nequi o Efecty).
                  </span>
                  <button style={ui.btnPrimary} onClick={pagarMP}>
                    💳 Pagar con Mercado Pago
                  </button>
                </div>
              </section>
            )}

            {/* Productos y entrega */}
            <section style={{ ...ui.card, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>Productos</h2>
              {items.map((i, k) => (
                <div key={i.oferta_id || k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                  <span>
                    {i.cantidad} {i.unidad} · {i.nombre}
                    <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{i.origen === 'SOBRANTE' ? 'Sobrante de obra' : 'Despacho directo del proveedor'}</span>
                  </span>
                  <strong>{fmt(Number(i.precio) * Number(i.cantidad))}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 14, color: '#475569' }}><span>Subtotal</span><span>{fmt(pedido.subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 18, fontWeight: 800 }}><span>Total</span><span>{fmt(pedido.total)}</span></div>
            </section>

            <section style={ui.card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>Entrega</h2>
              <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
                <div>{pedido.tipo_entrega === 'RETIRO_EN_SITIO' ? 'Retiro en la obra (te enviaremos la ubicación)' : `${pedido.direccion_entrega || ''}, ${pedido.municipio_entrega || ''}`}</div>
                <div>{pedido.comprador_nombre} · {pedido.comprador_telefono}</div>
                {pedido.notas && <div style={{ color: '#64748b' }}>Notas: {pedido.notas}</div>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
