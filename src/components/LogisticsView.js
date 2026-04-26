'use client';

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { storageService } from '@/lib/services';

export default function LogisticsView({ contextProyectoId }) {
  const { state, dispatch } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [showInoutModal, setShowInoutModal] = useState(false);
  const [inoutType, setInoutType] = useState('ENTRADA');
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [qty, setQty] = useState('');
  const [motivo, setMotivo] = useState('');
  const [distribuidor, setDistribuidor] = useState('');
  const [costoReal, setCostoReal] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const effectiveProyectoId = contextProyectoId || selectedProyectoId;

  const currentProyecto = state.proyectos.find(p => p.id === effectiveProyectoId);
  const currentBodega = state.bodegas.find(b => b.proyecto_id === effectiveProyectoId);
  const projectTransactions = state.inventario.filter(t => t.bodega_id === currentBodega?.id);

  const calculateStock = (insumoId) => {
    return projectTransactions
      .filter(t => t.insumo_id === insumoId)
      .reduce((sum, t) => sum + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)), 0);
  };

  const handleCreateBodega = () => {
    if (!effectiveProyectoId) return;
    dispatch({
      type: 'ADD_BODEGA',
      payload: { proyecto_id: effectiveProyectoId, nombre: `Bodega - ${currentProyecto?.nombre}` }
    });
  };

  const handleInout = () => {
    if (!currentBodega || !selectedInsumoId || !qty) return;
    dispatch({
      type: 'ADD_INVENTARIO_MOV',
      payload: {
        bodega_id: currentBodega.id,
        insumo_id: selectedInsumoId,
        tipo: inoutType,
        cantidad: Number(qty),
        motivo: motivo || (inoutType === 'ENTRADA' ? 'Ingreso manual' : 'Salida manual'),
        distribuidor: inoutType === 'ENTRADA' ? distribuidor : null,
        costo_real: inoutType === 'ENTRADA' ? Number(costoReal) : null,
      }
    });
    setShowInoutModal(false);
    setSelectedInsumoId('');
    setQty('');
    setMotivo('');
    setDistribuidor('');
    setCostoReal('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleProcessAI = async () => {
    if (!selectedFile) return;
    setIsProcessingAI(true);
    setAiResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/parse-invoice', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error parsing invoice');
      
      const itemsMapped = data.items.map(item => {
        const query = item.nombre_detectado.split(' ')[0].toLowerCase();
        const mapped = state.insumos.find(i => i.nombre.toLowerCase().includes(query));
        return { ...item, mapped_insumo: mapped?.id || '' };
      });

      setAiResult({
        distribuidor: data.distribuidor || 'Distribuidor Desconocido',
        items: itemsMapped
      });
    } catch (err) {
      alert("Error procesando imagen: " + err.message);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleImportAI = async () => {
    if (!aiResult || !currentBodega) return;

    let comprobanteUrl = null;
    try {
      if (selectedFile) {
        setIsProcessingAI(true);
        comprobanteUrl = await storageService.uploadInvoice(selectedFile);
      }
    } catch (error) {
      alert("Error subiendo archivo a Supabase Storage: " + error.message);
      setIsProcessingAI(false);
      return;
    }

    aiResult.items.forEach(item => {
      if (item.mapped_insumo) {
        dispatch({
          type: 'ADD_INVENTARIO_MOV',
          payload: {
            bodega_id: currentBodega.id,
            insumo_id: item.mapped_insumo,
            tipo: 'ENTRADA',
            cantidad: Number(item.cantidad) || 1,
            motivo: 'Lectura automatizada Gemini OCR',
            distribuidor: aiResult.distribuidor,
            costo_real: Number(item.costo_unitario) || 0,
            comprobante_url: comprobanteUrl
          }
        });
      }
    });
    
    setShowAIModal(false);
    setAiResult(null);
    setSelectedFile(null);
    setIsProcessingAI(false);
    alert('✅ Factura digitalizada, comprobante guardado y movimiento ingresado exitosamente.');
  };

  return (
    <>
      {!contextProyectoId && (
        <div className="page-header">
          <div>
            <h1>Logística & Bodega Móvil</h1>
            <div className="page-header-subtitle">Gestión de inventarios y suministros descentralizada</div>
          </div>
          <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)} style={{ width: 300 }}>
            <option value="">Seleccionar Proyecto para Ver Bodega...</option>
            {state.proyectos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
        </div>
      )}

      {!effectiveProyectoId ? (
        <div className="empty-state" style={{ marginTop: 100 }}>
          <div className="empty-state-icon">📦</div>
          <h3>Selecciona un proyecto para gestionar su inventario</h3>
        </div>
      ) : !currentBodega ? (
        <div className="empty-state" style={{ marginTop: 100 }}>
          <div className="empty-state-icon">⚠️</div>
          <h3>Este proyecto aún no tiene una bodega configurada</h3>
          <p>La bodega es necesaria para el descuento automático de materiales.</p>
          <button className="btn btn-primary" onClick={handleCreateBodega}>Configurar Bodega Ahora</button>
        </div>
      ) : (
        <div className="logistics-grid">
          <div className="stock-panel">
            <div className="panel-header">
              <h3>Existencias en Bodega</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAIModal(true)}>🤖 Ingresar con IA</button>
                <button className="btn btn-primary btn-sm" onClick={() => { setInoutType('ENTRADA'); setShowInoutModal(true); }}>+ Entrada/Salida</button>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Tipo</th>
                    <th>Unidad</th>
                    <th>Stock Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {state.insumos.map(insumo => {
                    const stock = calculateStock(insumo.id);
                    if (stock === 0) return null;
                    return (
                      <tr key={insumo.id}>
                        <td>{insumo.nombre}</td>
                        <td><span className={`tag tag-${insumo.tipo.toLowerCase().replace('_','-')}`}>{insumo.tipo}</span></td>
                        <td>{insumo.unidad}</td>
                        <td style={{ fontWeight: 800, color: stock < 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {stock.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {state.insumos.every(i => calculateStock(i.id) === 0) && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No hay materiales registrados en esta bodega.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="history-panel">
            <div className="panel-header"><h3>Historial de Movimientos</h3></div>
            <div className="timeline">
              {projectTransactions.slice().reverse().map(t => {
                const insumo = state.insumos.find(i => i.id === t.insumo_id);
                return (
                  <div key={t.id} className="timeline-item">
                    <div className="timeline-marker" style={{ background: t.tipo === 'ENTRADA' ? 'var(--color-success)' : 'var(--color-warning)' }} />
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <strong>{t.tipo}: {insumo?.nombre}</strong>
                        <span className="timeline-date">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      <div className="timeline-body">
                        {t.cantidad} {insumo?.unidad} — {t.motivo}
                      </div>
                    </div>
                  </div>
                );
              })}
              {projectTransactions.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>Sin movimientos registrados</div>}
            </div>
          </div>
        </div>
      )}

      {showInoutModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Nuevo Movimiento de Bodega</h2>
              <button className="btn-ghost" onClick={() => setShowInoutModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo de Operación</label>
                <select className="form-select" value={inoutType} onChange={(e) => setInoutType(e.target.value)}>
                  <option value="ENTRADA">ENTRADA (Compra/Ingreso)</option>
                  <option value="SALIDA">SALIDA (Consumo/Retiro)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Material / Insumo</label>
                <select className="form-select" value={selectedInsumoId} onChange={(e) => setSelectedInsumoId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {state.insumos.map(i => (<option key={i.id} value={i.id}>{i.codigo} - {i.nombre}</option>))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cantidad</label>
                  <input type="number" className="form-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.00" />
                </div>
                {inoutType === 'ENTRADA' && (
                  <div className="form-group">
                    <label className="form-label">Costo Unidad (Real)</label>
                    <input type="number" className="form-input" value={costoReal} onChange={(e) => setCostoReal(e.target.value)} placeholder="$" />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Concepto / Motivo</label>
                  <input type="text" className="form-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Factura 123 o Retiro para vigas" />
                </div>
                {inoutType === 'ENTRADA' && (
                  <div className="form-group">
                    <label className="form-label">Distribuidor</label>
                    <input type="text" className="form-input" value={distribuidor} onChange={(e) => setDistribuidor(e.target.value)} placeholder="Proveedor (Opcional)" />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInoutModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleInout}>Registrar Movimiento</button>
            </div>
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>🤖 Escáner de Facturas (Inteligencia Artificial)</h2>
              <button className="btn-ghost" onClick={() => setShowAIModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!aiResult ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="file-upload-box" style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 12, padding: 40, cursor: 'pointer' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>📸</div>
                    <h3>Seleccionar Factura / Remisión</h3>
                    <p style={{ color: '#64748b' }}>Soporta PDF o Imágenes (JPG/PNG)</p>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{ marginTop: 24, padding: 10, border: '1px solid #ccc', borderRadius: 6, display: 'block', margin: '15px auto', width: '80%' }}
                    />
                    <button 
                      className="btn btn-primary" 
                      style={{ marginTop: 10 }}
                      onClick={handleProcessAI}
                      disabled={isProcessingAI || !selectedFile}
                    >
                      {isProcessingAI ? '🔮 Gemini procesando...' : 'Analizar Factura con IA'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 10 }}>
                  <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <strong>✅ Lectura Exitosa.</strong> Gemini Vision extrajo los siguientes datos de la imagen:
                    <div style={{ marginTop: 8 }}><strong>Distribuidor:</strong> {aiResult.distribuidor}</div>
                  </div>
                  
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Material Detectado</th>
                        <th>Material en ERP (Matching)</th>
                        <th>Cantidad</th>
                        <th>Costo Unit (Real)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiResult.items.map((item, idx) => {
                        const erpItem = state.insumos.find(i => i.id === item.mapped_insumo);
                        return (
                          <tr key={idx}>
                            <td style={{ fontStyle: 'italic', color: '#64748b' }}>{item.nombre_detectado}</td>
                            <td style={{ fontWeight: 600 }}>{erpItem?.nombre || '⚠️ No Encontrado'}</td>
                            <td>{item.cantidad}</td>
                            <td>${item.costo_unitario.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" disabled={isProcessingAI} onClick={() => { setShowAIModal(false); setSelectedFile(null); }}>Cancelar</button>
              {aiResult && <button className="btn btn-primary" disabled={isProcessingAI} onClick={handleImportAI}>{isProcessingAI ? 'Subiendo...' : 'Confirmar e Ingresar a Bodega'}</button>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .logistics-grid { display: grid; grid-template-columns: 1fr 400px; gap: 20px; margin-top: 20px; height: calc(100vh - 180px); }
        .stock-panel, .history-panel { background: white; border-radius: 12px; border: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 16px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .table-container { flex: 1; overflow-y: auto; }
        .timeline { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
        .timeline-item { position: relative; padding-left: 24px; }
        .timeline-marker { position: absolute; left: 0; top: 6px; width: 10px; height: 10px; border-radius: 50%; }
        .timeline-item::after { content: ''; position: absolute; left: 4.5px; top: 16px; bottom: -20px; width: 1px; background: #e2e8f0; }
        .timeline-item:last-child::after { display: none; }
        .timeline-title { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
        .timeline-date { color: #94a3b8; font-size: 10px; }
        .timeline-body { font-size: 11px; color: #64748b; }
      `}</style>
    </>
  );
}
