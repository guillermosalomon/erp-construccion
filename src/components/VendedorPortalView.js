'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function VendedorPortalView() {
  const { user, logout } = useAuth();
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('inicio');
  const [showVenta, setShowVenta] = useState(false);
  const [showIngreso, setShowIngreso] = useState(false);
  const [showTraspaso, setShowTraspaso] = useState(false);
  const [showDevolucion, setShowDevolucion] = useState(false);
  const [ventaSearch, setVentaSearch] = useState('');
  const [ventaItems, setVentaItems] = useState([]);
  const [ingresoSearch, setIngresoSearch] = useState('');
  const [ingresoItems, setIngresoItems] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  const myProfile = state.personal.find(p => 
    (p.email?.toLowerCase() === user?.email?.toLowerCase()) || 
    (p.user_id === user?.id)
  );
  
  // Obtener puntos de venta asignados en la tabla personalProyecto
  const myPVAssignments = useMemo(() => {
    if (!myProfile) return [];
    return state.personalProyecto.filter(ap => String(ap.personal_id) === String(myProfile.id) && ap.punto_venta_id);
  }, [state.personalProyecto, myProfile]);

  const puntosVenta = useMemo(() => {
    const ids = [...new Set(myPVAssignments.map(ap => ap.punto_venta_id))];
    return state.mkPuntosVenta.filter(pv => ids.includes(pv.id));
  }, [state.mkPuntosVenta, myPVAssignments]);

  const [selectedPVId, setSelectedPVId] = useState('');
  const selectedPV = useMemo(() => 
    puntosVenta.find(p => p.id === selectedPVId) || puntosVenta[0],
  [puntosVenta, selectedPVId]);

  const tienda = useMemo(() => 
    state.mkTiendas.find(t => t.id === selectedPV?.tienda_id),
  [state.mkTiendas, selectedPV]);

  const ofertas = useMemo(() =>
    state.mkOfertas.filter(o => selectedPV && o.punto_venta_id === selectedPV.id && o.activo !== false),
  [state.mkOfertas, selectedPV]);

  const pedidos = useMemo(() =>
    state.mkPedidos.filter(p => selectedPV && p.punto_venta_id === selectedPV.id)
      .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at)),
  [state.mkPedidos, selectedPV]);

  const totalStock = ofertas.reduce((s, o) => s + (o.stock_disponible || 0), 0);
  const ventasHoy = pedidos.filter(p => p.tipo === 'VENTA_DIRECTA' && p.fecha?.startsWith(new Date().toISOString().slice(0, 10)));
  const totalVentasHoy = ventasHoy.reduce((s, p) => s + (p.total || 0), 0);

  // Venta rápida
  const ventaFiltered = ofertas.filter(o => !ventaSearch || o.nombre_comercial?.toLowerCase().includes(ventaSearch.toLowerCase()));
  const addVentaItem = (o) => {
    if (ventaItems.find(i => i.id === o.id)) return;
    setVentaItems([...ventaItems, { id: o.id, insumo_id: o.insumo_id, nombre: o.nombre_comercial, precio: o.precio_venta, cantidad: 1, stock: o.stock_disponible || 0 }]);
  };
  const ventaTotal = ventaItems.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const handleVenta = () => {
    if (ventaItems.length === 0) return;
    ventaItems.forEach(item => {
      const oferta = ofertas.find(o => o.id === item.id);
      if (oferta) dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, stock_disponible: Math.max(0, (oferta.stock_disponible || 0) - item.cantidad) } });
    });
    dispatch({ type: 'ADD_MK_PEDIDO', payload: {
      tienda_id: tienda?.id, punto_venta_id: selectedPV?.id, tipo: 'VENTA_DIRECTA', estado: 'ENTREGADO', metodo_pago: metodoPago,
      usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Vendedor',
      subtotal: ventaTotal, iva: Math.round(ventaTotal * 0.19), total: Math.round(ventaTotal * 1.19),
      items: ventaItems.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
      fecha: new Date().toISOString(),
    }});
    setVentaItems([]); setVentaSearch(''); setShowVenta(false);
  };

  // Ingreso rápido
  const ingresoFiltered = ofertas.filter(o => !ingresoSearch || o.nombre_comercial?.toLowerCase().includes(ingresoSearch.toLowerCase()));
  const addIngresoItem = (o) => {
    if (ingresoItems.find(i => i.id === o.id)) return;
    setIngresoItems([...ingresoItems, { id: o.id, insumo_id: o.insumo_id, nombre: o.nombre_comercial, cantidad: 1, costo: o.precio_compra || 0 }]);
  };

  const handleIngreso = () => {
    if (ingresoItems.length === 0) return;
    ingresoItems.forEach(item => {
      dispatch({ type: 'UPDATE_MK_OFERTA_STOCK', payload: { id: item.id, qty: item.cantidad } });
    });
    dispatch({ type: 'ADD_MK_PEDIDO', payload: {
      tienda_id: tienda?.id, punto_venta_id: selectedPV?.id, tipo: 'INGRESO', estado: 'ENTREGADO', metodo_ingreso: 'COMPRA',
      usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Vendedor',
      subtotal: ingresoItems.reduce((s, i) => s + i.costo * i.cantidad, 0), comision: 0,
      total: ingresoItems.reduce((s, i) => s + i.costo * i.cantidad, 0),
      items: ingresoItems.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.costo })),
      fecha: new Date().toISOString(),
    }});
    setIngresoItems([]); setIngresoSearch(''); setShowIngreso(false);
  };

  // Traspaso
  const [traspasoSearch, setTraspasoSearch] = useState('');
  const [traspasoItems, setTraspasoItems] = useState([]);
  const [targetPVId, setTargetPVId] = useState('');

  const handleTraspaso = () => {
    if (traspasoItems.length === 0 || !targetPVId) return;
    traspasoItems.forEach(item => {
      const oferta = ofertas.find(o => o.id === item.id);
      if (oferta) {
        dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, stock_disponible: Math.max(0, (oferta.stock_disponible || 0) - item.cantidad) } });
        // En un sistema real, aquí también actualizaríamos el stock en el destino
      }
    });
    dispatch({ type: 'ADD_MK_PEDIDO', payload: {
      tienda_id: tienda?.id, punto_venta_id: selectedPV?.id, target_pv_id: targetPVId, tipo: 'TRASPASO', estado: 'ENTREGADO',
      usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Vendedor',
      subtotal: 0, total: 0,
      items: traspasoItems.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: 0 })),
      fecha: new Date().toISOString(),
    }});
    setTraspasoItems([]); setTraspasoSearch(''); setShowTraspaso(false);
  };

  // Devolución
  const [devolucionSearch, setDevolucionSearch] = useState('');
  const [devolucionItems, setDevolucionItems] = useState([]);

  const handleDevolucion = () => {
    if (devolucionItems.length === 0) return;
    devolucionItems.forEach(item => {
      const oferta = ofertas.find(o => o.id === item.id);
      if (oferta) {
        dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: oferta.id, stock_disponible: (oferta.stock_disponible || 0) + item.cantidad } });
      }
    });
    const devTotal = devolucionItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
    dispatch({ type: 'ADD_MK_PEDIDO', payload: {
      tienda_id: tienda?.id, punto_venta_id: selectedPV?.id, tipo: 'DEVOLUCION', estado: 'ENTREGADO',
      usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Vendedor',
      subtotal: devTotal, total: devTotal,
      items: devolucionItems.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
      fecha: new Date().toISOString(),
    }});
    setDevolucionItems([]); setDevolucionSearch(''); setShowDevolucion(false);
  };

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Vendedor';

  const tipoConfig = {
    VENTA_DIRECTA: { icon: '💰', label: 'Venta', color: '#16a34a', bg: '#dcfce7' },
    TRASPASO: { icon: '🔄', label: 'Traspaso', color: '#2563eb', bg: '#dbeafe' },
    DEVOLUCION: { icon: '🔁', label: 'Devolución', color: '#d97706', bg: '#fef3c7' },
    INGRESO: { icon: '📥', label: 'Ingreso', color: '#7c3aed', bg: '#f3e8ff' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: 'white', padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{myProfile?.profesion || 'Vendedor'}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{myProfile?.nombres || myProfile?.nombre || nombre}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{tienda?.nombre || 'Sin tienda asignada'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
        {puntosVenta.length > 0 ? (
          <select value={selectedPVId || selectedPV?.id || ''} onChange={e => setSelectedPVId(e.target.value)}
            style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}>
            <option value="" disabled>Seleccionar Punto de Venta...</option>
            {puntosVenta.map(pv => {
              const t = state.mkTiendas.find(st => st.id === pv.tienda_id);
              return <option key={pv.id} value={pv.id} style={{ color: '#1e293b' }}>{t?.nombre} — {pv.nombre}</option>;
            })}
          </select>
        ) : (
          <div style={{ marginTop: 12, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', fontSize: 12, textAlign: 'center' }}>
            ⚠️ No tienes puntos de venta asignados.
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 16px' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Productos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{ofertas.length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Stock Total</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{totalStock}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Ventas Hoy</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmt(totalVentasHoy)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      {tab === 'inicio' && (
        <div style={{ padding: '0 16px 14px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', paddingBottom: 4 }}>
            <button onClick={() => setShowVenta(true)} style={{ 
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', 
              background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' 
            }}>
              <span style={{ fontSize: 16 }}>💰</span> Venta
            </button>
            <button onClick={() => setShowTraspaso(true)} style={{ 
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', 
              background: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' 
            }}>
              <span style={{ fontSize: 16 }}>🔄</span> Traspaso
            </button>
            <button onClick={() => setShowDevolucion(true)} style={{ 
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', 
              background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' 
            }}>
              <span style={{ fontSize: 16 }}>🔁</span> Devolución
            </button>
            <button onClick={() => setShowIngreso(true)} style={{ 
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', 
              background: '#f3e8ff', color: '#6b21a8', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' 
            }}>
              <span style={{ fontSize: 16 }}>📥</span> Ingreso
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '0 16px 80px' }}>
        {tab === 'inicio' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📦 Inventario — {selectedPV?.nombre}</div>
            {ofertas.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin productos. Agrega desde el panel de administración.</div>
            ) : ofertas.map(o => (
              <div key={o.id} style={{ background: 'white', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{o.nombre_comercial}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{o.marca || ''} {o.codigo_propio ? `· ${o.codigo_propio}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{fmt(o.precio_venta)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: (o.stock_disponible || 0) > 0 ? '#16a34a' : '#ef4444' }}>
                    Stock: {o.stock_disponible || 0}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'historial' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📋 Historial de Movimientos</div>
            {pedidos.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin movimientos registrados.</div>
            ) : pedidos.slice(0, 30).map(op => {
              const cfg = tipoConfig[op.tipo] || { icon: '📄', label: op.tipo, color: '#64748b', bg: '#f1f5f9' };
              const fecha = op.fecha ? new Date(op.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
              return (
                <div key={op.id} style={{ background: 'white', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{fecha}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{op.usuario_nombre || '—'} · {Array.isArray(op.items) ? op.items.length : 0} items</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: op.tipo === 'DEVOLUCION' ? '#d97706' : '#1e293b' }}>
                    {op.tipo === 'DEVOLUCION' ? '-' : ''}{fmt(Math.abs(op.total || 0))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'pedidos' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📦 Pedidos del Marketplace</div>
            {(() => {
              const pedidosMk = state.mkPedidos.filter(p => p.tienda_id === tienda?.id && p.comprador_id).sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));
              if (pedidosMk.length === 0) return <div style={{ background: 'white', borderRadius: 12, padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin pedidos del marketplace.</div>;
              return pedidosMk.slice(0, 20).map(p => (
                <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: p.estado === 'PENDIENTE' ? '#fef3c7' : '#dcfce7', color: p.estado === 'PENDIENTE' ? '#92400e' : '#166534' }}>{p.estado}</span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{fmt(p.total || 0)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{Array.isArray(p.items) ? p.items.length : 0} productos · {p.fecha ? new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}</div>
                </div>
              ));
            })()}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', padding: '8px 0 12px', zIndex: 100 }}>
        {[['inicio', '🏪', 'Mi Tienda'], ['historial', '📋', 'Historial'], ['pedidos', '📦', 'Pedidos']].map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
            color: tab === k ? '#2563eb' : '#94a3b8', fontWeight: tab === k ? 700 : 400,
          }}>
            <span>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Modal Venta Rápida */}
      {showVenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>💰 Nueva Venta</h3>
              <button onClick={() => { setShowVenta(false); setVentaItems([]); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', overflowY: 'auto', flex: 1 }}>
              <input placeholder="🔍 Buscar producto..." value={ventaSearch || ''} onChange={e => setVentaSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
                {ventaFiltered.map(o => (
                  <div key={o.id} onClick={() => addVentaItem(o)} style={{
                    padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12,
                    opacity: ventaItems.find(i => i.id === o.id) ? 0.4 : 1,
                  }}>
                    <span>{o.nombre_comercial}</span>
                    <span style={{ color: '#64748b' }}>Stock: {o.stock_disponible || 0} · {fmt(o.precio_venta)}</span>
                  </div>
                ))}
              </div>
              {ventaItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>{item.nombre}</div>
                  <input type="number" min={1} max={item.stock} value={item.cantidad || ''}
                    onChange={e => setVentaItems(ventaItems.map((it, i) => i === idx ? { ...it, cantidad: Math.min(Number(e.target.value), it.stock) } : it))}
                    style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(item.precio * item.cantidad)}</span>
                  <button onClick={() => setVentaItems(ventaItems.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              {ventaItems.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].map(m => (
                      <button key={m} onClick={() => setMetodoPago(m)} style={{
                        flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: metodoPago === m ? '#2563eb' : '#f1f5f9', color: metodoPago === m ? 'white' : '#64748b',
                      }}>{m}</button>
                    ))}
                  </div>
                  <div style={{ background: '#dcfce7', borderRadius: 10, padding: '12px 14px', marginTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#166534' }}>
                    <span>Total (IVA incl.)</span><span>{fmt(Math.round(ventaTotal * 1.19))}</span>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={handleVenta} disabled={ventaItems.length === 0} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                background: ventaItems.length > 0 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#e2e8f0',
                color: ventaItems.length > 0 ? 'white' : '#94a3b8',
              }}>💰 Registrar Venta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ingreso Rápido */}
      {showIngreso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>📥 Ingreso de Stock</h3>
              <button onClick={() => { setShowIngreso(false); setIngresoItems([]); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', overflowY: 'auto', flex: 1 }}>
              <input placeholder="🔍 Buscar producto..." value={ingresoSearch || ''} onChange={e => setIngresoSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
                {ingresoFiltered.map(o => (
                  <div key={o.id} onClick={() => addIngresoItem(o)} style={{
                    padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12,
                    opacity: ingresoItems.find(i => i.id === o.id) ? 0.4 : 1,
                  }}>
                    <span>{o.nombre_comercial}</span>
                    <span style={{ color: '#64748b' }}>Stock actual: {o.stock_disponible || 0}</span>
                  </div>
                ))}
              </div>
              {ingresoItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>{item.nombre}</div>
                  <input type="number" min={1} value={item.cantidad || ''}
                    onChange={e => setIngresoItems(ingresoItems.map((it, i) => i === idx ? { ...it, cantidad: Number(e.target.value) } : it))}
                    style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />
                  <button onClick={() => setIngresoItems(ingresoItems.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={handleIngreso} disabled={ingresoItems.length === 0} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                background: ingresoItems.length > 0 ? 'linear-gradient(135deg,#7c3aed,#a78bfa)' : '#e2e8f0',
                color: ingresoItems.length > 0 ? 'white' : '#94a3b8',
              }}>📥 Confirmar Ingreso ({ingresoItems.length})</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Traspaso */}
      {showTraspaso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🔄 Nuevo Traspaso</h3>
              <button onClick={() => { setShowTraspaso(false); setTraspasoItems([]); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Seleccionar Destino:</div>
              <select value={targetPVId} onChange={e => setTargetPVId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <option value="">Seleccionar Punto de Venta destino...</option>
                {state.mkPuntosVenta.filter(pv => pv.id !== selectedPV?.id).map(pv => (
                  <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                ))}
              </select>
              <input placeholder="🔍 Buscar producto a traspasar..." value={traspasoSearch || ''} onChange={e => setTraspasoSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
                {ofertas.filter(o => !traspasoSearch || o.nombre_comercial?.toLowerCase().includes(traspasoSearch.toLowerCase())).map(o => (
                  <div key={o.id} onClick={() => {
                    if (!traspasoItems.find(i => i.id === o.id)) setTraspasoItems([...traspasoItems, { id: o.id, insumo_id: o.insumo_id, nombre: o.nombre_comercial, cantidad: 1, stock: o.stock_disponible || 0 }]);
                  }} style={{ padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{o.nombre_comercial}</span>
                    <span style={{ color: '#64748b' }}>Stock: {o.stock_disponible || 0}</span>
                  </div>
                ))}
              </div>
              {traspasoItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>{item.nombre}</div>
                  <input type="number" min={1} max={item.stock} value={item.cantidad || ''}
                    onChange={e => setTraspasoItems(traspasoItems.map((it, i) => i === idx ? { ...it, cantidad: Math.min(Number(e.target.value), it.stock) } : it))}
                    style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />
                  <button onClick={() => setTraspasoItems(traspasoItems.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={handleTraspaso} disabled={traspasoItems.length === 0 || !targetPVId} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                background: (traspasoItems.length > 0 && targetPVId) ? '#2563eb' : '#e2e8f0',
                color: 'white',
              }}>🔄 Confirmar Traspaso</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolución */}
      {showDevolucion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🔁 Nueva Devolución</h3>
              <button onClick={() => { setShowDevolucion(false); setDevolucionItems([]); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '12px 18px', overflowY: 'auto', flex: 1 }}>
              <input placeholder="🔍 Buscar producto devuelto..." value={devolucionSearch || ''} onChange={e => setDevolucionSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
                {ofertas.filter(o => !devolucionSearch || o.nombre_comercial?.toLowerCase().includes(devolucionSearch.toLowerCase())).map(o => (
                  <div key={o.id} onClick={() => {
                    if (!devolucionItems.find(i => i.id === o.id)) setDevolucionItems([...devolucionItems, { id: o.id, insumo_id: o.insumo_id, nombre: o.nombre_comercial, precio: o.precio_venta, cantidad: 1 }]);
                  }} style={{ padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{o.nombre_comercial}</span>
                    <span style={{ color: '#64748b' }}>{fmt(o.precio_venta)}</span>
                  </div>
                ))}
              </div>
              {devolucionItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>{item.nombre}</div>
                  <input type="number" min={1} value={item.cantidad || ''}
                    onChange={e => setDevolucionItems(devolucionItems.map((it, i) => i === idx ? { ...it, cantidad: Number(e.target.value) } : it))}
                    style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(item.precio * item.cantidad)}</span>
                  <button onClick={() => setDevolucionItems(devolucionItems.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={handleDevolucion} disabled={devolucionItems.length === 0} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                background: devolucionItems.length > 0 ? '#d97706' : '#e2e8f0',
                color: 'white',
              }}>🔁 Confirmar Devolución</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
