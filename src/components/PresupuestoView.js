'use client';

import { useState, useMemo, useRef } from 'react';
import APUModal from './APUModal';
import { useStore, calculateEndDate } from '@/store/StoreContext';

export default function PresupuestoView({ proyectoId, onBack }) {
  const { state, dispatch, calcularCostoAPU, calcularPresupuesto } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addForm, setAddForm] = useState({ apu_id: '', cantidad: '', descripcion: '', capitulo: '', asignado_a_cuadrilla: '', fecha_inicio: '', num_cuadrillas: 1 });
  const [importPreview, setImportPreview] = useState(null);
  const [importMapping, setImportMapping] = useState({ cantidad_col: '', descripcion_col: '' });
  const [activeApuId, setActiveApuId] = useState(null);
  const [showApuModal, setShowApuModal] = useState(false);
  const fileInputRef = useRef(null);

  const proyecto = state.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;

  const items = state.presupuestoItems
    .filter((pi) => pi.proyecto_id === proyectoId)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const presupuesto = calcularPresupuesto(proyectoId);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // ── Group by chapter ──
  const chapters = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const cap = item.capitulo || 'Sin capítulo';
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap).push(item);
    });
    return map;
  }, [items]);

  // ── Add item ──
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!addForm.apu_id || !addForm.cantidad) return;
    dispatch({
      type: 'ADD_PRESUPUESTO_ITEM',
      payload: {
        proyecto_id: proyectoId,
        apu_id: addForm.apu_id,
        cantidad: parseFloat(addForm.cantidad) || 0,
        descripcion: addForm.descripcion,
        capitulo: addForm.capitulo,
        asignado_a_cuadrilla: addForm.asignado_a_cuadrilla,
        orden: items.length,
        fecha_inicio: addForm.fecha_inicio,
        num_cuadrillas: parseInt(addForm.num_cuadrillas) || 1,
      },
    });
    setAddForm({ apu_id: '', cantidad: '', descripcion: '', capitulo: '', asignado_a_cuadrilla: '', fecha_inicio: '', num_cuadrillas: 1 });
    setShowAddModal(false);
  };

  const handleDeleteItem = (id) => {
    dispatch({ type: 'DELETE_PRESUPUESTO_ITEM', payload: id });
  };

  const handleUpdateQuantity = (id, newCantidad) => {
    dispatch({ type: 'UPDATE_PRESUPUESTO_ITEM', payload: { id, cantidad: parseFloat(newCantidad) || 0 } });
  };

  // ── CSV Import ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return;

      // Detect separator
      const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map((h) => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map((line) =>
        line.split(sep).map((cell) => cell.replace(/"/g, '').trim())
      );

      setImportPreview({ headers, rows, sep, fileName: file.name });
      setImportMapping({ cantidad_col: '', descripcion_col: '' });
      setShowImportModal(true);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importPreview || !importMapping.cantidad_col) return;

    const cantIdx = importPreview.headers.indexOf(importMapping.cantidad_col);
    const descIdx = importMapping.descripcion_col
      ? importPreview.headers.indexOf(importMapping.descripcion_col)
      : -1;

    const newItems = importPreview.rows
      .filter((row) => {
        const val = parseFloat(row[cantIdx]);
        return !isNaN(val) && val > 0;
      })
      .map((row, idx) => ({
        proyecto_id: proyectoId,
        cantidad: parseFloat(row[cantIdx]) || 0,
        descripcion: descIdx >= 0 ? row[descIdx] : '',
        capitulo: 'Importado Revit',
        apu_id: '', // To be mapped later
        orden: items.length + idx,
      }));

    // For now, we add them with empty apu_id — user will map them
    dispatch({ type: 'ADD_PRESUPUESTO_ITEMS_BATCH', payload: newItems });
    setShowImportModal(false);
    setImportPreview(null);
  };

  // ── PDF Export ──
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const html = generatePrintHTML();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const generatePrintHTML = () => {
    let tableRows = '';
    let itemNum = 0;

    chapters.forEach((chapterItems, capName) => {
      const capSubtotal = chapterItems.reduce((s, item) => {
        return s + (calcularCostoAPU(item.apu_id) * (Number(item.cantidad) || 0));
      }, 0);

      tableRows += `<tr style="background:#f0f4ff;font-weight:600"><td colspan="6">${capName} — Subtotal: ${formatCurrency(capSubtotal)}</td></tr>`;

      chapterItems.forEach((item) => {
        itemNum++;
        const apu = state.apus.find((a) => a.id === item.apu_id);
        const costoUnit = calcularCostoAPU(item.apu_id);
        const subtotal = costoUnit * (Number(item.cantidad) || 0);
        tableRows += `<tr>
          <td>${itemNum}</td>
          <td>${apu?.codigo || '—'}</td>
          <td>${item.descripcion || apu?.nombre || '—'}</td>
          <td style="text-align:center">${apu?.unidad || '—'}</td>
          <td style="text-align:right">${Number(item.cantidad).toFixed(2)}</td>
          <td style="text-align:right">${formatCurrency(costoUnit)}</td>
          <td style="text-align:right;font-weight:500">${formatCurrency(subtotal)}</td>
        </tr>`;
      });
    });

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Presupuesto — ${proyecto.nombre}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; }
    th { background: #333; color: #fff; font-size: 10px; text-transform: uppercase; }
    .summary { margin-top: 12px; }
    .summary td { border: none; padding: 2px 8px; }
    .summary .label { text-align: right; font-weight: 500; }
    .summary .value { text-align: right; font-weight: 700; font-family: monospace; }
    .total-row { font-size: 14px; border-top: 2px solid #333; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Presupuesto: ${proyecto.nombre}</h1>
  <div class="meta">
    ${proyecto.cliente ? `Cliente: ${proyecto.cliente}<br/>` : ''}
    ${proyecto.ubicacion ? `Ubicación: ${proyecto.ubicacion}<br/>` : ''}
    Fecha: ${new Date().toLocaleDateString('es-CO')}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Código</th>
        <th>Descripción</th>
        <th>Unidad</th>
        <th>Cantidad</th>
        <th>V. Unitario</th>
        <th>V. Total</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <table class="summary" style="width:320px;margin-left:auto">
    <tr><td class="label">Costo Directo:</td><td class="value">${formatCurrency(presupuesto.costoDirecto)}</td></tr>
    <tr><td class="label">Administración (${presupuesto.pctAdmin}%):</td><td class="value">${formatCurrency(presupuesto.admin)}</td></tr>
    <tr><td class="label">Imprevistos (${presupuesto.pctImprev}%):</td><td class="value">${formatCurrency(presupuesto.imprevistos)}</td></tr>
    <tr><td class="label">Utilidad (${presupuesto.pctUtil}%):</td><td class="value">${formatCurrency(presupuesto.utilidad)}</td></tr>
    <tr class="total-row"><td class="label">TOTAL PRESUPUESTO:</td><td class="value">${formatCurrency(presupuesto.gran_total)}</td></tr>
  </table>
</body>
</html>`;
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {onBack && (
            <button className="btn btn-ghost" onClick={onBack} title="Volver a proyectos">
              ← Atrás
            </button>
          )}
          <div>
            <h1>Presupuesto: {proyecto.nombre}</h1>
            <div className="page-header-subtitle">
              {proyecto.cliente && `${proyecto.cliente} · `}
              {items.length} ítem{items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            📤 Importar CSV (Revit)
          </button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            📄 Exportar PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Agregar Ítem
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* AIU Summary Bar */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-label">Costo Directo</div>
            <div className="currency" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(presupuesto.costoDirecto)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Administración ({presupuesto.pctAdmin}%)</div>
            <div className="currency" style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(presupuesto.admin)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Imprevistos ({presupuesto.pctImprev}%)</div>
            <div className="currency" style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(presupuesto.imprevistos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Utilidad ({presupuesto.pctUtil}%)</div>
            <div className="currency" style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(presupuesto.utilidad)}</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--color-accent)', border: 'none' }}>
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Presupuesto</div>
            <div className="currency" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {formatCurrency(presupuesto.gran_total)}
            </div>
          </div>
        </div>

        {/* Items Table grouped by chapter */}
        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[...chapters.entries()].map(([capName, capItems]) => {
              const capSubtotal = capItems.reduce((s, item) => {
                return s + (calcularCostoAPU(item.apu_id) * (Number(item.cantidad) || 0));
              }, 0);

              return (
                <div className="card" key={capName}>
                  <div className="card-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      📁 {capName}
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                        ({capItems.length} ítem{capItems.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                    <span className="currency" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      {formatCurrency(capSubtotal)}
                    </span>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>APU</th>
                          <th>Descripción</th>
                          <th style={{ width: 150 }}>Personal Asignado</th>
                          <th style={{ width: 60 }}>Und</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Cantidad</th>
                          <th style={{ width: 100 }}>Inicio</th>
                          <th style={{ width: 100 }}>Fin</th>
                          <th style={{ width: 110, textAlign: 'right' }}>V. Unitario</th>
                          <th style={{ width: 120, textAlign: 'right' }}>V. Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {capItems.map((item, idx) => {
                          const apu = state.apus.find((a) => a.id === item.apu_id);
                          const costoUnit = apu ? calcularCostoAPU(apu.id) : 0;
                          const subtotal = costoUnit * (Number(item.cantidad) || 0);

                          // Personal disponible en este proyecto (vínculo dinámico)
                          const projectPersonnel = [...new Map(
                            state.personalProyecto
                              .filter(pp => pp.proyecto_id === proyectoId)
                              .map(pp => state.personal.find(p => p.id === pp.personal_id))
                              .filter(Boolean)
                              .map(p => [p.id, p])
                          ).values()];

                          return (
                            <tr key={item.id}>
                              <td style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}</td>
                              <td style={{ verticalAlign: 'top', padding: '8px 12px' }}>
                                {apu ? (
                                  <div style={{ position: 'relative', width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1 }}>
                                        <code style={{ fontSize: 10, color: 'var(--color-text-tertiary)', background: '#f8fafc', padding: '1px 4px', borderRadius: 4 }}>{apu.codigo}</code>
                                        <div style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{apu.nombre}</div>
                                      </div>
                                      <button 
                                        className="btn btn-ghost btn-sm" 
                                        style={{ padding: '2px', fontSize: 14 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveApuId(apu.id);
                                          setShowApuModal(true);
                                        }}
                                        title="Editar APU"
                                      >
                                        ✏️
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--color-warning)', fontSize: 11 }}>⚠ APU no asignado</span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={item.descripcion || ''}
                                  onChange={(e) => dispatch({ 
                                    type: 'UPDATE_PRESUPUESTO_ITEM', 
                                    payload: { id: item.id, descripcion: e.target.value } 
                                  })}
                                  placeholder="Agregar descripción..."
                                  style={{ height: 26, fontSize: 11, padding: '2px 6px', width: '100%', minWidth: 120, border: '1px transparent solid', background: 'transparent' }}
                                  onFocus={(e) => e.target.style.border = '1px solid var(--color-border)'}
                                  onBlur={(e) => e.target.style.border = '1px transparent solid'}
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select"
                                  style={{ fontSize: 11, height: 28, padding: '0 4px', width: '100%' }}
                                  value={item.asignado_a_cuadrilla || ''}
                                  onChange={(e) => dispatch({ 
                                    type: 'UPDATE_PRESUPUESTO_ITEM', 
                                    payload: { id: item.id, asignado_a_cuadrilla: e.target.value } 
                                  })}
                                >
                                  <option value="">(No asignado)</option>
                                  {projectPersonnel.map(p => (
                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ textAlign: 'center' }}>{apu?.unidad || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={item.cantidad}
                                  onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                                  step="0.01"
                                  min="0"
                                  style={{ height: 26, fontSize: 11, textAlign: 'right', padding: '2px 4px' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  className="form-input"
                                  value={item.fecha_inicio || ''}
                                  onChange={(e) => dispatch({ type: 'UPDATE_PRESUPUESTO_ITEM', payload: { id: item.id, fecha_inicio: e.target.value } })}
                                  style={{ width: 105, padding: '2px 4px', fontSize: 11, height: 26 }}
                                />
                              </td>
                              <td style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                {(() => {
                                  if (item.fecha_fin) return formatDate(item.fecha_fin);
                                  if (item.fecha_inicio) {
                                    const rend = parseFloat(apu?.rendimiento) || 1;
                                    const cuand = parseInt(item.num_cuadrillas) || 1;
                                    const days = Math.ceil(item.cantidad / (rend * cuand)) || 1;
                                    return formatDate(calculateEndDate(item.fecha_inicio, days));
                                  }
                                  return '—';
                                })()}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="currency" style={{ fontSize: 11 }}>{formatCurrency(costoUnit)}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="currency" style={{ fontWeight: 700, fontSize: 11 }}>{formatCurrency(subtotal)}</span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  style={{ color: 'var(--color-danger)', padding: '2px 6px' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>Presupuesto vacío</h3>
              <p>Agrega ítems de APU o importa cantidades desde un archivo CSV de Revit.</p>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Agregar Ítem</button>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>📤 Importar CSV</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agregar Ítem al Presupuesto</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">APU *</label>
                  <select
                    className="form-select"
                    value={addForm.apu_id}
                    onChange={(e) => setAddForm({ ...addForm, apu_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar APU...</option>
                    <optgroup label="APU Básicos">
                      {state.apus.filter((a) => a.tipo === 'BASICO').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo} — {a.nombre} ({a.unidad}) — {formatCurrency(calcularCostoAPU(a.id))}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="APU Compuestos">
                      {state.apus.filter((a) => a.tipo === 'COMPUESTO').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo} — {a.nombre} ({a.unidad}) — {formatCurrency(calcularCostoAPU(a.id))}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cantidad *</label>
                    <input
                      type="number"
                      className="form-input"
                      step="0.01"
                      min="0"
                      value={addForm.cantidad}
                      onChange={(e) => setAddForm({ ...addForm, cantidad: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capítulo</label>
                    <input
                      className="form-input"
                      value={addForm.capitulo}
                      onChange={(e) => setAddForm({ ...addForm, capitulo: e.target.value })}
                      placeholder="Ej: Cimentación, Estructura..."
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha de Inicio</label>
                    <input
                      type="date"
                      className="form-input"
                      value={addForm.fecha_inicio}
                      onChange={(e) => setAddForm({ ...addForm, fecha_inicio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">N° de Cuadrillas</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={addForm.num_cuadrillas}
                      onChange={(e) => setAddForm({ ...addForm, num_cuadrillas: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input
                    className="form-input"
                    value={addForm.descripcion}
                    onChange={(e) => setAddForm({ ...addForm, descripcion: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    👷 Asignar a Cuadrilla <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'normal' }}>(Opcional)</span>
                  </label>
                  <input
                    className="form-input"
                    value={addForm.asignado_a_cuadrilla}
                    onChange={(e) => setAddForm({ ...addForm, asignado_a_cuadrilla: e.target.value })}
                    placeholder="Ej: cuadrilla1@obra.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Agregar al Presupuesto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && importPreview && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Importar desde CSV — {importPreview.fileName}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'var(--color-accent-light)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                marginBottom: 'var(--space-md)',
              }}>
                📋 Se detectaron <strong>{importPreview.headers.length}</strong> columnas y <strong>{importPreview.rows.length}</strong> filas.
                Selecciona qué columna contiene las cantidades.
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Columna de Cantidad *</label>
                  <select
                    className="form-select"
                    value={importMapping.cantidad_col}
                    onChange={(e) => setImportMapping({ ...importMapping, cantidad_col: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Columna de Descripción</label>
                  <select
                    className="form-select"
                    value={importMapping.descripcion_col}
                    onChange={(e) => setImportMapping({ ...importMapping, descripcion_col: e.target.value })}
                  >
                    <option value="">Ninguna</option>
                    {importPreview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview table */}
              <div style={{ marginTop: 'var(--space-md)', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Vista previa (primeras 5 filas):</div>
                <div className="table-container" style={{ maxHeight: 200, overflow: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {importPreview.headers.map((h) => (
                          <th key={h} style={{
                            background: h === importMapping.cantidad_col ? 'var(--color-accent)' :
                              h === importMapping.descripcion_col ? '#16a34a' : undefined,
                            color: (h === importMapping.cantidad_col || h === importMapping.descripcion_col) ? '#fff' : undefined,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleImportConfirm}
                disabled={!importMapping.cantidad_col}
              >
                Importar {importPreview.rows.length} filas
              </button>
            </div>
          </div>
        </div>
      )}

      {activeApuId && (
        <APUModal 
          apuId={activeApuId} 
          isOpen={showApuModal} 
          onClose={() => setShowApuModal(false)} 
        />
      )}
    </>
  );
}
