'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { calcularStockBodegas } from '@/lib/compras-engine';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);
const fmtQ = (v) => (Number(v) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

const TIPO_MOV = {
  ENTRADA: { label: 'Entrada', color: '#16a34a', signo: '+' },
  TRASLADO_ENTRADA: { label: 'Traslado recibido', color: '#0891b2', signo: '+' },
  SALIDA: { label: 'Salida', color: '#f97316', signo: '−' },
  TRASLADO_SALIDA: { label: 'Traslado enviado', color: '#ea580c', signo: '−' },
  CONSUMO: { label: 'Consumo', color: '#b45309', signo: '−' },
};

const MOV_VACIO = { modo: 'ENTRADA', insumo_id: '', cantidad: '', costo_unitario: '', motivo: '', distribuidor: '', presupuesto_item_id: '', cuadrilla_id: '' };

/**
 * Bodega de obra: existencias (réplica de v_stock_bodega), movimientos, consumo
 * y publicación de sobrantes en la tienda Kalarti.
 */
export default function BodegaObraView({ proyectoId, onOpenAI }) {
  const { state, dispatch } = useStore();
  const [movModal, setMovModal] = useState(null); // { ...MOV_VACIO }
  const [ventaModal, setVentaModal] = useState(null); // { row, sector, precio_liquidacion, cantidad }
  const [editBodega, setEditBodega] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const proyecto = state.proyectos.find((p) => p.id === proyectoId);
  const bodega = state.bodegas.find((b) => b.proyecto_id === proyectoId);
  const insumoMap = useMemo(() => new Map(state.insumos.map((i) => [i.id, i])), [state.insumos]);
  const itemsProyecto = useMemo(() => state.presupuestoItems.filter((i) => i.proyecto_id === proyectoId), [state.presupuestoItems, proyectoId]);

  // Cuadrillas disponibles: cargos que tienen integrantes (CUA-*)
  const cuadrillas = useMemo(() => {
    const padres = new Set((state.cargoDetalles || []).map((d) => d.cargo_padre_id));
    return (state.cargos || []).filter((c) => padres.has(c.id) || String(c.codigo || '').startsWith('CUA'))
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }, [state.cargos, state.cargoDetalles]);

  // Cuadrilla que el APU de la actividad tiene asignada (para sugerirla)
  const cuadrillaDeActividad = (itemId) => {
    const item = itemsProyecto.find((i) => i.id === itemId);
    if (!item?.apu_id) return '';
    const ids = new Set(cuadrillas.map((c) => c.id));
    return (state.apuDetalles || []).find((d) => d.apu_id === item.apu_id && d.cargo_id && ids.has(d.cargo_id))?.cargo_id || '';
  };

  const stock = useMemo(() => {
    if (!bodega) return [];
    const q = busqueda.trim().toLowerCase();
    return calcularStockBodegas({
      inventario: state.inventario.filter((t) => t.bodega_id === bodega.id),
      ordenes: state.ordenesCompra,
      insumos: state.insumos,
      bodegas: state.bodegas,
    })
      .filter((s) => Math.abs(s.existente) > 0.00001 || s.comprometido > 0)
      .filter((s) => !q || s.insumo.toLowerCase().includes(q))
      .sort((a, b) => a.insumo.localeCompare(b.insumo));
  }, [bodega, busqueda, state.inventario, state.ordenesCompra, state.insumos, state.bodegas]);

  const movimientos = useMemo(() => (bodega ? state.inventario.filter((t) => t.bodega_id === bodega.id) : [])
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))), [bodega, state.inventario]);

  const valorTotal = stock.reduce((s, r) => s + Math.max(0, r.existente) * (Number(r.costo_unitario) || 0), 0);
  const ofertaDe = (insumoId) => (state.mkOfertas || []).find((o) => o.origen === 'SOBRANTE' && o.bodega_id === bodega?.id && o.insumo_id === insumoId);
  const puntoKalarti = (state.mkPuntosVenta || []).find((p) => String(p.nombre || '').toUpperCase().includes('KALARTI'));

  const handleCreateBodega = () => {
    dispatch({
      type: 'ADD_BODEGA',
      payload: { proyecto_id: proyectoId, nombre: `Bodega ${proyecto?.nombre || ''}`.trim() }
    });
  };

  /* ─── Movimientos ─── */

  const registrarMovimiento = () => {
    const m = movModal;
    const cant = Number(m.cantidad);
    if (!m.insumo_id || !cant) return alert('Selecciona el material y la cantidad.');
    const ins = insumoMap.get(m.insumo_id);
    const base = { id: crypto.randomUUID(), bodega_id: bodega.id, insumo_id: m.insumo_id };
    let payload;
    if (m.modo === 'CONSUMO') {
      // El consumo exige cuadrilla responsable (trazabilidad de rendimientos); el ajuste no
      if (!m.cuadrilla_id) return alert('Selecciona la cuadrilla responsable del consumo.');
      const disp = stock.find((s) => s.insumo_id === m.insumo_id)?.existente || 0;
      if (cant > disp && !confirm(`La cantidad supera la existencia (${fmtQ(disp)}). ¿Registrar de todas formas?`)) return;
      payload = {
        ...base, tipo: 'CONSUMO', cantidad: Math.abs(cant), origen: 'AVANCE',
        presupuesto_item_id: m.presupuesto_item_id || null,
        cuadrilla_id: m.cuadrilla_id,
        motivo: m.motivo || 'Consumo en obra',
      };
    } else if (m.modo === 'AJUSTE') {
      const cu = stock.find((s) => s.insumo_id === m.insumo_id)?.costo_unitario || Number(ins?.precio_unitario) || 0;
      payload = {
        ...base, tipo: cant > 0 ? 'ENTRADA' : 'SALIDA', cantidad: Math.abs(cant), origen: 'AJUSTE',
        costo_unitario: cant > 0 ? (Number(m.costo_unitario) || cu) : null,
        motivo: m.motivo || 'Ajuste de inventario',
      };
    } else {
      const cu = Number(m.costo_unitario) || Number(ins?.precio_unitario) || 0;
      payload = {
        ...base, tipo: 'ENTRADA', cantidad: Math.abs(cant), origen: 'COMPRA',
        costo_unitario: cu, costo_real: Math.round(cu * Math.abs(cant)),
        distribuidor: m.distribuidor || null,
        motivo: m.motivo || 'Ingreso manual',
      };
    }
    dispatch({ type: 'ADD_INVENTARIO_MOV', payload });
    setMovModal(null);
  };

  /* ─── Sobrantes → tienda Kalarti ─── */

  const abrirVenta = (row) => {
    const ins = insumoMap.get(row.insumo_id);
    const oferta = ofertaDe(row.insumo_id);
    const precioVenta = Number(ins?.precio_unitario) || Number(row.costo_unitario) || 0;
    setVentaModal({
      row,
      precio_venta: precioVenta,
      sector: oferta?.sector || '',
      precio_liquidacion: oferta?.precio_liquidacion ?? Math.round(precioVenta * 0.8),
      cantidad: Math.max(0, Math.floor(row.disponible)),
    });
  };

  const publicarSobrante = () => {
    const v = ventaModal;
    if (!puntoKalarti) return alert('No se encontró el punto de venta Kalarti en el Marketplace.');
    const cantidad = Math.max(0, Math.floor(Number(v.cantidad) || 0));
    if (cantidad <= 0) return alert('No hay cantidad disponible para publicar.');
    const ins = insumoMap.get(v.row.insumo_id);
    const datos = {
      origen: 'SOBRANTE',
      bodega_id: bodega.id,
      insumo_id: v.row.insumo_id,
      nombre_comercial: ins?.nombre || v.row.insumo,
      tipo: ins?.tipo || 'MATERIAL',
      categoria: ins?.categoria || null,
      unidad: ins?.unidad || v.row.unidad,
      ciudad: bodega.municipio || null,
      sector: v.sector || null,
      precio_venta: Number(v.precio_venta) || 0,
      precio_liquidacion: Number(v.precio_liquidacion) || null,
      stock_disponible: cantidad,
      publicado_marketplace: true,
      activo: true,
      tienda_id: puntoKalarti.tienda_id,
      punto_venta_id: puntoKalarti.id,
      tienda_nombre: 'Kalarti',
    };
    const existente = ofertaDe(v.row.insumo_id);
    if (existente) dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: existente.id, ...datos } });
    else dispatch({ type: 'ADD_MK_OFERTA', payload: { id: crypto.randomUUID(), ...datos } });
    setVentaModal(null);
    alert(existente ? 'Oferta de sobrante actualizada.' : 'Sobrante publicado en la tienda Kalarti.');
  };

  const retirarOferta = (insumoId) => {
    const o = ofertaDe(insumoId);
    if (o && confirm('¿Retirar este sobrante de la tienda?')) {
      dispatch({ type: 'UPDATE_MK_OFERTA', payload: { id: o.id, publicado_marketplace: false, activo: false } });
    }
  };

  const guardarBodega = () => {
    dispatch({ type: 'UPDATE_BODEGA', payload: { id: bodega.id, nombre: editBodega.nombre, municipio: editBodega.municipio || null, direccion: editBodega.direccion || null } });
    setEditBodega(null);
  };

  /* ─── Render ─── */

  if (!bodega) {
    return (
      <div className="empty-state" style={{ marginTop: 100 }}>
        <div className="empty-state-icon">⚠️</div>
        <h3>Este proyecto aún no tiene una bodega configurada</h3>
        <p>La bodega es necesaria para recibir materiales y descontar consumos.</p>
        <button className="btn btn-primary" onClick={handleCreateBodega}>Configurar Bodega Ahora</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📦 {bodega.nombre}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              📍 {bodega.direccion || 'Sin dirección'} · {bodega.municipio || 'Municipio sin definir'}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6, fontSize: 11 }} onClick={() => setEditBodega({ nombre: bodega.nombre || '', municipio: bodega.municipio || '', direccion: bodega.direccion || '' })}>Editar</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Valor en bodega</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(valorTotal)}</div>
            </div>
            {onOpenAI && <button className="btn btn-secondary btn-sm" onClick={onOpenAI}>🤖 Ingresar con IA</button>}
            <button className="btn btn-secondary btn-sm" onClick={() => setMovModal({ ...MOV_VACIO, modo: 'CONSUMO' })}>− Registrar consumo</button>
            <button className="btn btn-primary btn-sm" onClick={() => setMovModal({ ...MOV_VACIO })}>+ Registrar entrada/ajuste</button>
          </div>
        </div>
      </div>

      <div className="bodega-grid">
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Existencias</h3>
            <input className="form-input" style={{ width: 200, fontSize: 12 }} placeholder="Buscar material…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Existente</th>
                  <th style={{ textAlign: 'right' }}>Comprometido</th>
                  <th style={{ textAlign: 'right' }}>Disponible</th>
                  <th style={{ textAlign: 'right' }}>Costo unit.</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No hay materiales registrados en esta bodega.</td></tr>
                ) : stock.map((s) => {
                  const oferta = ofertaDe(s.insumo_id);
                  const publicada = oferta && oferta.activo !== false && oferta.publicado_marketplace;
                  return (
                    <tr key={s.insumo_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.insumo}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.unidad}{publicada ? ' · 🛒 En tienda' : ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: s.existente < 0 ? 'var(--color-danger)' : undefined }}>{fmtQ(s.existente)}</td>
                      <td style={{ textAlign: 'right', color: s.comprometido > 0 ? '#ea580c' : '#94a3b8' }}>{fmtQ(s.comprometido)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmtQ(s.disponible)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(s.costo_unitario)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setMovModal({ ...MOV_VACIO, modo: 'CONSUMO', insumo_id: s.insumo_id })}>Consumo</button>
                        {s.disponible > 0 && (
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, marginLeft: 4 }} onClick={() => abrirVenta(s)} title="Disponible para reasignación o venta">
                            {publicada ? 'Actualizar oferta' : 'Disponible para venta'}
                          </button>
                        )}
                        {publicada && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => retirarOferta(s.insumo_id)}>Retirar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><h3>Historial de movimientos</h3></div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {movimientos.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>Sin movimientos registrados</div>}
            {movimientos.map((t) => {
              const tipo = TIPO_MOV[t.tipo] || { label: t.tipo, color: '#64748b', signo: '' };
              const ins = insumoMap.get(t.insumo_id);
              const item = t.presupuesto_item_id ? itemsProyecto.find((i) => i.id === t.presupuesto_item_id) : null;
              return (
                <div key={t.id} style={{ borderLeft: `3px solid ${tipo.color}`, paddingLeft: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong style={{ color: tipo.color }}>{tipo.label}{t.origen ? ` · ${t.origen}` : ''}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>{t.created_at ? new Date(t.created_at).toLocaleString('es-CO') : ''}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#1e293b' }}>{tipo.signo}{fmtQ(t.cantidad)} {ins?.unidad} {ins?.nombre || 'Insumo'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {t.motivo}{t.costo_unitario ? ` · ${fmt(t.costo_unitario)}/u` : ''}{item ? ` · ${item.descripcion || item.nombre}` : ''}{t.cuadrilla_id ? ` · ${(state.cargos || []).find((c) => c.id === t.cuadrilla_id)?.nombre || 'Cuadrilla'}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {movModal && (
        <div className="modal-overlay" onClick={() => setMovModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>{movModal.modo === 'CONSUMO' ? 'Registrar consumo' : 'Registrar entrada o ajuste'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setMovModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {movModal.modo !== 'CONSUMO' && (
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={movModal.modo} onChange={(e) => setMovModal({ ...movModal, modo: e.target.value })}>
                    <option value="ENTRADA">Entrada (compra / ingreso)</option>
                    <option value="AJUSTE">Ajuste de inventario (+/−)</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Material</label>
                <select className="form-select" value={movModal.insumo_id} onChange={(e) => setMovModal({ ...movModal, insumo_id: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  {(movModal.modo === 'CONSUMO' ? stock.map((s) => ({ id: s.insumo_id, codigo: '', nombre: `${s.insumo} (${fmtQ(s.existente)} ${s.unidad})` })) : state.insumos)
                    .map((i) => <option key={i.id} value={i.id}>{i.codigo ? `${i.codigo} - ` : ''}{i.nombre}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Cantidad{movModal.modo === 'AJUSTE' ? ' (negativa para restar)' : ''}</label>
                  <input type="number" className="form-input" value={movModal.cantidad} onChange={(e) => setMovModal({ ...movModal, cantidad: e.target.value })} placeholder="0" />
                </div>
                {movModal.modo !== 'CONSUMO' && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Costo unitario</label>
                    <input type="number" className="form-input" value={movModal.costo_unitario} onChange={(e) => setMovModal({ ...movModal, costo_unitario: e.target.value })} placeholder={String(insumoMap.get(movModal.insumo_id)?.precio_unitario || '$')} />
                  </div>
                )}
              </div>
              {movModal.modo === 'CONSUMO' && (
                <div className="form-group">
                  <label className="form-label">Actividad del presupuesto (opcional)</label>
                  <select className="form-select" value={movModal.presupuesto_item_id} onChange={(e) => {
                    const sugerida = cuadrillaDeActividad(e.target.value);
                    setMovModal({ ...movModal, presupuesto_item_id: e.target.value, cuadrilla_id: sugerida || movModal.cuadrilla_id });
                  }}>
                    <option value="">— Sin actividad —</option>
                    {itemsProyecto.map((i) => <option key={i.id} value={i.id}>{i.descripcion || i.nombre}</option>)}
                  </select>
                </div>
              )}
              {movModal.modo === 'CONSUMO' && (
                <div className="form-group">
                  <label className="form-label">Cuadrilla responsable *</label>
                  <select className="form-select" value={movModal.cuadrilla_id} onChange={(e) => setMovModal({ ...movModal, cuadrilla_id: e.target.value })}>
                    <option value="">— Seleccionar cuadrilla —</option>
                    {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              )}
              {movModal.modo === 'ENTRADA' && (
                <div className="form-group">
                  <label className="form-label">Distribuidor</label>
                  <input className="form-input" value={movModal.distribuidor} onChange={(e) => setMovModal({ ...movModal, distribuidor: e.target.value })} placeholder="Proveedor (opcional)" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Concepto / motivo</label>
                <input className="form-input" value={movModal.motivo} onChange={(e) => setMovModal({ ...movModal, motivo: e.target.value })} placeholder="Ej: Factura 123, conteo físico, vaciado de placa" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMovModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={registrarMovimiento}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {ventaModal && (
        <div className="modal-overlay" onClick={() => setVentaModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Disponible para reasignación o venta</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setVentaModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <strong>{ventaModal.row.insumo}</strong> · disponible {fmtQ(ventaModal.row.disponible)} {ventaModal.row.unidad} en {bodega.municipio || 'la obra'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                Sigue disponible para traslados a otras obras y se publica en la tienda Kalarti con la ubicación de esta obra.
              </div>
              <div className="form-group">
                <label className="form-label">Sector</label>
                <input className="form-input" value={ventaModal.sector} onChange={(e) => setVentaModal({ ...ventaModal, sector: e.target.value })} placeholder="Ej: Sector El Potrerillo" />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Precio de venta</label>
                  <input type="number" className="form-input" value={ventaModal.precio_venta} onChange={(e) => setVentaModal({ ...ventaModal, precio_venta: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Precio de liquidación</label>
                  <input type="number" className="form-input" value={ventaModal.precio_liquidacion} onChange={(e) => setVentaModal({ ...ventaModal, precio_liquidacion: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad a publicar</label>
                <input type="number" className="form-input" value={ventaModal.cantidad} onChange={(e) => setVentaModal({ ...ventaModal, cantidad: e.target.value })} />
              </div>
              {!puntoKalarti && <div style={{ fontSize: 11, color: '#b91c1c' }}>No se encontró un punto de venta Kalarti en el Marketplace.</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setVentaModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={publicarSobrante} disabled={!puntoKalarti}>Publicar en tienda</button>
            </div>
          </div>
        </div>
      )}

      {editBodega && (
        <div className="modal-overlay" onClick={() => setEditBodega(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Datos de la bodega</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditBodega(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={editBodega.nombre} onChange={(e) => setEditBodega({ ...editBodega, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección de la obra</label>
                <input className="form-input" value={editBodega.direccion} onChange={(e) => setEditBodega({ ...editBodega, direccion: e.target.value })} placeholder="Ej: Cra 10 # 20-30, barrio Centro" />
              </div>
              <div className="form-group">
                <label className="form-label">Municipio</label>
                <input className="form-input" value={editBodega.municipio} onChange={(e) => setEditBodega({ ...editBodega, municipio: e.target.value })} placeholder="Ej: Pasto" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditBodega(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarBodega}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bodega-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; height: calc(100vh - 300px); min-height: 420px; }
        @media (max-width: 1100px) { .bodega-grid { grid-template-columns: 1fr; height: auto; } }
      `}</style>
    </div>
  );
}
