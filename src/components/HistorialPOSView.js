'use client';

import { useState, useMemo, Fragment } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const TIPO_CONFIG = {
  VENTA_DIRECTA: { icon: '💰', label: 'Venta', color: '#16a34a', bg: '#dcfce7' },
  TRASPASO: { icon: '🔄', label: 'Traspaso', color: '#2563eb', bg: '#dbeafe' },
  DEVOLUCION: { icon: '🔁', label: 'Devolución', color: '#d97706', bg: '#fef3c7' },
  INGRESO: { icon: '📥', label: 'Ingreso', color: '#7c3aed', bg: '#f3e8ff' },
};

const ESTADO_COLORS = {
  ENTREGADO: '#16a34a', EN_TRANSITO: '#2563eb', PENDIENTE: '#d97706', CANCELADO: '#ef4444',
};

export default function HistorialPOSView() {
  const { state } = useStore();
  const { user } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroPV, setFiltroPV] = useState('TODOS');
  const [expandedId, setExpandedId] = useState(null);

  const userTiendas = state.mkTiendas.filter(t => t.user_id === user?.id);
  const [selectedTiendaId, setSelectedTiendaId] = useState('TODAS');
  const selectedTienda = userTiendas.find(t => t.id === selectedTiendaId) || null;
  const puntosVenta = state.mkPuntosVenta.filter(p => selectedTiendaId === 'TODAS' ? userTiendas.some(t => t.id === p.tienda_id) : p.tienda_id === selectedTiendaId);

  const operaciones = useMemo(() => {
    let ops = state.mkPedidos
      .filter(p => selectedTiendaId === 'TODAS' ? userTiendas.some(t => t.id === p.tienda_id) : p.tienda_id === selectedTiendaId)
      .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));

    if (filtroTipo !== 'TODOS') ops = ops.filter(o => o.tipo === filtroTipo);
    if (filtroPV !== 'TODOS') ops = ops.filter(o => o.punto_venta_id === filtroPV);
    return ops;
  }, [state.mkPedidos, selectedTienda, filtroTipo, filtroPV]);

  // Resumen
  const resumen = useMemo(() => {
    const all = state.mkPedidos.filter(p => selectedTiendaId === 'TODAS' ? userTiendas.some(t => t.id === p.tienda_id) : p.tienda_id === selectedTiendaId);
    const ventas = all.filter(o => o.tipo === 'VENTA_DIRECTA');
    const traspasos = all.filter(o => o.tipo === 'TRASPASO');
    const devoluciones = all.filter(o => o.tipo === 'DEVOLUCION');
    const ingresos = all.filter(o => o.tipo === 'INGRESO');
    return {
      totalVentas: ventas.reduce((s, o) => s + (o.total || 0), 0),
      countVentas: ventas.length,
      countTraspasos: traspasos.length,
      countDevoluciones: devoluciones.length,
      countIngresos: ingresos.length,
      totalDevoluciones: devoluciones.reduce((s, o) => s + Math.abs(o.total || 0), 0),
    };
  }, [state.mkPedidos, selectedTienda]);

  if (userTiendas.length === 0) {
    return (
      <>
        <div className="page-header"><div><h1>📋 Historial POS</h1></div></div>
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon">🏪</div>
          <h3>Sin tienda registrada</h3>
          <p>Crea tu tienda en el módulo de Punto de Venta para empezar.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📋 Historial POS {selectedTienda ? `— ${selectedTienda.nombre}` : ''}</h1>
          <div className="page-header-subtitle">Registro completo de operaciones: ventas, traspasos, devoluciones e ingresos</div>
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { label: 'Ventas', value: fmt(resumen.totalVentas), sub: `${resumen.countVentas} operaciones`, color: '#16a34a', bg: '#dcfce7', icon: '💰' },
            { label: 'Ingresos', value: resumen.countIngresos, sub: 'compras y traspasos', color: '#7c3aed', bg: '#f3e8ff', icon: '📥' },
            { label: 'Traspasos', value: resumen.countTraspasos, sub: 'entre sucursales', color: '#2563eb', bg: '#dbeafe', icon: '🔄' },
            { label: 'Devoluciones', value: fmt(resumen.totalDevoluciones), sub: `${resumen.countDevoluciones} operaciones`, color: '#d97706', bg: '#fef3c7', icon: '🔁' },
          ].map((kpi, idx) => (
            <div key={idx} style={{
              padding: '14px 16px', borderRadius: 10, background: kpi.bg, border: `1px solid ${kpi.color}22`,
            }}>
              <div style={{ fontSize: 11, color: kpi.color, fontWeight: 600, marginBottom: 4 }}>{kpi.icon} {kpi.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 10, color: kpi.color, opacity: 0.7 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <select className="form-select" style={{ maxWidth: 180 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="TODOS">Todos los tipos</option>
            <option value="VENTA_DIRECTA">💰 Ventas</option>
            <option value="INGRESO">📥 Ingresos</option>
            <option value="TRASPASO">🔄 Traspasos</option>
            <option value="DEVOLUCION">🔁 Devoluciones</option>
          </select>
          {userTiendas.length > 1 && (
            <select className="form-select" style={{ maxWidth: 200 }} value={selectedTiendaId} onChange={e => { setSelectedTiendaId(e.target.value); setFiltroPV('TODOS'); }}>
              <option value="TODAS">🏪 Todas las tiendas</option>
              {userTiendas.map(t => <option key={t.id} value={t.id}>🏪 {t.nombre}</option>)}
            </select>
          )}
          <select className="form-select" style={{ maxWidth: 200 }} value={filtroPV} onChange={e => setFiltroPV(e.target.value)}>
            <option value="TODOS">📍 Todos los puntos de venta</option>
            {puntosVenta.map(pv => <option key={pv.id} value={pv.id}>📍 {pv.nombre}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{operaciones.length} registros</span>
        </div>

        {/* Tabla */}
        {operaciones.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state-icon">📋</div>
            <h3>Sin operaciones</h3>
            <p>Realiza ventas, traspasos o ingresos desde el Punto de Venta.</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Punto de Venta</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.map(op => {
                  const cfg = TIPO_CONFIG[op.tipo] || { icon: '📄', label: op.tipo, color: '#64748b', bg: '#f1f5f9' };
                  const pv = puntosVenta.find(p => p.id === op.punto_venta_id);
                  const itemCount = Array.isArray(op.items) ? op.items.length : 0;
                  const fecha = op.fecha
                    ? new Date(op.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const isExpanded = expandedId === op.id;

                  return (
                    <Fragment key={op.id}>
                      <tr key={op.id} onClick={() => setExpandedId(isExpanded ? null : op.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 11 }}>📍 {pv?.nombre || '—'}</td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{fecha}</td>
                        <td style={{ fontSize: 11 }}>
                          {itemCount} producto{itemCount !== 1 ? 's' : ''}
                          {op.cliente_nombre && <span style={{ color: '#94a3b8' }}> · {op.cliente_nombre}</span>}
                          {op.proveedor && <span style={{ color: '#7c3aed' }}> · Prov: {op.proveedor}</span>}
                          {op.metodo_ingreso && <span style={{ color: '#64748b' }}> · {op.metodo_ingreso}</span>}
                          {op.metodo_pago && <span style={{ color: '#64748b' }}> · {op.metodo_pago}</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: 'white', background: ESTADO_COLORS[op.estado] || '#94a3b8' }}>
                            {op.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: op.tipo === 'DEVOLUCION' ? '#d97706' : '#1e293b' }}>
                          {op.tipo === 'DEVOLUCION' ? '-' : ''}{fmt(Math.abs(op.total || 0))}
                        </td>
                      </tr>
                      {/* Row expandida con detalle */}
                      {isExpanded && Array.isArray(op.items) && op.items.length > 0 && (
                        <tr key={`${op.id}-detail`}>
                          <td colSpan={6} style={{ background: '#f8fafc', padding: '8px 20px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>DETALLE DE ITEMS</div>
                            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 600, color: '#94a3b8' }}>Producto</th>
                                  <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 600, color: '#94a3b8' }}>Cant.</th>
                                  <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 600, color: '#94a3b8' }}>P. Unit</th>
                                  <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 600, color: '#94a3b8' }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {op.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '3px 6px' }}>{item.nombre || '—'}</td>
                                    <td style={{ textAlign: 'right', padding: '3px 6px' }}>{item.cantidad}</td>
                                    <td style={{ textAlign: 'right', padding: '3px 6px' }}>{item.precio ? fmt(item.precio) : '—'}</td>
                                    <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 600 }}>{item.subtotal ? fmt(item.subtotal) : item.precio ? fmt(item.precio * item.cantidad) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {op.motivo && <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>📝 Motivo: {op.motivo}</div>}
                            {op.origen_nombre && <div style={{ marginTop: 4, fontSize: 10, color: '#7c3aed' }}>📍 Origen: {op.origen_nombre}</div>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
