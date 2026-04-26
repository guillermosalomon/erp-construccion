'use client';

import { useState } from 'react';
import { useStore } from '@/store/StoreContext';
import PresupuestoView from './PresupuestoView';
import ProgressView from './ProgressView';
import LogisticsView from './LogisticsView';
import FinanceView from './FinanceView';

function ProjectSummary({ proyectoId }) {
  const { state, calcularPresupuesto } = useStore();
  const proyecto = state.proyectos.find(p => p.id === proyectoId);
  const presupuesto = calcularPresupuesto(proyectoId);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  return (
    <div style={{ marginTop: 24 }}>
      <div className="card">
        <div className="card-header">
          <h3>Información General del Proyecto</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: 13, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Cliente</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#0f172a' }}>{proyecto?.cliente || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Estado</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#0f172a' }}>{proyecto?.estado || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Presupuesto Total</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#2563eb' }}>{formatCurrency(presupuesto.gran_total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectHubView({ proyectoId, onBack }) {
  const { state } = useStore();
  const [activeTab, setActiveTab] = useState('summary');

  const proyecto = state.proyectos.find(p => p.id === proyectoId);

  if (!proyecto) {
    return <div>Proyecto no encontrado.</div>;
  }

  const tabs = [
    { id: 'summary', label: 'Resumen' },
    { id: 'presupuesto', label: 'Presupuesto' },
    { id: 'progress', label: 'Seguimiento 4D/5D' },
    { id: 'logistics', label: 'Bodega Móvil' },
    { id: 'finance', label: 'Control Financiero' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 24 }}>
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <button 
            onClick={onBack}
            className="btn" 
            style={{ marginBottom: 12, padding: '4px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            ← Volver a Proyectos
          </button>
          <h1>{proyecto.nombre}</h1>
          <div className="page-header-subtitle">
            Código: <span style={{ fontWeight: 600, color: '#171717' }}>{proyecto.codigo}</span>
            <span style={{ margin: '0 8px' }}>•</span>
            Estado: <span style={{ fontWeight: 600, color: '#171717' }}>{proyecto.estado}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 24, marginTop: 16 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#64748b',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: '0 24px' }}>
        {activeTab === 'summary' && <ProjectSummary proyectoId={proyectoId} />}
        {activeTab === 'presupuesto' && <PresupuestoView proyectoId={proyectoId} />}
        {activeTab === 'progress' && <ProgressView contextProyectoId={proyectoId} />}
        {activeTab === 'logistics' && <LogisticsView contextProyectoId={proyectoId} />}
        {activeTab === 'finance' && <FinanceView contextProyectoId={proyectoId} />}
      </div>
    </div>
  );
}
