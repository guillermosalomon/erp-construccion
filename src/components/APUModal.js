'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';

const UNIDADES = ['un', 'kg', 'm', 'm2', 'm3', 'lt', 'gl', 'hr', 'día', 'viaje', 'saco'];

export default function APUModal({ apuId, isOpen, onClose }) {
  const { state, dispatch, calcularCostoAPU } = useStore();
  
  if (!isOpen) return null;

  const apu = state.apus.find(a => a.id === apuId);
  const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);

  if (!apu) return null;

  return (
    <APUModalContent 
      key={apuId}
      apu={apu} 
      detalles={detalles} 
      state={state} 
      dispatch={dispatch} 
      calcularCostoAPU={calcularCostoAPU} 
      isOpen={isOpen} 
      onClose={onClose} 
    />
  );
}

function APUModalContent({ apu, detalles, state, dispatch, calcularCostoAPU, isOpen, onClose }) {
  const [form, setForm] = useState({ 
    nombre: apu.nombre, 
    descripcion: apu.descripcion || '', 
    unidad: apu.unidad, 
    rendimiento: String(apu.rendimiento || 1) 
  });
  
  const [detalleForm, setDetalleForm] = useState({ 
    tipo_linea: 'insumo', 
    insumo_id: '', 
    cargo_id: '', 
    apu_hijo_id: '', 
    cantidad: '', 
    rendimiento: '', // Nuevo
    unidad_detalle: '', // Nuevo
    desperdicio_pct: '0' 
  });

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(val);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({ 
      type: 'UPDATE_APU', 
      payload: { ...form, id: apu.id, rendimiento: parseFloat(form.rendimiento) || 1 } 
    });
    alert('Información básica actualizada');
  };

  const handleAddDetalle = () => {
    const payload = {
      apu_id: apu.id,
      insumo_id: detalleForm.tipo_linea === 'insumo' ? detalleForm.insumo_id : null,
      cargo_id: detalleForm.tipo_linea === 'cargo' ? detalleForm.cargo_id : null,
      apu_hijo_id: detalleForm.tipo_linea === 'apu' ? detalleForm.apu_hijo_id : null,
      cantidad: parseFloat(detalleForm.cantidad) || 0,
      rendimiento: parseFloat(detalleForm.rendimiento) || null,
      unidad_detalle: detalleForm.unidad_detalle || null,
      desperdicio_pct: parseFloat(detalleForm.desperdicio_pct) || 0,
    };

    if ((!payload.insumo_id && !payload.apu_hijo_id && !payload.cargo_id) || payload.cantidad <= 0) return;
    dispatch({ type: 'ADD_APU_DETALLE', payload });
    setDetalleForm({ ...detalleForm, insumo_id: '', cargo_id: '', apu_hijo_id: '', cantidad: '', rendimiento: '', unidad_detalle: '' });
  };

  const handleUpdateDetalle = (id, field, value) => {
    const det = detalles.find(d => d.id === id);
    if (!det) return;

    let updates = { [field]: parseFloat(value) || 0 };

    // Lógica de relación inversa
    if (field === 'rendimiento' && updates.rendimiento > 0) {
      updates.cantidad = Number((1 / updates.rendimiento).toFixed(4));
    } else if (field === 'cantidad' && updates.cantidad > 0) {
      updates.rendimiento = Number((1 / updates.cantidad).toFixed(4));
    }

    dispatch({
      type: 'UPDATE_APU_DETALLE',
      payload: { ...det, ...updates, id }
    });
  };

  const handleCantidadChange = (val) => {
    const cant = parseFloat(val) || 0;
    setDetalleForm(prev => ({
      ...prev,
      cantidad: val,
      rendimiento: cant > 0 ? (1 / cant).toFixed(4) : ''
    }));
  };

  const handleRendimientoChange = (val) => {
    const rend = parseFloat(val) || 0;
    setDetalleForm(prev => ({
      ...prev,
      rendimiento: val,
      cantidad: rend > 0 ? (1 / rend).toFixed(4) : ''
    }));
  };

  const availableSubAPUs = state.apus.filter(a => a.id !== apu.id);

  const materialesEquipos = detalles.filter(d => d.insumo_id || d.apu_hijo_id);
  const manoDeObra = detalles.filter(d => d.cargo_id);

  const renderTable = (items, title, isLabor = false) => (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13, textTransform: 'uppercase' }}>{title}</h4>
      </div>
      <div className="table-container" style={{ border: '1px solid var(--color-border)', borderRadius: 8 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Unidad</th>
              <th style={{ textAlign: 'right', width: 90 }}>Rendimiento</th>
              <th style={{ textAlign: 'right', width: 90 }}>Cantidad</th>
              <th style={{ textAlign: 'right', width: 70 }}>Desp. %</th>
              <th style={{ textAlign: 'right' }}>P. Unit.</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((det) => {
              const ins = state.insumos.find(i => i.id === det.insumo_id);
              const cargo = state.cargos.find(c => c.id === det.cargo_id);
              const subApu = state.apus.find(a => a.id === det.apu_hijo_id);
              
              const nombre = ins ? ins.nombre : (cargo ? cargo.nombre : (subApu ? `[APU] ${subApu.nombre}` : '—'));
              
              // Lógica de unidad y precio con conversión para cargos
              let unidad = ins ? ins.unidad : (cargo ? cargo.unidad : (subApu ? subApu.unidad : ''));
              let precio = ins ? ins.precio_unitario : (cargo ? cargo.precio_unitario : (subApu ? calcularCostoAPU(subApu.id) : 0));
              
              if (cargo && det.unidad_detalle) {
                unidad = det.unidad_detalle;
                const uCargo = cargo.unidad?.toLowerCase();
                const uDet = det.unidad_detalle?.toLowerCase();
                
                const h_mes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
                const h_dia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;

                // Precio base por hora
                let p_hr = precio;
                if (uCargo === 'mes') p_hr = precio / h_mes;
                else if (uCargo === 'día' || uCargo === 'dia') p_hr = precio / h_dia;
                
                if (uDet === 'hora' || uDet === 'hr') precio = p_hr;
                else if (uDet === 'día' || uDet === 'dia') precio = p_hr * h_dia;
              }

              const subtotal = (precio * (Number(det.cantidad) || 0) * (cargo ? 1 : (1 + (Number(det.desperdicio_pct) || 0) / 100)));

              const rendValue = det.rendimiento != null ? det.rendimiento : (det.cantidad > 0 ? Number((1 / det.cantidad).toFixed(4)) : '');

              return (
                <tr key={det.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{nombre}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{ins ? ins.codigo : (cargo ? cargo.codigo : (subApu ? subApu.codigo : ''))}</div>
                  </td>
                  <td><span className="tag" style={{ background: '#f1f5f9', color: '#475569', fontSize: 10 }}>{unidad}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <input 
                      key={`rend-${det.id}-${det.cantidad}`}
                      type="number"
                      step="0.0001"
                      className="inline-edit-input"
                      style={{ textAlign: 'right', width: '100%', color: 'var(--color-primary)' }}
                      defaultValue={rendValue || ''}
                      onBlur={(e) => handleUpdateDetalle(det.id, 'rendimiento', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input 
                      key={`cant-${det.id}-${det.rendimiento}`}
                      type="number"
                      step="0.0001"
                      className="inline-edit-input"
                      style={{ textAlign: 'right', width: '100%', fontWeight: 600 }}
                      defaultValue={Number(det.cantidad || 0).toFixed(4)}
                      onBlur={(e) => handleUpdateDetalle(det.id, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!cargo ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <input 
                          type="number"
                          className="inline-edit-input"
                          style={{ width: 45, textAlign: 'right', color: 'var(--color-warning)' }}
                          defaultValue={det.desperdicio_pct || 0}
                          onBlur={(e) => handleUpdateDetalle(det.id, 'desperdicio_pct', e.target.value)}
                        />
                        <span style={{ fontSize: 10, color: 'var(--color-warning)' }}>%</span>
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(precio)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(subtotal)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => dispatch({ type: 'DELETE_APU_DETALLE', payload: det.id })}>✕</button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>No hay {title.toLowerCase()} en este análisis.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '1000px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Editando APU</div>
            <h2 style={{ margin: 0 }}>{apu.codigo} — {apu.nombre}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          <section style={{ marginBottom: 24, padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 14 }}>Configuración del Análisis</h4>
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 16px' }}
              >
                💾 Guardar Cambios Básicos
              </button>
            </div>
            
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Nombre del Ítem</label>
                <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad de Medida</label>
                <select className="form-select" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rendimiento Base</label>
                <input type="number" step="0.01" className="form-input" value={form.rendimiento} onChange={(e) => setForm({ ...form, rendimiento: e.target.value })} />
              </div>
            </div>
          </section>

          {renderTable(materialesEquipos, 'Materiales, Equipos y Otros')}
          {renderTable(manoDeObra, 'Mano de Obra (Cargos)', true)}

          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Costo Unitario Total:</span>
            <span style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-accent)', fontSize: 20 }}>{formatCurrency(calcularCostoAPU(apu.id))}</span>
          </div>

          <section style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Añadir Componente</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', background: 'white', padding: 16, borderRadius: 8, border: '1px dashed #cbd5e1' }}>
              <div className="form-group" style={{ flex: '1 1 200px' }}>
                <label className="form-label" style={{ fontSize: 10 }}>Tipo / Recurso</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <select className="form-select" style={{ width: 140, fontSize: 11 }} value={detalleForm.tipo_linea} onChange={(e) => setDetalleForm({ ...detalleForm, tipo_linea: e.target.value, insumo_id: '', cargo_id: '', apu_hijo_id: '', unidad_detalle: '' })}>
                    <option value="insumo">Insumo</option>
                    <option value="cargo">Cargo (M.O.)</option>
                    {apu.tipo === 'COMPUESTO' && <option value="apu">Sub-APU</option>}
                  </select>
                  
                  {detalleForm.tipo_linea === 'insumo' && (
                    <select className="form-select" style={{ fontSize: 11 }} value={detalleForm.insumo_id} onChange={(e) => setDetalleForm({ ...detalleForm, insumo_id: e.target.value })}>
                      <option value="">Seleccionar insumo...</option>
                      {state.insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                    </select>
                  )}
                  {detalleForm.tipo_linea === 'cargo' && (
                    <select className="form-select" style={{ fontSize: 11 }} value={detalleForm.cargo_id} onChange={(e) => setDetalleForm({ ...detalleForm, cargo_id: e.target.value, unidad_detalle: 'Hora' })}>
                      <option value="">Seleccionar cargo...</option>
                      {state.cargos.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.unidad})</option>)}
                    </select>
                  )}
                  {detalleForm.tipo_linea === 'apu' && (
                    <select className="form-select" style={{ fontSize: 11 }} value={detalleForm.apu_hijo_id} onChange={(e) => setDetalleForm({ ...detalleForm, apu_hijo_id: e.target.value })}>
                      <option value="">Seleccionar sub-APU...</option>
                      {availableSubAPUs.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.unidad})</option>)}
                    </select>
                  )}
                </div>
              </div>

              {detalleForm.tipo_linea === 'cargo' && (
                <div className="form-group" style={{ width: 100 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Unidad Pago</label>
                  <select className="form-select" style={{ fontSize: 11 }} value={detalleForm.unidad_detalle || 'Hora'} onChange={(e) => setDetalleForm({ ...detalleForm, unidad_detalle: e.target.value })}>
                    <option value="Hora">Hora</option>
                    <option value="Día">Día</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ width: 110 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Rendimiento</label>
                <input type="number" step="0.01" className="form-input" style={{ fontSize: 11 }} value={detalleForm.rendimiento} onChange={(e) => handleRendimientoChange(e.target.value)} placeholder="Ej: 10" />
              </div>

              <div className="form-group" style={{ width: 110 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Cantidad</label>
                <input type="number" step="0.01" className="form-input" style={{ fontSize: 11 }} value={detalleForm.cantidad} onChange={(e) => handleCantidadChange(e.target.value)} placeholder="Ej: 0.1" />
              </div>

              {detalleForm.tipo_linea !== 'cargo' && (
                <div className="form-group" style={{ width: 70 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Desp. %</label>
                  <input type="number" className="form-input" style={{ fontSize: 11 }} value={detalleForm.desperdicio_pct} onChange={(e) => setDetalleForm({ ...detalleForm, desperdicio_pct: e.target.value })} />
                </div>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleAddDetalle} style={{ height: 32 }}>+ Agregar</button>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <div style={{ flex: 1, fontSize: 11, color: '#64748b' }}>
            * Los componentes se guardan automáticamente al añadirlos. Use el botón superior para actualizar nombre/unidad.
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ marginRight: 8 }}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { handleSubmit({ preventDefault: () => {} }); onClose(); }}>
            ✔️ Guardar y Cerrar Editor
          </button>
        </div>
      </div>
    </div>
  );
}
