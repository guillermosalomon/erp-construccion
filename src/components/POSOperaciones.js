'use client';

import { useState, useMemo } from 'react';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

// ═══════════════════════════════════════════
// Barra de acciones POS (se monta en el panel derecho)
// ═══════════════════════════════════════════
export function POSActionBar({ onVenta, onTraspaso, onDevolucion, onIngreso }) {
  const btnStyle = (bg, color) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: 700, background: bg, color, transition: 'all 0.2s',
  });
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button style={btnStyle('#dcfce7','#166534')} onClick={onVenta}>💰 Venta</button>
      <button style={btnStyle('#dbeafe','#1e40af')} onClick={onTraspaso}>🔄 Traspaso</button>
      <button style={btnStyle('#fef3c7','#92400e')} onClick={onDevolucion}>🔁 Devolución</button>
      <button style={btnStyle('#f3e8ff','#6b21a8')} onClick={onIngreso}>📥 Ingreso</button>
    </div>
  );
}

// ═══════════════════════════════════════════
// MODAL: Venta Directa
// ═══════════════════════════════════════════
export function VentaModal({ ofertas, insumos, tienda, puntoVenta, dispatch, onClose, user }) {
  const [items, setItems] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return ofertas.slice(0, 15);
    return ofertas.filter(o =>
      (o.nombre_comercial || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 15);
  }, [ofertas, search]);

  const addItem = (oferta) => {
    const exists = items.find(i => i.oferta_id === oferta.id);
    if (exists) {
      setItems(items.map(i => i.oferta_id === oferta.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      const ins = insumos.find(i => i.id === oferta.insumo_id);
      setItems([...items, {
        oferta_id: oferta.id, insumo_id: oferta.insumo_id,
        nombre: oferta.nombre_comercial || ins?.nombre || '',
        unidad: oferta.unidad || ins?.unidad || 'un',
        precio: oferta.precio_venta, cantidad: 1,
      }]);
    }
  };

  const updateQty = (idx, qty) => {
    if (qty <= 0) { setItems(items.filter((_, i) => i !== idx)); return; }
    setItems(items.map((it, i) => i === idx ? { ...it, cantidad: qty } : it));
  };

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const handleVenta = () => {
    if (items.length === 0) return;
    // 1. Descontar stock de cada oferta
    items.forEach(item => {
      const oferta = ofertas.find(o => o.id === item.oferta_id);
      if (oferta) {
        dispatch({
          type: 'UPDATE_MK_OFERTA',
          payload: { id: oferta.id, stock_disponible: Math.max(0, (oferta.stock_disponible || 0) - item.cantidad) }
        });
      }
    });
    // 2. Crear pedido/venta
    dispatch({
      type: 'ADD_MK_PEDIDO',
      payload: {
        tienda_id: tienda?.id, punto_venta_id: puntoVenta?.id,
        tipo: 'VENTA_DIRECTA', estado: 'ENTREGADO', metodo_pago: metodoPago,
        cliente_nombre: clienteNombre, cliente_doc: clienteDoc,
        usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Sistema',
        subtotal, iva, total,
        items: items.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, subtotal: i.precio * i.cantidad })),
        fecha: new Date().toISOString(),
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>💰 Nueva Venta — {puntoVenta?.nombre}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {/* Buscar producto */}
          <div className="form-group">
            <label className="form-label">Agregar producto</label>
            <input className="form-input" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 14 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin productos</div>
            ) : filtered.map(o => (
              <div key={o.id} onClick={() => addItem(o)} style={{
                padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', fontSize: 12,
              }}>
                <span>{o.nombre_comercial || '—'}</span>
                <span style={{ color: '#64748b' }}>Stock: {o.stock_disponible || 0} · {fmt(o.precio_venta)}</span>
              </div>
            ))}
          </div>

          {/* Items de la venta */}
          {items.length > 0 && (
            <table className="data-table" style={{ marginBottom: 14 }}>
              <thead><tr><th>Producto</th><th style={{width:70}}>Cant.</th><th style={{textAlign:'right'}}>P.Unit</th><th style={{textAlign:'right'}}>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 12 }}>{item.nombre} <span style={{ color: '#94a3b8', fontSize: 10 }}>/{item.unidad}</span></td>
                    <td><input type="number" min={1} value={item.cantidad} onChange={e => updateQty(idx, Number(e.target.value))} style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2 }} /></td>
                    <td style={{ textAlign: 'right', fontSize: 11 }}>{fmt(item.precio)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{fmt(item.precio * item.cantidad)}</td>
                    <td><button onClick={() => updateQty(idx, 0)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totales */}
          {items.length > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#64748b' }}><span>IVA (19%)</span><span>{fmt(iva)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#16a34a', borderTop: '2px solid #e2e8f0', paddingTop: 8 }}><span>TOTAL</span><span>{fmt(total)}</span></div>
            </div>
          )}

          {/* Cliente y pago */}
          <div className="form-row">
            <div className="form-group"><label className="form-label">Cliente (opcional)</label><input className="form-input" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre" /></div>
            <div className="form-group"><label className="form-label">Doc / NIT</label><input className="form-input" value={clienteDoc} onChange={e => setClienteDoc(e.target.value)} placeholder="CC o NIT" /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Método de Pago</label>
            <select className="form-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
              <option value="TARJETA">💳 Tarjeta</option>
              <option value="MIXTO">🔀 Mixto</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleVenta} disabled={items.length === 0}
            style={{ background: '#16a34a' }}>
            💰 Registrar Venta — {fmt(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MODAL: Traspaso entre Bodegas
// ═══════════════════════════════════════════
export function TraspasoModal({ ofertas, insumos, puntosVenta, tienda, puntoVentaOrigen, bodegas, allOfertas, dispatch, onClose, user }) {
  const [destino, setDestino] = useState('');
  const [destinoTipo, setDestinoTipo] = useState('SUCURSAL'); // SUCURSAL | OBRA
  const [items, setItems] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [search, setSearch] = useState('');

  const otrosPVs = puntosVenta.filter(p => p.id !== puntoVentaOrigen?.id);
  const filtered = ofertas.filter(o => !search || o.nombre_comercial?.toLowerCase().includes(search.toLowerCase()));

  const addItem = (oferta) => {
    if (items.find(i => i.oferta_id === oferta.id)) return;
    const ins = insumos.find(i => i.id === oferta.insumo_id);
    setItems([...items, {
      oferta_id: oferta.id, insumo_id: oferta.insumo_id,
      nombre: oferta.nombre_comercial || ins?.nombre || '',
      stock_actual: oferta.stock_disponible || 0,
      cantidad: 1,
    }]);
  };

  const handleTraspaso = () => {
    if (items.length === 0 || !destino) return;
    const now = new Date().toISOString();
    items.forEach(item => {
      // 1. Descontar stock del origen
      dispatch({
        type: 'UPDATE_MK_OFERTA',
        payload: { id: item.oferta_id, stock_disponible: Math.max(0, item.stock_actual - item.cantidad) }
      });
      // 2. Registrar ingreso en destino (solo si es SUCURSAL)
      if (destinoTipo === 'SUCURSAL') {
        const existingOferta = (allOfertas || []).find(o => o.insumo_id === item.insumo_id && o.punto_venta_id === destino);
        if (existingOferta) {
          dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: existingOferta.id, stock_disponible: (existingOferta.stock_disponible || 0) + item.cantidad } });
        } else {
          const srcOferta = ofertas.find(o => o.id === item.oferta_id);
          dispatch({
            type: 'ADD_MK_OFERTA',
            payload: {
              insumo_id: item.insumo_id, tienda_id: tienda?.id, punto_venta_id: destino,
              precio_venta: srcOferta?.precio_venta || 0, precio_compra: srcOferta?.precio_compra || 0,
              stock_disponible: item.cantidad, nombre_comercial: item.nombre,
              tipo_ingreso: 'TRASPASO', tipo: srcOferta?.tipo, categoria: srcOferta?.categoria,
              unidad: srcOferta?.unidad, tienda_nombre: tienda?.nombre,
              ciudad: puntosVenta.find(p => p.id === destino)?.ciudad || '', activo: true,
              publicado_marketplace: false,
            }
          });
        }
      }
    });
    // 3. Registrar movimiento salida
    dispatch({
      type: 'ADD_MK_PEDIDO',
      payload: {
        tienda_id: tienda?.id, punto_venta_id: puntoVentaOrigen?.id,
        tipo: 'TRASPASO', estado: destinoTipo === 'SUCURSAL' ? 'ENTREGADO' : 'EN_TRANSITO',
        destino_id: destino, destino_tipo: destinoTipo, motivo,
        usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Sistema',
        items: items.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad })),
        fecha: now, subtotal: 0, comision: 0, total: 0,
      }
    });
    // 4. Registrar movimiento entrada en destino
    if (destinoTipo === 'SUCURSAL') {
      dispatch({
        type: 'ADD_MK_PEDIDO',
        payload: {
          tienda_id: tienda?.id, punto_venta_id: destino,
          tipo: 'INGRESO', estado: 'ENTREGADO', metodo_ingreso: 'TRASPASO',
          origen_id: puntoVentaOrigen?.id, origen_nombre: puntoVentaOrigen?.nombre,
          usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Sistema',
          items: items.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad })),
          fecha: now, subtotal: 0, comision: 0, total: 0,
        }
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🔄 Traspaso desde {puntoVentaOrigen?.nombre}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px', background: '#dbeafe', borderRadius: 8, marginBottom: 14, fontSize: 11, color: '#1e40af', borderLeft: '3px solid #2563eb' }}>
            Transfiere inventario desde <strong>{puntoVentaOrigen?.nombre}</strong> hacia otra sucursal o bodega de obra.
          </div>

          {/* Destino */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo Destino</label>
              <select className="form-select" value={destinoTipo} onChange={e => { setDestinoTipo(e.target.value); setDestino(''); }}>
                <option value="SUCURSAL">📍 Otra Sucursal</option>
                <option value="OBRA">🏗️ Bodega de Obra</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destino *</label>
              <select className="form-select" value={destino} onChange={e => setDestino(e.target.value)}>
                <option value="">Seleccionar...</option>
                {destinoTipo === 'SUCURSAL' ? (
                  otrosPVs.map(pv => <option key={pv.id} value={pv.id}>{pv.nombre} — {pv.ciudad}</option>)
                ) : (
                  bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)
                )}
              </select>
            </div>
          </div>

          {/* Agregar items */}
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Productos a traspasar</label>
            <input className="form-input" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin productos</div>
            ) : filtered.map(o => {
              const added = items.find(i => i.oferta_id === o.id);
              return (
                <div key={o.id} onClick={() => !added && addItem(o)} style={{
                  padding: '5px 10px', borderBottom: '1px solid #f8fafc', cursor: added ? 'default' : 'pointer',
                  display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: added ? 0.5 : 1,
                }}>
                  <span>{o.nombre_comercial}</span>
                  <span style={{ color: '#64748b' }}>Stock: {o.stock_disponible || 0}</span>
                </div>
              );
            })}
          </div>

          {items.length > 0 && (
            <table className="data-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Material</th><th style={{ width: 80 }}>Cantidad</th><th style={{ width: 80 }}>Stock</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 12 }}>{item.nombre}</td>
                    <td><input type="number" min={1} max={item.stock_actual} value={item.cantidad}
                      onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, cantidad: Math.min(Number(e.target.value), it.stock_actual) } : it))}
                      style={{ width: 60, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2 }} /></td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>{item.stock_actual}</td>
                    <td><button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="form-group">
            <label className="form-label">Motivo (opcional)</label>
            <input className="form-input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Reabastecimiento, pedido urgente..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleTraspaso} disabled={items.length === 0 || !destino}>
            🔄 Confirmar Traspaso ({items.length} items)
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MODAL: Devolución
// ═══════════════════════════════════════════
export function DevolucionModal({ ofertas, insumos, tienda, puntoVenta, dispatch, onClose, user }) {
  const [items, setItems] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [search, setSearch] = useState('');

  const filtered = ofertas.filter(o => !search || o.nombre_comercial?.toLowerCase().includes(search.toLowerCase()));

  const addItem = (oferta) => {
    if (items.find(i => i.oferta_id === oferta.id)) return;
    const ins = insumos.find(i => i.id === oferta.insumo_id);
    setItems([...items, {
      oferta_id: oferta.id, insumo_id: oferta.insumo_id,
      nombre: oferta.nombre_comercial || ins?.nombre || '', cantidad: 1,
      precio: oferta.precio_venta,
    }]);
  };

  const totalDevolucion = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const handleDevolucion = () => {
    if (items.length === 0) return;
    // Devolver stock
    items.forEach(item => {
      const oferta = ofertas.find(o => o.id === item.oferta_id);
      if (oferta) {
        dispatch({
          type: 'UPDATE_MK_OFERTA',
          payload: { id: oferta.id, stock_disponible: (oferta.stock_disponible || 0) + item.cantidad }
        });
      }
    });
    dispatch({
      type: 'ADD_MK_PEDIDO',
      payload: {
        tienda_id: tienda?.id, punto_venta_id: puntoVenta?.id,
        tipo: 'DEVOLUCION', estado: 'ENTREGADO',
        cliente_nombre: clienteNombre, motivo,
        usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Sistema',
        subtotal: totalDevolucion, comision: 0, total: -totalDevolucion,
        items: items.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        fecha: new Date().toISOString(),
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>🔁 Devolución — {puntoVenta?.nombre}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px', background: '#fef3c7', borderRadius: 8, marginBottom: 14, fontSize: 11, color: '#92400e', borderLeft: '3px solid #f59e0b' }}>
            Registra devolución de material. El stock se reingresa automáticamente al punto de venta.
          </div>

          <div className="form-group"><label className="form-label">Cliente que devuelve</label><input className="form-input" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Nombre del cliente" /></div>

          <div className="form-group">
            <label className="form-label">Productos devueltos</label>
            <input className="form-input" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin productos</div>
            ) : filtered.map(o => (
              <div key={o.id} onClick={() => addItem(o)} style={{
                padding: '5px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', fontSize: 11,
                opacity: items.find(i => i.oferta_id === o.id) ? 0.5 : 1,
              }}>
                <span>{o.nombre_comercial}</span>
                <span>{fmt(o.precio_venta)}</span>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <table className="data-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Producto</th><th style={{ width: 70 }}>Cant.</th><th style={{ textAlign: 'right' }}>Valor</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 12 }}>{item.nombre}</td>
                    <td><input type="number" min={1} value={item.cantidad}
                      onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, cantidad: Number(e.target.value) } : it))}
                      style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2 }} /></td>
                    <td style={{ textAlign: 'right', fontSize: 11 }}>{fmt(item.precio * item.cantidad)}</td>
                    <td><button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {items.length > 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#92400e' }}>
              <span>Valor Devolución</span><span>{fmt(totalDevolucion)}</span>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Motivo de la devolución</label>
            <select className="form-select" value={motivo} onChange={e => setMotivo(e.target.value)}>
              <option value="">Seleccionar motivo...</option>
              <option value="DEFECTUOSO">Producto defectuoso</option>
              <option value="SOBRANTE">Material sobrante de obra</option>
              <option value="ERROR_PEDIDO">Error en pedido</option>
              <option value="GARANTIA">Garantía</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleDevolucion} disabled={items.length === 0}
            style={{ background: '#d97706' }}>🔁 Registrar Devolución</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PANEL: Historial de Operaciones + Facturación
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// MODAL: Ingreso
// ═══════════════════════════════════════════
export function IngresoModal({ ofertas, tienda, puntoVenta, puntosVenta, bodegas, dispatch, onClose, user }) {
  const [items, setItems] = useState([]);
  const [tipoIngreso, setTipoIngreso] = useState('COMPRA'); // COMPRA, TRASPASO, CONSIGNACION
  const [proveedor, setProveedor] = useState('');
  const [tipoOrigen, setTipoOrigen] = useState('Otra Sucursal');
  const [origenId, setOrigenId] = useState('');
  const [search, setSearch] = useState('');

  const filtered = ofertas.filter(o => !search || o.nombre_comercial?.toLowerCase().includes(search.toLowerCase()));

  const addItem = (oferta) => {
    if (items.find(i => i.oferta_id === oferta.id)) return;
    setItems([...items, { oferta_id: oferta.id, insumo_id: oferta.insumo_id, nombre: oferta.nombre_comercial, cantidad: 1, precio: Number(oferta.precio_compra) || Number(oferta.precio_venta) }]);
  };

  const totalIngreso = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  const handleConfirmar = () => {
    if (items.length === 0) return;
    if (tipoIngreso === 'TRASPASO' && !origenId) return;

    items.forEach(item => {
      dispatch({ type: 'UPDATE_MK_OFERTA_STOCK', payload: { id: item.oferta_id, qty: item.cantidad } });
    });

    dispatch({
      type: 'ADD_MK_PEDIDO',
      payload: {
        tienda_id: tienda?.id, punto_venta_id: puntoVenta?.id,
        tipo: 'INGRESO', estado: 'ENTREGADO',
        metodo_ingreso: tipoIngreso,
        proveedor: proveedor,
        origen_id: origenId,
        usuario_id: user?.id, usuario_nombre: user?.user_metadata?.nombre || user?.email || 'Sistema',
        subtotal: totalIngreso,
        comision: 0,
        total: totalIngreso,
        items: items.map(i => ({ insumo_id: i.insumo_id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
        fecha: new Date().toISOString(),
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>📥 Ingreso de Inventario — {puntoVenta?.nombre}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 12, border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ marginBottom: 6 }}>Tipo de Ingreso</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['COMPRA','🛒 Compra'],['TRASPASO','🔄 Traspaso'],['CONSIGNACION','📋 Consignación']].map(([val,label]) => (
                <button key={val} onClick={() => setTipoIngreso(val)} style={{
                  flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                  background: tipoIngreso === val ? '#2563eb' : '#e2e8f0',
                  color: tipoIngreso === val ? 'white' : '#64748b',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {(tipoIngreso === 'COMPRA' || tipoIngreso === 'CONSIGNACION') && (
            <div className="form-group">
              <label className="form-label">Proveedor</label>
              <input className="form-input" value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Nombre del proveedor" />
            </div>
          )}

          {tipoIngreso === 'TRASPASO' && (
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Tipo Origen</label>
                <select className="form-select" value={tipoOrigen} onChange={e => { setTipoOrigen(e.target.value); setOrigenId(''); }}>
                  <option value="Otra Sucursal">Otra Sucursal</option>
                  <option value="Bodega de Obra">Bodega de Obra</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Origen *</label>
                <select className="form-select" value={origenId} onChange={e => setOrigenId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {tipoOrigen === 'Otra Sucursal' 
                    ? puntosVenta?.filter(pv => pv.id !== puntoVenta?.id).map(pv => <option key={pv.id} value={pv.id}>{pv.nombre}</option>)
                    : bodegas?.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)
                  }
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Seleccionar productos del catálogo</label>
            <input className="form-input" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin productos</div>
            ) : filtered.map(o => (
              <div key={o.id} onClick={() => addItem(o)} style={{
                padding: '5px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', fontSize: 11,
                opacity: items.find(i => i.oferta_id === o.id) ? 0.5 : 1,
              }}>
                <span>{o.nombre_comercial}</span>
                <span style={{ color: '#64748b' }}>Stock actual: {o.stock_disponible || 0}</span>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <table className="data-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Producto</th><th style={{ width: 70 }}>Cant.</th><th style={{ textAlign: 'right' }}>Costo Unit.</th><th></th></tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 12 }}>{item.nombre}</td>
                    <td><input type="number" min={1} value={item.cantidad}
                      onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, cantidad: Number(e.target.value) } : it))}
                      style={{ width: 50, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2 }} /></td>
                    <td style={{ textAlign: 'right' }}><input type="number" value={item.precio}
                      onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, precio: Number(e.target.value) } : it))}
                      style={{ width: 80, textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2 }} /></td>
                    <td><button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirmar} disabled={items.length === 0 || (tipoIngreso === 'TRASPASO' && !origenId)}>Confirmar Ingreso ({items.length} items)</button>
        </div>
      </div>
    </div>
  );
}

export function HistorialOperaciones({ pedidos, puntoVentaId }) {
  const ops = pedidos.filter(p => p.punto_venta_id === puntoVentaId)
    .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));

  const tipoConfig = {
    VENTA_DIRECTA: { icon: '💰', label: 'Venta', color: '#16a34a', bg: '#dcfce7' },
    TRASPASO: { icon: '🔄', label: 'Traspaso', color: '#2563eb', bg: '#dbeafe' },
    DEVOLUCION: { icon: '🔁', label: 'Devolución', color: '#d97706', bg: '#fef3c7' },
    INGRESO: { icon: '📥', label: 'Ingreso', color: '#7c3aed', bg: '#f3e8ff' },
  };

  const estadoColors = {
    ENTREGADO: '#16a34a', EN_TRANSITO: '#2563eb', PENDIENTE: '#d97706', CANCELADO: '#ef4444',
  };

  if (ops.length === 0) return (
    <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
      📋 Sin movimientos registrados
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', maxHeight: 300 }}>
      <table className="data-table">
        <thead><tr><th>Tipo</th><th>Fecha</th><th>Usuario</th><th>Items</th><th>Estado</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>
          {ops.map(op => {
            const cfg = tipoConfig[op.tipo] || { icon: '📄', label: op.tipo, color: '#64748b', bg: '#f1f5f9' };
            const itemCount = Array.isArray(op.items) ? op.items.length : 0;
            const fecha = op.fecha ? new Date(op.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
            return (
              <tr key={op.id}>
                <td>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: '#64748b' }}>{fecha}</td>
                <td style={{ fontSize: 11, color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#475569', flexShrink: 0 }}>
                      {(op.usuario_nombre || '?').charAt(0).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.usuario_nombre || '—'}</span>
                  </div>
                </td>
                <td style={{ fontSize: 11 }}>{itemCount} productos</td>
                <td>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: 'white', background: estadoColors[op.estado] || '#94a3b8' }}>
                    {op.estado}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: op.tipo === 'DEVOLUCION' ? '#d97706' : '#1e293b' }}>
                  {op.tipo === 'DEVOLUCION' ? '-' : ''}{fmt(Math.abs(op.total || 0))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
