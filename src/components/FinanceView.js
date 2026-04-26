'use client';

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';

export default function FinanceView({ contextProyectoId }) {
  const { state, dispatch, calculateExecutionValue, calculateTotalPayments, calcularPresupuesto } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pago, setPago] = useState({ valor_bruto: '', iva: 19, retencion: 5, fecha: new Date().toISOString().split('T')[0] });

  const effectiveProyectoId = contextProyectoId || selectedProyectoId;

  const currentProyecto = state.proyectos.find(p => p.id === effectiveProyectoId);
  const projectPayments = state.pagos.filter(p => p.proyecto_id === effectiveProyectoId);
  
  const execVal = calculateExecutionValue(effectiveProyectoId);
  const payVal = calculateTotalPayments(effectiveProyectoId);
  const presupuesto = calcularPresupuesto(effectiveProyectoId);
  
  const balance = payVal - execVal;
  const payPct = presupuesto.gran_total > 0 ? (payVal / presupuesto.gran_total) * 100 : 0;
  const execPct = presupuesto.gran_total > 0 ? (execVal / presupuesto.gran_total) * 100 : 0;

  const handleAddPayment = () => {
    const bruto = parseFloat(pago.valor_bruto) || 0;
    const ivaVal = (bruto * (parseFloat(pago.iva) || 0)) / 100;
    const retVal = (bruto * (parseFloat(pago.retencion) || 0)) / 100;
    const neto = bruto + ivaVal - retVal;

    dispatch({
      type: 'ADD_PAGO',
      payload: {
        proyecto_id: effectiveProyectoId,
        valor_bruto: bruto,
        iva: ivaVal,
        retencion_garantia: retVal,
        valor_neto: neto,
        fecha: pago.fecha
      }
    });
    setShowPaymentModal(false);
    setPago({ valor_bruto: '', iva: 19, retencion: 5, fecha: new Date().toISOString().split('T')[0] });
  };

  return (
    <>
      {!contextProyectoId && (
        <div className="page-header">
          <div>
            <h1>Control Financiero & Actas</h1>
            <div className="page-header-subtitle">Equilibrio contractual y flujo de caja del proyecto</div>
          </div>
          <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)} style={{ width: 300 }}>
            <option value="">Seleccionar Proyecto para Analizar...</option>
            {state.proyectos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
        </div>
      )}

      {!effectiveProyectoId ? (
        <div className="empty-state" style={{ marginTop: 100 }}>
          <div className="empty-state-icon">💰</div>
          <h3>Selecciona un proyecto para ver su estado financiero</h3>
        </div>
      ) : (
        <div className="finance-grid">
          <div className="stats-row" style={{ gridColumn: '1 / span 2', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Total Presupuesto</div>
              <div className="stat-value text-primary">${presupuesto.gran_total.toLocaleString()}</div>
              <div className="stat-sub">Costo Directo + AIU</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Ejecución Real</div>
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>${execVal.toLocaleString()}</div>
              <div className="stat-sub">{execPct.toFixed(1)}% del Presupuesto</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recaudo (Pagos)</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>${payVal.toLocaleString()}</div>
              <div className="stat-sub">{payPct.toFixed(1)}% del Presupuesto</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Balance de Caja</div>
              <div className="stat-value" style={{ color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                ${balance.toLocaleString()}
              </div>
              <div className="stat-sub">{balance >= 0 ? 'Excedente' : 'Déficit (Obra financiada)'}</div>
            </div>
          </div>

          <div className="main-finance-card card">
            <div className="card-header">
              <h3>Historial de Pagos y Actas</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>+ Registrar Pago</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Valor Bruto</th>
                    <th>IVA</th>
                    <th>Ret. Garantía</th>
                    <th>Valor Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {projectPayments.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.fecha).toLocaleDateString()}</td>
                      <td className="currency">${p.valor_bruto.toLocaleString()}</td>
                      <td className="currency" style={{ color: '#94a3b8' }}>+${p.iva.toLocaleString()}</td>
                      <td className="currency" style={{ color: 'var(--color-danger)' }}>-${p.retencion_garantia.toLocaleString()}</td>
                      <td className="currency" style={{ fontWeight: 700 }}>${p.valor_neto.toLocaleString()}</td>
                    </tr>
                  ))}
                  {projectPayments.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>No se han registrado pagos para este proyecto.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-panel card">
            <div className="card-header"><h3>Balance de Ejecución</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="progress-group">
                <div className="group-label">Avance Físico vs Financiero</div>
                <div className="dual-bar">
                  <div className="bar-label">Ejecutado en Obra: {execPct.toFixed(1)}%</div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${execPct}%`, background: 'var(--color-warning)' }} /></div>
                  
                  <div className="bar-label" style={{ marginTop: 12 }}>Pagado por Cliente: {payPct.toFixed(1)}%</div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${payPct}%`, background: 'var(--color-success)' }} /></div>
                </div>
              </div>

              <div className="alert-box" style={{ background: balance >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)', borderColor: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {balance >= 0 ? (
                  <p>✅ <strong>Estado Saludable:</strong> El recaudo cubre la ejecución actual. La obra puede continuar reportando avances sin restricciones.</p>
                ) : (
                  <p>⚠️ <strong>Alerta de Bloqueo:</strong> Se ha ejecutado más de lo recaudado. El registro de nuevos avances está bloqueado a menos que se autorice manualmente.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h2>Registrar Pago de Cliente</h2><button className="btn-ghost" onClick={() => setShowPaymentModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Valor Bruto (Según Factura)</label>
                <input type="number" className="form-input" value={pago.valor_bruto} onChange={(e) => setPago({...pago, valor_bruto: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">IVA (%)</label>
                  <input type="number" className="form-input" value={pago.iva} onChange={(e) => setPago({...pago, iva: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ret. Garantía (%)</label>
                  <input type="number" className="form-input" value={pago.retencion} onChange={(e) => setPago({...pago, retencion: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Recaudo</label>
                <input type="date" className="form-input" value={pago.fecha} onChange={(e) => setPago({...pago, fecha: e.target.value})} />
              </div>
              <div className="summary-box" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Neto a Recibir:</span> <strong>${( (parseFloat(pago.valor_bruto)||0) * (1 + (parseFloat(pago.iva)||0)/100 - (parseFloat(pago.retencion)||0)/100) ).toLocaleString()}</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddPayment}>Confirmar Ingreso</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .finance-grid { display: grid; grid-template-columns: 1fr 400px; gap: 20px; margin-top: 20px; }
        .dual-bar .bar-bg { height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 4px; }
        .dual-bar .bar-fill { height: 100%; transition: width 0.5s ease; }
        .bar-label { font-size: 11px; font-weight: 600; color: #64748b; }
        .alert-box { padding: 16px; border-radius: 12px; border: 1px solid; font-size: 12px; line-height: 1.5; }
        .text-primary { color: var(--color-accent); }
      `}</style>
    </>
  );
}
