'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/StoreContext';
import { templateService } from '@/lib/template-service';
import { useAuth } from '@/lib/auth';

export default function Dashboard() {
    const { state, clearDatabase, calcularCostoAPU, calcularPresupuesto, calculateExecutionValue, calculateTotalPayments } = useStore();
    const { user } = useAuth();
    const [showTemplates, setShowTemplates] = useState(false);
    const fileInputRef = useRef(null);
    const [importMode, setImportMode] = useState('REPLACE'); // 'REPLACE' o 'MERGE'
    const [importProgress, setImportProgress] = useState(null); // { current, total, table }

    const handleExport = async () => {
      const name = prompt("Nombre de la plantilla:", "Mi Plantilla ERP");
      if (!name) return;
      const template = await templateService.generateTemplate(state, name);
      templateService.downloadTemplate(template);
      setShowTemplates(false);
    };

    const handleImportClick = (mode) => {
      setImportMode(mode);
      fileInputRef.current.click();
      setShowTemplates(false);
    };

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (importMode === 'REPLACE') {
        if (!confirm("⚠️ ¿REEMPLAZAR TODO? Se borrarán los datos actuales antes de cargar la plantilla.")) return;
        await clearDatabase();
      } else {
        if (!confirm("¿Fusionar datos? Se agregarán los datos de la plantilla a los actuales.")) return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const templateData = JSON.parse(event.target.result);
          setImportProgress({ current: 0, total: 1, table: 'Iniciando...' });
          await templateService.importTemplate(templateData, importMode, (current, total, table) => {
            setImportProgress({ current, total, table });
          });
          setImportProgress(null);
          alert("¡Plantilla cargada con éxito!");
          window.location.reload();
        } catch (err) {
          setImportProgress(null);
          alert("Error al cargar: " + err.message);
        }
      };
      reader.readAsText(file);
    };

    const handleCloudUpload = async () => {
      if (!user) return alert("Debes iniciar sesión para compartir.");
      const name = prompt("Nombre para compartir:", "Plantilla Compartida");
      if (!name) return;
      
      try {
        const template = await templateService.generateTemplate(state, name);
        await templateService.uploadToCloud(template, user.id);
        alert("¡Plantilla subida a la nube con éxito!");
      } catch (err) {
        alert("Error al subir: " + err.message);
      }
      setShowTemplates(false);
    };

  const totalInsumos = state.insumos.length;
  const totalAPUBasicos = state.apus.filter((a) => a.tipo === 'BASICO').length;
  const totalAPUCompuestos = state.apus.filter((a) => a.tipo === 'COMPUESTO').length;
  const totalProyectos = state.proyectos.length;

  // Project health analytics
  const proyectosResumen = state.proyectos.map((p) => {
    const presupuesto = calcularPresupuesto(p.id);
    const execVal = calculateExecutionValue(p.id);
    const payVal = calculateTotalPayments(p.id);
    const budgetTotal = presupuesto.gran_total || 1;
    
    return {
      ...p,
      presupuesto,
      execVal,
      payVal,
      execPct: (execVal / budgetTotal) * 100,
      payPct: (payVal / budgetTotal) * 100,
      balance: payVal - execVal,
      itemCount: state.presupuestoItems.filter((pi) => pi.proyecto_id === p.id).length,
    };
  });

  // Global Inventory (Top 5 materials with most stock across all warehouses)
  const globalInventory = state.insumos.map(insumo => {
    const totalStock = state.inventario
      .filter(t => t.insumo_id === insumo.id)
      .reduce((sum, t) => sum + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)), 0);
    return { ...insumo, totalStock };
  }).filter(i => i.totalStock > 0).sort((a,b) => b.totalStock - a.totalStock).slice(0, 5);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const totalPresupuestado = proyectosResumen.reduce((s, p) => s + p.presupuesto.gran_total, 0);
  const totalRecaudado = proyectosResumen.reduce((s, p) => s + p.payVal, 0);
  const totalEjecutado = proyectosResumen.reduce((s, p) => s + p.execVal, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard Ejecutivo</h1>
          <div className="page-header-subtitle">Control 360°: Logística, Finanzas y Ejecución</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json"
            onChange={handleFileChange}
          />

          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              💾 Plantillas ▼
            </button>
            {showTemplates && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 5,
                background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 200,
                overflow: 'hidden'
              }}>
                <button className="dropdown-item" onClick={handleExport}>📥 Guardar Local</button>
                <button className="dropdown-item" onClick={() => handleImportClick('MERGE')}>➕ Cargar (Fusionar)</button>
                <div style={{ height: 1, background: '#f1f5f9' }} />
                <button className="dropdown-item" onClick={handleCloudUpload}>☁️ Compartir en Nube</button>
              </div>
            )}
          </div>


          <div className={`status-badge ${state.isOnline ? 'online' : 'offset'}`} style={{ 
            background: state.isOnline ? '#dcfce7' : '#f1f5f9',
            color: state.isOnline ? '#166534' : '#64748b',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600
          }}>
            {state.isOnline ? '● Supabase Online' : '○ Modo Local / Plantilla'}
          </div>
        </div>
      </div>

      {/* MODAL DE PROGRESO DE IMPORTACIÓN */}
      {importProgress && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', padding: '40px', borderRadius: '16px',
            width: '400px', maxWidth: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: '0 0 10px', color: '#0f172a' }}>Cargando Plantilla</h2>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              Procesando <strong>{importProgress.table}</strong>...<br/>
              ({importProgress.current} de {importProgress.total} registros)
            </p>
            
            <div style={{ width: '100%', height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ 
                width: `${(importProgress.current / importProgress.total) * 100}%`, 
                height: '100%', 
                background: 'var(--color-primary)', 
                transition: 'width 0.1s linear'
              }} />
            </div>
            
            <p style={{ marginTop: 15, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              Por favor, no cierres ni recargues esta página.
            </p>
          </div>
        </div>
      )}

      <div className="page-body">
        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Inversión Recaudada</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalRecaudado)}</div>
            <div className="stat-sub">{((totalRecaudado/totalPresupuestado)*100||0).toFixed(1)}% del total general</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Valor Ejecutado Real</div>
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{formatCurrency(totalEjecutado)}</div>
            <div className="stat-sub">{((totalEjecutado/totalPresupuestado)*100||0).toFixed(1)}% de avance físico global</div>
          </div>
          <div className="stat-card" style={{ background: 'var(--color-accent)', border: 'none' }}>
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Presupuesto Consolidado</div>
            <div className="stat-value" style={{ color: '#fff' }}>{formatCurrency(totalPresupuestado)}</div>
            <div className="stat-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>{totalProyectos} proyectos activos</div>
          </div>
        </div>

        {/* Second Row: Charts & Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          
          {/* Health by Project */}
          <div className="card">
            <div className="card-header"><h3>Balance por Proyecto (Finanzas vs Obra)</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Físico</th>
                    <th>Financiero (Recaudo)</th>
                    <th>Edo. Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosResumen.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td>
                        <div style={{ fontSize: 9 }}>{p.execPct.toFixed(1)}%</div>
                        <div style={{ width: 60, height: 4, background: '#eee', borderRadius: 2 }}><div style={{ width: `${p.execPct}%`, height: '100%', background: 'var(--color-warning)' }} /></div>
                      </td>
                      <td>
                        <div style={{ fontSize: 9 }}>{p.payPct.toFixed(1)}%</div>
                        <div style={{ width: 60, height: 4, background: '#eee', borderRadius: 2 }}><div style={{ width: `${p.payPct}%`, height: '100%', background: 'var(--color-success)' }} /></div>
                      </td>
                      <td>
                        <span className="tag" style={{ background: p.balance >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: p.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                           {p.balance >= 0 ? 'Saludable' : 'Déficit'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Stock Widget */}
          <div className="card">
            <div className="card-header"><h3>Stock Crítico (Consolidado)</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Insumo</th><th>Unidad</th><th style={{ textAlign: 'right' }}>Total en Bodegas</th></tr>
                </thead>
                <tbody>
                  {globalInventory.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                      <td>{i.unidad}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>{i.totalStock.toLocaleString()}</td>
                    </tr>
                  ))}
                  {globalInventory.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.5, padding: 30 }}>Sin materiales en inventario.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="card">
            <div className="card-header"><h3>Últimos Movimientos de Bodega</h3></div>
            <div style={{ padding: '0 var(--space-md)' }}>
              {state.inventario.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {state.inventario.slice(-5).reverse().map((mov, i) => {
                    const ins = state.insumos.find(ix => ix.id === mov.insumo_id);
                    return (
                      <div key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 16 }}>{mov.tipo === 'ENTRADA' ? '📥' : '📤'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{ins?.nombre}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{mov.cantidad} {ins?.unidad} • {mov.tipo}</div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(mov.created_at).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="empty-state" style={{ padding: 30 }}>Sin actividad reciente.</div>}
            </div>
          </div>

          {/* Recent Payments Feed */}
          <div className="card">
            <div className="card-header"><h3>Pagos Recibidos</h3></div>
            <div style={{ padding: '0 var(--space-md)' }}>
              {state.pagos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {state.pagos.slice(-5).reverse().map((p, i) => {
                    const proy = state.proyectos.find(px => px.id === p.proyecto_id);
                    return (
                      <div key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 16 }}>💰</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{proy?.nombre}</div>
                          <div style={{ fontSize: 10, color: '#16a34a' }}>+{formatCurrency(p.valor_neto)}</div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(p.fecha).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="empty-state" style={{ padding: 30 }}>Sin pagos registrados.</div>}
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .status-badge { font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .status-badge.online { background: #dcfce7; color: #166534; }
        .status-badge.offline { background: #ffedd5; color: #9a3412; }
      `}</style>
    </>
  );
}
