'use client';

import { useState, useMemo } from 'react';
import APUModal from './APUModal';
import { useStore } from '@/store/StoreContext';

const UNIDADES = ['un', 'kg', 'm', 'm2', 'm3', 'lt', 'gl', 'hr', 'día', 'viaje', 'saco'];

const emptyForm = {
  nombre: '',
  descripcion: '',
  unidad: 'm3',
  rendimiento: '1',
};

export default function APUView({ tipo = 'BASICO' }) {
  const { state, dispatch, calcularCostoAPU } = useStore();
  const [activeApuId, setActiveApuId] = useState(null);
  const [showApuModal, setShowApuModal] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detalleForm, setDetalleForm] = useState({ 
    tipo_linea: 'insumo', 
    insumo_id: '', 
    cargo_id: '', 
    apu_hijo_id: '', 
    cantidad: '', 
    rendimiento: '',
    unidad_detalle: '',
    desperdicio_pct: '0' 
  });

  const isCompuesto = tipo === 'COMPUESTO';
  const title = isCompuesto ? 'APU Compuestos' : 'APU Básicos';
  const subtitle = isCompuesto
    ? 'Actividades de obra compuestas por APUs básicos y/o insumos'
    : 'Elementos básicos compuestos por insumos';

  const apusFiltered = useMemo(() => {
    return state.apus
      .filter((a) => a.tipo === tipo)
      .filter(
        (a) =>
          !search ||
          a.nombre.toLowerCase().includes(search.toLowerCase()) ||
          a.codigo.toLowerCase().includes(search.toLowerCase())
      );
  }, [state.apus, tipo, search]);

  const getDetalles = (apuId) =>
    state.apuDetalles.filter((d) => d.apu_id === apuId);

  const getInsumo = (id) => state.insumos.find((i) => i.id === id);
  const getAPU = (id) => state.apus.find((a) => a.id === id);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(val);

  const generateId = () => {
    try { return crypto.randomUUID(); } catch(e) { return Math.random().toString(36).substr(2, 9); }
  };

  // ── CRUD APU ──
  const openCreate = () => {
    const nombre = prompt('Nombre del nuevo APU:');
    if (!nombre) return;
    
    const newId = generateId();
    const payload = { 
      id: newId, // Asignamos ID desde aquí para poder abrir el modal inmediatamente
      nombre, 
      tipo, 
      v_presupuesto: 0, 
      unidad: 'un', 
      rendimiento: 1,
      codigo: newId.slice(0, 8).toUpperCase()
    };
    
    dispatch({ type: 'ADD_APU', payload });
    
    // Abrir el editor automáticamente para el nuevo APU
    setActiveApuId(newId);
    setShowApuModal(true);
  };

  const openEdit = (apu) => {
    setActiveApuId(apu.id);
    setShowApuModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este APU y todas sus líneas de detalle?')) {
      dispatch({ type: 'DELETE_APU', payload: id });
      if (expandedId === id) setExpandedId(null);
    }
  };

  // ── CRUD Detalle lines ──
  const handleAddDetalle = (apuId) => {
    const payload = {
      apu_id: apuId,
      insumo_id: detalleForm.tipo_linea === 'insumo' ? detalleForm.insumo_id : null,
      cargo_id: detalleForm.tipo_linea === 'cargo' ? detalleForm.cargo_id : null,
      apu_hijo_id: detalleForm.tipo_linea === 'apu' ? detalleForm.apu_hijo_id : null,
      cantidad: parseFloat(detalleForm.cantidad) || 0,
      rendimiento: parseFloat(detalleForm.rendimiento) || null,
      unidad_detalle: detalleForm.unidad_detalle || null,
      desperdicio_pct: parseFloat(detalleForm.desperdicio_pct) || 0,
    };

    if ((!payload.insumo_id && !payload.apu_hijo_id && !payload.cargo_id) || payload.cantidad <= 0) return;
    if (payload.apu_hijo_id === apuId) {
      alert('Un APU no puede contenerse a sí mismo.');
      return;
    }

    dispatch({ type: 'ADD_APU_DETALLE', payload });
    setDetalleForm({ ...detalleForm, insumo_id: '', cargo_id: '', apu_hijo_id: '', cantidad: '', rendimiento: '', unidad_detalle: '' });
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

  const handleDeleteDetalle = (detalleId) => {
    dispatch({ type: 'DELETE_APU_DETALLE', payload: detalleId });
  };

  // Available sub-APUs (for COMPUESTO only: show BASICO APUs, exclude self)
  const availableSubAPUs = state.apus.filter(
    (a) => a.id !== expandedId
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <div className="page-header-subtitle">{subtitle}</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo APU
        </button>
      </div>

      <div className="page-body">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-bar">
            <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="form-input"
              type="text"
              placeholder="Buscar APU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 280 }}
            />
          </div>
          <div className="toolbar-spacer" />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {apusFiltered.length} APU{apusFiltered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* APU List */}
        {apusFiltered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {apusFiltered.map((apu) => {
              const isExpanded = expandedId === apu.id;
              const detalles = getDetalles(apu.id);
              const costoTotal = calcularCostoAPU(apu.id);

              return (
                <div className="card" key={apu.id}>
                  {/* APU Header Row */}
                  <div
                    className="card-header"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : apu.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <span style={{ fontSize: 18, transition: 'transform 200ms', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
                        ▸
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <code style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{apu.codigo}</code>
                          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{apu.nombre}</h3>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {apu.unidad} · Rend: {apu.rendimiento} · {detalles.length} línea{detalles.length !== 1 ? 's' : ''}
                          {apu.descripcion && ` · ${apu.descripcion}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="currency" style={{ fontWeight: 700, fontSize: 16 }}>
                          {formatCurrency(costoTotal)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>por {apu.unidad}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(apu)} title="Editar">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(apu.id)} title="Eliminar" style={{ color: 'var(--color-danger)' }}>🗑️</button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Details */}
                  {isExpanded && (
                    <div className="card-body" style={{ padding: 0 }}>
                      {/* Detail lines table */}
                      {detalles.length > 0 && (
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Tipo</th>
                                <th>Recurso</th>
                                <th>Unidad</th>
                                <th style={{ textAlign: 'right' }}>Rendimiento</th>
                                <th style={{ textAlign: 'right' }}>Cantidad</th>
                                <th style={{ textAlign: 'right' }}>Desp. %</th>
                                <th style={{ textAlign: 'right' }}>P. Unit.</th>
                                <th style={{ textAlign: 'right' }}>Subtotal</th>
                                <th style={{ width: 40 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalles.map((det) => {
                                let recursoNombre = '—';
                                let recursoUnidad = '';
                                let precioUnit = 0;

                                if (det.insumo_id) {
                                  const ins = getInsumo(det.insumo_id);
                                  if (ins) {
                                    recursoNombre = ins.nombre;
                                    recursoUnidad = ins.unidad;
                                    precioUnit = Number(ins.precio_unitario) || 0;
                                  }
                                } else if (det.cargo_id) {
                                  const cargo = state.cargos.find(c => c.id === det.cargo_id);
                                  if (cargo) {
                                    recursoNombre = cargo.nombre;
                                    recursoUnidad = det.unidad_detalle || cargo.unidad;
                                    precioUnit = Number(cargo.precio_unitario) || 0;

                                    // Conversión de precio si aplica
                                    if (det.unidad_detalle) {
                                      const uCargo = cargo.unidad?.toLowerCase();
                                      const uDet = det.unidad_detalle?.toLowerCase();
                                      const h_mes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
                                      const h_dia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;

                                      let p_hr = precioUnit;
                                      if (uCargo === 'mes') p_hr = precioUnit / h_mes;
                                      else if (uCargo === 'día' || uCargo === 'dia') p_hr = precioUnit / h_dia;

                                      if (uDet === 'hora' || uDet === 'hr') precioUnit = p_hr;
                                      else if (uDet === 'día' || uDet === 'dia') precioUnit = p_hr * h_dia;
                                    }
                                  }
                                } else if (det.apu_hijo_id) {
                                  const subApu = getAPU(det.apu_hijo_id);
                                  if (subApu) {
                                    recursoNombre = `[APU] ${subApu.nombre}`;
                                    recursoUnidad = subApu.unidad;
                                    precioUnit = calcularCostoAPU(subApu.id);
                                  }
                                }

                                const cant = Number(det.cantidad) || 0;
                                const desp = Number(det.desperdicio_pct) || 0;
                                
                                // Subtotal simplificado (Cantidad * Precio)
                                const subtotal = det.cargo_id 
                                  ? (precioUnit * cant)
                                  : (cant * (1 + desp / 100) * precioUnit);

                                return (
                                  <tr key={det.id}>
                                    <td>
                                      <span className={`tag ${det.insumo_id ? 'tag-material' : (det.cargo_id ? 'tag-labor' : 'tag-compuesto')}`} style={{ fontSize: 10 }}>
                                        {det.insumo_id ? 'Insumo' : (det.cargo_id ? 'M.O.' : 'APU')}
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{recursoNombre}</td>
                                    <td>{recursoUnidad}</td>
                                    <td style={{ textAlign: 'right' }}>
                                      {det.cargo_id ? Number(det.cantidad || 0).toFixed(2) : (Number(det.cantidad) > 0 ? (1/Number(det.cantidad)).toFixed(2) : '—')}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{cant.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{det.cargo_id ? '—' : `${desp}%`}</td>
                                    <td style={{ textAlign: 'right' }}>
                                      <span className="currency">{formatCurrency(precioUnit)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <span className="currency" style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                                    </td>
                                    <td>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleDeleteDetalle(det.id)}
                                        style={{ color: 'var(--color-danger)' }}
                                        title="Quitar línea"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Total row */}
                              <tr style={{ background: 'var(--color-bg)' }}>
                                <td colSpan={6} style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                  COSTO TOTAL
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className="currency" style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-accent)' }}>
                                    {formatCurrency(costoTotal)}
                                  </span>
                                </td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {detalles.length === 0 && (
                        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                          Sin líneas de detalle. Agrega insumos{isCompuesto ? ' o sub-APUs' : ''} debajo.
                        </div>
                      )}

                      {/* Add detail line */}
                      <div style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderTop: '1px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 'var(--space-sm)',
                        flexWrap: 'wrap',
                      }}>
                          {isCompuesto && (
                          <div className="form-group" style={{ minWidth: 100 }}>
                            <label className="form-label" style={{ fontSize: 10 }}>Tipo línea</label>
                            <select
                              className="form-select"
                              value={detalleForm.tipo_linea}
                              onChange={(e) => setDetalleForm({ ...detalleForm, tipo_linea: e.target.value, insumo_id: '', cargo_id: '', apu_hijo_id: '', unidad_detalle: '' })}
                              style={{ fontSize: 12 }}
                            >
                              <option value="insumo">Insumo</option>
                              <option value="cargo">Cargo (M.O.)</option>
                              <option value="apu">Sub-APU</option>
                            </select>
                          </div>
                          )}

                        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                          <label className="form-label" style={{ fontSize: 10 }}>
                            {detalleForm.tipo_linea === 'insumo' ? 'Insumo' : (detalleForm.tipo_linea === 'cargo' ? 'Cargo' : 'APU')}
                          </label>
                          {detalleForm.tipo_linea === 'insumo' ? (
                            <select
                              className="form-select"
                              value={detalleForm.insumo_id}
                              onChange={(e) => setDetalleForm({ ...detalleForm, insumo_id: e.target.value })}
                              style={{ fontSize: 12 }}
                            >
                              <option value="">Seleccionar insumo...</option>
                              {state.insumos.map((ins) => (
                                <option key={ins.id} value={ins.id}>
                                  {ins.codigo} — {ins.nombre} ({ins.unidad}) — {formatCurrency(ins.precio_unitario)}
                                </option>
                              ))}
                            </select>
                          ) : detalleForm.tipo_linea === 'cargo' ? (
                            <select
                              className="form-select"
                              value={detalleForm.cargo_id}
                              onChange={(e) => setDetalleForm({ ...detalleForm, cargo_id: e.target.value, unidad_detalle: 'Hora' })}
                              style={{ fontSize: 12 }}
                            >
                              <option value="">Seleccionar cargo...</option>
                              {state.cargos.map((cargo) => (
                                <option key={cargo.id} value={cargo.id}>
                                  {cargo.nombre} ({cargo.unidad}) — {formatCurrency(cargo.precio_unitario)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="form-select"
                              value={detalleForm.apu_hijo_id}
                              onChange={(e) => setDetalleForm({ ...detalleForm, apu_hijo_id: e.target.value })}
                              style={{ fontSize: 12 }}
                            >
                              <option value="">Seleccionar APU...</option>
                              {availableSubAPUs.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.codigo} — {a.nombre} ({a.unidad}) — {formatCurrency(calcularCostoAPU(a.id))}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {detalleForm.tipo_linea === 'cargo' && (
                          <div className="form-group" style={{ width: 110 }}>
                            <label className="form-label" style={{ fontSize: 10 }}>Unidad Pago</label>
                            <select
                              className="form-select"
                              value={detalleForm.unidad_detalle || 'Hora'}
                              onChange={(e) => setDetalleForm({ ...detalleForm, unidad_detalle: e.target.value })}
                              style={{ fontSize: 12 }}
                            >
                              <option value="Hora">Hora</option>
                              <option value="Día">Día</option>
                            </select>
                          </div>
                        )}

                        <div className="form-group" style={{ width: 90 }}>
                          <label className="form-label" style={{ fontSize: 10 }}>
                            {detalleForm.tipo_linea === 'cargo' ? 'Tiempo (R)' : 'Rendimiento'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={detalleForm.rendimiento}
                            onChange={(e) => setDetalleForm({ 
                              ...detalleForm, 
                              rendimiento: e.target.value, 
                              cantidad: detalleForm.tipo_linea === 'cargo' ? e.target.value : (e.target.value > 0 ? (1/e.target.value).toFixed(4) : 0) 
                            })}
                            style={{ fontSize: 12 }}
                            placeholder="Ej: 8"
                          />
                        </div>

                        <div className="form-group" style={{ width: 90 }}>
                          <label className="form-label" style={{ fontSize: 10 }}>Cantidad</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={detalleForm.cantidad}
                            onChange={(e) => setDetalleForm({ 
                              ...detalleForm, 
                              cantidad: e.target.value, 
                              rendimiento: e.target.value > 0 ? (1/e.target.value).toFixed(2) : 0 
                            })}
                            style={{ fontSize: 12 }}
                            placeholder="0.125"
                          />
                        </div>

                        {detalleForm.tipo_linea !== 'cargo' && (
                          <div className="form-group" style={{ width: 80 }}>
                            <label className="form-label" style={{ fontSize: 10 }}>Desp. %</label>
                            <input
                              type="number"
                              className="form-input"
                              value={detalleForm.desperdicio_pct}
                              onChange={(e) => setDetalleForm({ ...detalleForm, desperdicio_pct: e.target.value })}
                              style={{ fontSize: 12 }}
                            />
                          </div>
                        )}

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddDetalle(apu.id)}
                          style={{ marginBottom: 1 }}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">{isCompuesto ? '🏗️' : '🧱'}</div>
              <h3>No hay {title.toLowerCase()}</h3>
              <p>
                {search
                  ? 'No se encontraron resultados.'
                  : `Crea tu primer APU ${isCompuesto ? 'compuesto' : 'básico'} para comenzar.`}
              </p>
              {!search && (
                <button className="btn btn-primary" onClick={openCreate}>
                  + Crear APU
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <APUModal 
        apuId={activeApuId} 
        isOpen={showApuModal} 
        onClose={() => setShowApuModal(false)} 
      />
    </>
  );
}
