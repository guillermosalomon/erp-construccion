'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { storageService } from '@/lib/services';
import { calcularStockBodegas } from '@/lib/compras-engine';
import BodegaObraView from './BodegaObraView';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v) || 0);

export default function LogisticsView({ contextProyectoId }) {
  const { state, dispatch } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const effectiveProyectoId = contextProyectoId || selectedProyectoId;
  const currentBodega = state.bodegas.find(b => b.proyecto_id === effectiveProyectoId);

  // Red de bodegas de obra (vista general sin proyecto seleccionado)
  const red = useMemo(() => {
    if (effectiveProyectoId) return [];
    const stock = calcularStockBodegas({ inventario: state.inventario, ordenes: state.ordenesCompra, insumos: state.insumos, bodegas: state.bodegas });
    return state.bodegas.map(b => {
      const filas = stock.filter(s => s.bodega_id === b.id);
      return {
        bodega: b,
        proyecto: state.proyectos.find(p => p.id === b.proyecto_id),
        materiales: filas.filter(s => s.disponible > 0).length,
        valor: filas.reduce((s, r) => s + Math.max(0, r.disponible) * (Number(r.costo_unitario) || 0), 0),
      };
    }).sort((a, b) => b.valor - a.valor);
  }, [effectiveProyectoId, state.inventario, state.ordenesCompra, state.insumos, state.bodegas, state.proyectos]);

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
        const cantidad = Number(item.cantidad) || 1;
        const costoUnitario = Number(item.costo_unitario) || 0;
        dispatch({
          type: 'ADD_INVENTARIO_MOV',
          payload: {
            id: crypto.randomUUID(),
            bodega_id: currentBodega.id,
            insumo_id: item.mapped_insumo,
            tipo: 'ENTRADA',
            origen: 'COMPRA',
            cantidad,
            motivo: 'Lectura automatizada Gemini OCR',
            distribuidor: aiResult.distribuidor,
            costo_unitario: costoUnitario,
            costo_real: Math.round(costoUnitario * cantidad),
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
            <h1>Logística &amp; Bodegas de Obra</h1>
            <div className="page-header-subtitle">Cada obra es una bodega de la red Kalarti</div>
          </div>
          <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)} style={{ width: 300 }}>
            <option value="">Red de bodegas (todas las obras)</option>
            {state.proyectos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
        </div>
      )}

      {!effectiveProyectoId ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Red de bodegas de obra</h3></div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bodega</th>
                  <th>Proyecto</th>
                  <th>Municipio</th>
                  <th style={{ textAlign: 'right' }}>Materiales disponibles</th>
                  <th style={{ textAlign: 'right' }}>Valor disponible</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {red.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No hay bodegas de obra registradas.</td></tr>
                ) : red.map(r => (
                  <tr key={r.bodega.id}>
                    <td style={{ fontWeight: 600 }}>{r.bodega.nombre}</td>
                    <td>{r.proyecto?.nombre || '—'}</td>
                    <td>{r.bodega.municipio || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.materiales}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.valor)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.bodega.proyecto_id && <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProyectoId(r.bodega.proyecto_id)}>Ver bodega</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <BodegaObraView proyectoId={effectiveProyectoId} onOpenAI={() => setShowAIModal(true)} />
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
                            <td>${Number(item.costo_unitario || 0).toLocaleString()}</td>
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
              {aiResult && <button className="btn btn-primary" disabled={isProcessingAI || !currentBodega} onClick={handleImportAI}>{isProcessingAI ? 'Subiendo...' : 'Confirmar e Ingresar a Bodega'}</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
