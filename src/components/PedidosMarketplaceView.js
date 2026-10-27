'use client';

/* ============================================================
   ERP — Pedidos web del Marketplace (tienda Kalarti)
   Dropshipping por comisión: ficha de despacho, proveedor más
   económico, WhatsApp, estados, agenda y margen.
   ============================================================ */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/store/StoreContext';
import { mkPedidosWebService, insumoCotizacionesService } from '@/lib/services';
import { mejorCotizacion, linkWhatsApp } from '@/lib/compras-engine';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);
const num = (v) => Number(v) || 0;

const ESTADOS = [
  { id: 'PENDIENTE_PAGO', label: 'Pago pendiente', color: '#d97706' },
  { id: 'PENDIENTE_CONTACTO', label: 'Pendiente de contacto', color: '#2563eb' },
  { id: 'CONFIRMADO_CON_PROVEEDOR', label: 'Confirmado con proveedor', color: '#7c3aed' },
  { id: 'EN_RUTA', label: 'En ruta', color: '#0891b2' },
  { id: 'ENTREGADO', label: 'Entregado', color: '#16a34a' },
  { id: 'CANCELADO', label: 'Cancelado', color: '#ef4444' },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map((e) => [e.id, e]));
const ESTADOS_PAGO = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en_revision', label: 'En revisión' },
  { id: 'aprobado', label: 'Aprobado' },
  { id: 'rechazado', label: 'Rechazado' },
];
const METODO_LABEL = { mercadopago: 'MercadoPago', transferencia: 'Transferencia', qr_breb: 'QR Bre-B' };
const PROYECTO_CERRADO = ['FINALIZADO', 'CERRADO', 'LIQUIDADO'];

const fmtCant = (n) => (Number.isInteger(num(n)) ? String(num(n)) : num(n).toFixed(2));
const hoyMas = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, Math.ceil(num(dias) || 1)));
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
};

function Badge({ color, children }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{children}</span>;
}

export default function PedidosMarketplaceView() {
  const { state, dispatch } = useStore();
  const [pedidos, setPedidos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [margen, setMargen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [fEstado, setFEstado] = useState('');
  const [fPago, setFPago] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [selId, setSelId] = useState(null);

  const cargar = useCallback(async () => {
    const [p, c, m] = await Promise.all([
      mkPedidosWebService.getAll(),
      insumoCotizacionesService.getAll(),
      mkPedidosWebService.getMargen(),
    ]);
    setPedidos(p || []);
    setCotizaciones(c || []);
    setMargen(m);
    setCargando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.resolve().then(() => vivo && cargar());
    return () => { vivo = false; };
  }, [cargar]);

  const margenMap = useMemo(() => new Map((margen || []).map((m) => [m.id, m])), [margen]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (fEstado && p.estado !== fEstado) return false;
      if (fPago && (p.estado_pago || 'pendiente') !== fPago) return false;
      if (q && !`${p.numero || ''} ${p.comprador_nombre || ''} ${p.comprador_telefono || ''} ${p.municipio_entrega || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pedidos, fEstado, fPago, busqueda]);

  const kpis = useMemo(() => {
    const activos = pedidos.filter((p) => p.estado !== 'CANCELADO');
    const ventas = activos.reduce((s, p) => s + num(p.total), 0);
    const comision = activos.reduce((s, p) => {
      const m = margenMap.get(p.id);
      if (!num(p.costo_proveedor) && !m) return s;
      return s + (m ? num(m.comision) : num(p.total) - num(p.costo_proveedor));
    }, 0);
    return {
      ventas,
      comision,
      pendientesContacto: pedidos.filter((p) => p.estado === 'PENDIENTE_CONTACTO').length,
      pendientesPago: pedidos.filter((p) => p.estado === 'PENDIENTE_PAGO' || p.estado_pago === 'en_revision').length,
    };
  }, [pedidos, margenMap]);

  const seleccionado = pedidos.find((p) => p.id === selId) || null;

  const actualizarLocal = (id, cambios) => {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📦 Pedidos web</h1>
          <div className="page-header-subtitle">Tienda Kalarti · Despacho directo del proveedor y sobrantes de obra</div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setCargando(true); cargar(); }}>↻ Actualizar</button>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { l: 'Ventas', v: fmt(kpis.ventas), c: '#0f172a' },
            { l: 'Comisión', v: fmt(kpis.comision), c: '#16a34a' },
            { l: 'Pendientes de contacto', v: kpis.pendientesContacto, c: '#2563eb' },
            { l: 'Pagos por confirmar', v: kpis.pendientesPago, c: '#d97706' },
          ].map((k) => (
            <div key={k.l} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <input className="form-input" placeholder="Buscar número, cliente o municipio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: 260 }} />
          <select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)} style={{ width: 210 }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <select className="form-select" value={fPago} onChange={(e) => setFPago(e.target.value)} style={{ width: 170 }}>
            <option value="">Todos los pagos</option>
            {ESTADOS_PAGO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <div className="toolbar-spacer" />
          <span style={{ fontSize: 13, color: '#64748b' }}>{filtrados.length} pedidos</span>
        </div>

        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Cargando pedidos…</div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state-icon">📦</div>
            <h3>Sin pedidos</h3>
            <p>Los pedidos de la tienda web aparecerán aquí.</p>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                  {['Pedido', 'Fecha', 'Cliente', 'Municipio', 'Total', 'Comisión', 'Pago', 'Estado', ''].map((h) => <th key={h} style={{ padding: '10px 12px', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => {
                  const e = ESTADO_MAP[p.estado] || { label: p.estado, color: '#64748b' };
                  const m = margenMap.get(p.id);
                  const com = num(p.costo_proveedor) ? (m ? num(m.comision) : num(p.total) - num(p.costo_proveedor)) : null;
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelId(p.id)}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{p.numero}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{p.comprador_nombre || '—'}<div style={{ fontSize: 11, color: '#94a3b8' }}>{p.comprador_telefono}</div></td>
                      <td style={{ padding: '10px 12px' }}>{p.municipio_entrega || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmt(p.total)}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a' }}>{com === null ? '—' : fmt(com)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge color={p.estado_pago === 'aprobado' ? '#16a34a' : p.estado_pago === 'en_revision' ? '#d97706' : p.estado_pago === 'rechazado' ? '#ef4444' : '#64748b'}>
                          {(ESTADOS_PAGO.find((x) => x.id === (p.estado_pago || 'pendiente')) || {}).label || p.estado_pago}
                        </Badge>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{METODO_LABEL[p.metodo_pago] || p.metodo_pago || ''}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}><Badge color={e.color}>{e.label}</Badge></td>
                      <td style={{ padding: '10px 12px' }}><button className="btn btn-primary btn-sm">Ficha</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {seleccionado && (
        <FichaDespacho
          key={seleccionado.id}
          pedido={seleccionado}
          cotizaciones={cotizaciones}
          proveedores={state.proveedores || []}
          bodegas={state.bodegas || []}
          proyectos={state.proyectos || []}
          insumos={state.insumos || []}
          dispatch={dispatch}
          onClose={() => setSelId(null)}
          onUpdated={actualizarLocal}
        />
      )}
    </>
  );
}

/* ─── Ficha de despacho ─── */
function FichaDespacho({ pedido, cotizaciones, proveedores, bodegas, proyectos, insumos, dispatch, onClose, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const items = useMemo(() => (Array.isArray(pedido.items) ? pedido.items : []), [pedido.items]);
  const provMap = useMemo(() => new Map(proveedores.map((p) => [p.id, p])), [proveedores]);
  const insMap = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  // Análisis por ítem: proveedor más económico (catálogo) u obra de origen (sobrante)
  const lineas = useMemo(() => items.map((it) => {
    const cantidad = num(it.cantidad);
    const venta = num(it.precio) * cantidad;
    if (it.origen === 'SOBRANTE') {
      const bodega = bodegas.find((b) => b.id === it.bodega_id) || null;
      const proyecto = bodega ? proyectos.find((p) => p.id === bodega.proyecto_id) || null : null;
      const costoUnit = num(insMap.get(it.insumo_id)?.precio_unitario);
      return { it, cantidad, venta, sobrante: true, bodega, proyecto, costoUnit, costo: 0 };
    }
    const mc = mejorCotizacion({ insumoId: it.insumo_id, cantidad, municipioDestino: pedido.municipio_entrega, cotizaciones, proveedores });
    const prov = mc?.proveedor_id ? provMap.get(mc.proveedor_id) : null;
    const costo = mc ? mc.precio * cantidad : 0;
    return { it, cantidad, venta, sobrante: false, mc, prov, costo, comision: mc ? venta - costo : null };
  }), [items, bodegas, proyectos, insMap, pedido.municipio_entrega, cotizaciones, proveedores, provMap]);

  const costoTotal = lineas.reduce((s, l) => s + l.costo, 0);
  const ventaCatalogo = lineas.filter((l) => !l.sobrante).reduce((s, l) => s + l.venta, 0);
  const sinCotizacion = lineas.filter((l) => !l.sobrante && !l.mc).length;

  // Agrupar ítems de catálogo por proveedor (un WhatsApp por proveedor)
  const porProveedor = useMemo(() => {
    const m = new Map();
    lineas.filter((l) => !l.sobrante && l.mc).forEach((l) => {
      const k = l.mc.proveedor_id || l.mc.proveedor_nombre;
      if (!m.has(k)) m.set(k, { id: l.mc.proveedor_id, nombre: l.prov?.nombre || l.mc.proveedor_nombre, telefono: l.prov?.whatsapp || l.prov?.telefono || l.mc.whatsapp, contacto: l.prov?.contacto || l.mc.contacto, dias: num(l.prov?.tiempo_entrega_dias ?? l.mc.tiempo_entrega_dias), lineas: [], costo: 0 });
      const g = m.get(k);
      g.lineas.push(l);
      g.costo += l.costo;
    });
    return [...m.values()];
  }, [lineas]);
  const proveedorPrincipal = porProveedor.slice().sort((a, b) => b.costo - a.costo)[0] || null;

  // Destino contable de los sobrantes
  const primerSobrante = lineas.find((l) => l.sobrante);
  const proyectoOrigen = primerSobrante?.proyecto || null;
  const destinoDefault = proyectoOrigen && (proyectoOrigen.liquidado || PROYECTO_CERRADO.includes(String(proyectoOrigen.estado || '').toUpperCase())) ? 'KALARTI' : 'OBRA';
  const [destino, setDestino] = useState(pedido.destino_contable || destinoDefault);

  const direccion = pedido.tipo_entrega === 'RETIRO_EN_SITIO' ? 'retiro en sitio' : [pedido.direccion_entrega, pedido.municipio_entrega].filter(Boolean).join(', ');
  const mensajeProveedor = (g) => {
    const lista = g.lineas.map((l) => `${fmtCant(l.cantidad)} ${l.it.unidad || 'und'} ${l.it.nombre}`).join(', ');
    return `Hola ${g.nombre || ''}, requiero despachar ${lista} a la dirección ${direccion} para el cliente ${pedido.comprador_nombre || ''}, ${pedido.comprador_telefono || ''}. Confírmame disponibilidad y valor. Pedido ${pedido.numero || ''}.`;
  };
  const mensajeCliente = `Hola ${pedido.comprador_nombre || ''}, te saludamos de Kalarti sobre tu pedido ${pedido.numero || ''} por ${fmt(pedido.total)}. Estado: ${(ESTADO_MAP[pedido.estado] || {}).label || pedido.estado}.`;

  const datosBase = () => ({
    costo_proveedor: Math.round(costoTotal),
    proveedor_id: proveedorPrincipal?.id || pedido.proveedor_id || null,
    ...(primerSobrante ? { destino_contable: destino, proyecto_origen_id: proyectoOrigen?.id || null } : {}),
  });

  const guardar = async (cambios, okMsg) => {
    setBusy(true); setMsg('');
    try {
      const saved = await mkPedidosWebService.update(pedido.id, cambios);
      if (!saved) throw new Error('Sin permisos para actualizar el pedido (verifica que tu perfil sea de personal Kalarti).');
      onUpdated(pedido.id, cambios);
      setMsg(okMsg || 'Guardado.');
      return true;
    } catch (e) {
      setMsg(`Error: ${e.message}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmarPago = async () => {
    const cambios = { estado_pago: 'aprobado', ...(pedido.estado === 'PENDIENTE_PAGO' || pedido.estado === 'PENDIENTE' ? { estado: 'PENDIENTE_CONTACTO' } : {}) };
    if (!(await guardar(cambios, 'Pago confirmado.'))) return;
    try {
      const r = await mkPedidosWebService.updatePagos(pedido.id, { estado: 'aprobado' });
      if (!r || r.length === 0) setMsg('Pago confirmado en el pedido. El registro en pagos_plataforma requiere permisos de administrador.');
    } catch { setMsg('Pago confirmado en el pedido. No se pudo actualizar pagos_plataforma.'); }
  };

  const confirmarProveedor = async () => {
    if (!(await guardar({ ...datosBase(), estado: 'CONFIRMADO_CON_PROVEEDOR' }, 'Confirmado con proveedor. Despacho agendado.'))) return;
    const resumen = items.map((i) => `${fmtCant(i.cantidad)} ${i.unidad || ''} ${i.nombre}`.trim()).join(', ');
    const grupos = porProveedor.length ? porProveedor : [null];
    grupos.forEach((g) => {
      dispatch({
        type: 'ADD_POS_AGENDA',
        payload: {
          ambito: 'COMERCIAL',
          tipo: 'DESPACHO',
          mk_pedido_id: pedido.id,
          proveedor_id: g?.id || null,
          bodega_id: primerSobrante?.it?.bodega_id || null,
          fecha_programada: hoyMas(g?.dias || 1),
          titulo: `Despacho pedido ${pedido.numero || ''}${g?.nombre ? ` · ${g.nombre}` : ''}`,
          descripcion: g ? g.lineas.map((l) => `${fmtCant(l.cantidad)} ${l.it.unidad || ''} ${l.it.nombre}`).join(', ') : resumen,
          contacto_nombre: pedido.comprador_nombre || null,
          contacto_telefono: pedido.comprador_telefono || null,
          direccion: direccion || null,
          estado: 'PENDIENTE',
          prioridad: 'ALTA',
        },
      });
    });
  };

  const entregar = async () => {
    if (!window.confirm('¿Marcar el pedido como entregado? Se registrará la salida de inventario de los sobrantes.')) return;
    if (!(await guardar({ ...datosBase(), estado: 'ENTREGADO' }, 'Pedido entregado.'))) return;
    const errores = [];
    for (const l of lineas.filter((x) => x.sobrante && x.it.bodega_id && x.it.insumo_id)) {
      try {
        await mkPedidosWebService.registrarSalidaVenta({ bodega_id: l.it.bodega_id, insumo_id: l.it.insumo_id, cantidad: l.cantidad, costo_unitario: l.costoUnit || null, numero: pedido.numero });
      } catch (e) { errores.push(`${l.it.nombre}: ${e.message}`); }
    }
    if (errores.length) setMsg(`Entregado. Revisa la salida de inventario: ${errores.join('; ')}`);
  };

  const cancelar = async () => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    guardar({ estado: 'CANCELADO' }, 'Pedido cancelado.');
  };

  const waCliente = linkWhatsApp(pedido.comprador_telefono, mensajeCliente);
  const e = ESTADO_MAP[pedido.estado] || { label: pedido.estado, color: '#64748b' };
  const cerrado = pedido.estado === 'ENTREGADO' || pedido.estado === 'CANCELADO';
  const box = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 920, width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Ficha de despacho · {pedido.numero}</h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              <Badge color={e.color}>{e.label}</Badge>{' '}
              Pago: {(ESTADOS_PAGO.find((x) => x.id === (pedido.estado_pago || 'pendiente')) || {}).label} · {METODO_LABEL[pedido.metodo_pago] || pedido.metodo_pago || '—'}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cliente */}
          <div style={{ ...box, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 13 }}>
            <div><strong>Cliente:</strong> {pedido.comprador_nombre || '—'}</div>
            <div><strong>Teléfono:</strong> {pedido.comprador_telefono || '—'}</div>
            <div><strong>Correo:</strong> {pedido.comprador_email || '—'}</div>
            <div><strong>Entrega:</strong> {pedido.tipo_entrega === 'RETIRO_EN_SITIO' ? 'Retiro en sitio' : direccion || '—'}</div>
            {pedido.notas && <div style={{ gridColumn: '1 / -1' }}><strong>Notas:</strong> {pedido.notas}</div>}
          </div>

          {/* Ítems */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
                  {['Producto', 'Cant.', 'Precio web', 'Origen / proveedor', 'Costo', 'Comisión'].map((h) => <th key={h} style={{ padding: '8px 10px' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, k) => (
                  <tr key={l.it.oferta_id || k} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{l.it.nombre}<div style={{ fontWeight: 400, color: '#94a3b8' }}>{l.it.categoria}</div></td>
                    <td style={{ padding: '8px 10px' }}>{fmtCant(l.cantidad)} {l.it.unidad}</td>
                    <td style={{ padding: '8px 10px' }}>{fmt(l.venta)}<div style={{ color: '#94a3b8' }}>{fmt(l.it.precio)} c/u</div></td>
                    <td style={{ padding: '8px 10px' }}>
                      {l.sobrante ? (
                        <>
                          <Badge color="#92400e">Sobrante de obra</Badge>
                          <div style={{ marginTop: 4 }}>{l.bodega?.nombre || 'Bodega sin identificar'}</div>
                          <div style={{ color: '#64748b' }}>{l.proyecto?.nombre || '—'} · 📍 {l.bodega?.municipio || '—'}</div>
                        </>
                      ) : l.mc ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{l.prov?.nombre || l.mc.proveedor_nombre}</div>
                          <div style={{ color: '#64748b' }}>
                            {l.prov?.contacto || l.mc.contacto || ''} {l.prov?.whatsapp || l.prov?.telefono || l.mc.whatsapp || ''}
                          </div>
                          <div style={{ color: '#64748b' }}>Entrega {num(l.prov?.tiempo_entrega_dias ?? l.mc.tiempo_entrega_dias) || 1} día(s){l.mc.alternativas > 1 ? ` · ${l.mc.alternativas} cotizaciones` : ''}{!l.mc.cubre_municipio ? ' · sin cobertura declarada' : ''}</div>
                        </>
                      ) : (
                        <span style={{ color: '#b91c1c' }}>Sin cotización de proveedor</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {l.sobrante ? <span style={{ color: '#64748b' }}>Inventario {l.costoUnit ? fmt(l.costoUnit * l.cantidad) : '—'}</span> : l.mc ? <>{fmt(l.costo)}<div style={{ color: '#94a3b8' }}>{fmt(l.mc.precio)} c/u</div></> : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: l.sobrante ? '#64748b' : l.comision >= 0 ? '#16a34a' : '#ef4444' }}>
                      {l.sobrante ? 'Ingreso de obra' : l.comision === null ? '—' : fmt(l.comision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de margen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={box}><div style={{ fontSize: 11, color: '#64748b' }}>Precio web (total)</div><div style={{ fontSize: 18, fontWeight: 800 }}>{fmt(pedido.total)}</div></div>
            <div style={box}><div style={{ fontSize: 11, color: '#64748b' }}>Costo proveedor</div><div style={{ fontSize: 18, fontWeight: 800 }}>{fmt(costoTotal)}</div></div>
            <div style={box}>
              <div style={{ fontSize: 11, color: '#64748b' }}>Comisión catálogo</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmt(ventaCatalogo - costoTotal)}</div>
              {ventaCatalogo > 0 && <div style={{ fontSize: 11, color: '#64748b' }}>{(((ventaCatalogo - costoTotal) / ventaCatalogo) * 100).toFixed(1)}% de margen</div>}
            </div>
            {primerSobrante && (
              <div style={box}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Destino contable (sobrantes)</div>
                <select className="form-select" value={destino} onChange={(ev) => setDestino(ev.target.value)} disabled={cerrado}>
                  <option value="OBRA">Ingreso a la obra{proyectoOrigen ? ` (${proyectoOrigen.nombre})` : ''}</option>
                  <option value="KALARTI">Ingreso a Kalarti</option>
                </select>
              </div>
            )}
          </div>
          {sinCotizacion > 0 && <div style={{ fontSize: 12, color: '#b91c1c' }}>{sinCotizacion} producto(s) sin cotización: registra el costo con el proveedor antes de confirmar.</div>}

          {/* WhatsApp */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {porProveedor.map((g) => {
              const link = linkWhatsApp(g.telefono, mensajeProveedor(g));
              return link ? (
                <a key={g.id || g.nombre} href={link} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none', color: '#15803d' }}>
                  💬 WhatsApp a {g.nombre}
                </a>
              ) : (
                <span key={g.id || g.nombre} style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{g.nombre}: sin WhatsApp registrado</span>
              );
            })}
            {waCliente && (
              <a href={waCliente} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none' }}>💬 WhatsApp al cliente</a>
            )}
          </div>

          {msg && <div style={{ fontSize: 13, color: msg.startsWith('Error') ? '#b91c1c' : '#15803d' }}>{msg}</div>}
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
          {!cerrado && pedido.estado_pago !== 'aprobado' && (
            <button className="btn btn-primary" disabled={busy} onClick={confirmarPago}>✓ Confirmar pago</button>
          )}
          {!cerrado && ['PENDIENTE_CONTACTO', 'PENDIENTE_PAGO', 'PENDIENTE'].includes(pedido.estado) && (
            <button className="btn btn-primary" disabled={busy} onClick={confirmarProveedor}>Confirmado con proveedor</button>
          )}
          {pedido.estado === 'CONFIRMADO_CON_PROVEEDOR' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => guardar({ ...datosBase(), estado: 'EN_RUTA' }, 'Pedido en ruta.')}>🚚 En ruta</button>
          )}
          {['CONFIRMADO_CON_PROVEEDOR', 'EN_RUTA'].includes(pedido.estado) && (
            <button className="btn btn-primary" disabled={busy} onClick={entregar}>📦 Entregado</button>
          )}
          {!cerrado && (
            <button className="btn btn-secondary" disabled={busy} onClick={() => guardar(datosBase(), 'Costos y destino guardados.')}>Guardar costos</button>
          )}
          {!cerrado && (
            <button className="btn btn-secondary" disabled={busy} onClick={cancelar} style={{ color: '#ef4444' }}>Cancelar pedido</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
