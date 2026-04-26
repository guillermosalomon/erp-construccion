'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import BIMViewer from './BIMViewer';

export default function BIM5DView() {
  const { state, dispatch, calcularCostoAPU } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'full-3d', 'full-budget'

  const proyecto = state.proyectos.find(p => p.id === selectedProyectoId);
  const presupuestoItems = state.presupuestoItems.filter(pi => pi.proyecto_id === selectedProyectoId);

  // Map element IDs to their linked budget items for the current project
  const elementLinks = useMemo(() => {
    const map = {};
    state.bimLinks
      .filter(l => l.proyecto_id === selectedProyectoId)
      .forEach(l => {
        map[l.element_id] = l.presupuesto_item_id;
      });
    return map;
  }, [state.bimLinks, selectedProyectoId]);

  // Color map for BIMViewer (e.g., color linked items green, unlinked gray)
  const coloredMap = useMemo(() => {
    if (!selectedProyectoId) return {};
    const map = {};
    state.bimLinks
      .filter(l => l.proyecto_id === selectedProyectoId)
      .forEach(l => {
        map[l.element_id] = '#22c55e'; // Linked items in green
      });
    return map;
  }, [state.bimLinks, selectedProyectoId]);

  const handleSelectElement = (id) => {
    setSelectedElementId(id);
  };

  const handleLink = (presupuestoItemId) => {
    if (!selectedElementId || !selectedProyectoId) return;
    
    // Check if already linked
    const existing = state.bimLinks.find(
      l => l.proyecto_id === selectedProyectoId && l.element_id === selectedElementId
    );

    if (existing) {
      if (confirm('Este elemento ya está vinculado. ¿Deseas cambiar el vínculo?')) {
        dispatch({ type: 'DELETE_BIM_LINK', payload: existing.id });
      } else {
        return;
      }
    }

    dispatch({
      type: 'ADD_BIM_LINK',
      payload: {
        proyecto_id: selectedProyectoId,
        presupuesto_item_id: presupuestoItemId,
        element_id: selectedElementId
      }
    });
  };

  const unlinkElement = (elementId) => {
    const link = state.bimLinks.find(l => l.proyecto_id === selectedProyectoId && l.element_id === elementId);
    if (link) {
      dispatch({ type: 'DELETE_BIM_LINK', payload: link.id });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Gestión BIM 5D</h1>
          <div className="page-header-subtitle">Vincula elementos del modelo 3D con ítems del presupuesto</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <select 
            className="form-select" 
            value={selectedProyectoId} 
            onChange={(e) => setSelectedProyectoId(e.target.value)}
            style={{ width: 240 }}
          >
            <option value="">Seleccionar Proyecto...</option>
            {state.proyectos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedProyectoId ? (
        <div className="empty-state" style={{ marginTop: 100 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏗️</div>
          <h3>Selecciona un proyecto para comenzar</h3>
          <p>Debes elegir un proyecto que tenga un presupuesto activo para realizar la vinculación 5D.</p>
        </div>
      ) : (
        <div className="bim-5d-container">
          {/* 3D Viewer Side */}
          <div className="viewer-side">
            <BIMViewer 
              onSelect={handleSelectElement} 
              selectedId={selectedElementId} 
              coloredMap={coloredMap}
              proyectoId={selectedProyectoId}
            />
            {selectedElementId && (
              <div className="selection-panel">
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Elemento Seleccionado</div>
                <div style={{ fontSize: 11, color: '#666' }}>Express ID: {selectedElementId}</div>
                {elementLinks[selectedElementId] ? (
                  <div style={{ marginTop: 8 }}>
                    <div className="tag tag-basico" style={{ background: '#dcfce7', color: '#166534', display: 'block', textAlign: 'center' }}>
                      VINCULADO ✅
                    </div>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => unlinkElement(selectedElementId)}
                      style={{ width: '100%', marginTop: 4, color: 'var(--color-danger)', fontSize: 10 }}
                    >
                      Desvincular
                    </button>
                  </div>
                ) : (
                  <div className="tag" style={{ marginTop: 8, background: '#fef3c7', color: '#92400e', display: 'block', textAlign: 'center', fontSize: 11 }}>
                    Sin vincular ⚠️
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Budget Side */}
          <div className="budget-side">
            <div className="budget-side-header">
              <h3>Ítems del Presupuesto</h3>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {presupuestoItems.length} ítems en total
              </div>
            </div>
            
            <div className="budget-list">
              {presupuestoItems.length > 0 ? (
                presupuestoItems.map(item => {
                  const apu = state.apus.find(a => a.id === item.apu_id);
                  const isLinkedToCurrent = elementLinks[selectedElementId] === item.id;
                  const linkCount = state.bimLinks.filter(l => l.presupuesto_item_id === item.id).length;

                  return (
                    <div key={item.id} className={`budget-item-card ${isLinkedToCurrent ? 'active' : ''}`}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.capitulo || 'General'}</span>
                          {linkCount > 0 && <span className="tag" style={{ background: '#dcfce7', color: '#166534', fontSize: 9 }}>{linkCount} vínculos</span>}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, margin: '2px 0' }}>{item.descripcion || apu?.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {item.cantidad} {apu?.unidad} • {formatCurrency(calcularCostoAPU(item.apu_id))}
                        </div>
                      </div>
                      <button 
                        className={`btn ${isLinkedToCurrent ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleLink(item.id)}
                        disabled={!selectedElementId || isLinkedToCurrent}
                        style={{ padding: '4px 12px' }}
                      >
                        {isLinkedToCurrent ? 'Vinculado' : 'Vincular'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                  No hay ítems en el presupuesto.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bim-5d-container {
          display: flex;
          height: calc(100vh - 160px);
          gap: var(--space-md);
          margin-top: var(--space-md);
        }
        .viewer-side {
          flex: 6;
          position: relative;
          background: #fff;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .budget-side {
          flex: 4;
          background: #fff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
        }
        .budget-side-header {
          padding: 16px;
          border-bottom: 1px solid var(--color-border);
          background: #f8fafc;
        }
        .budget-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .budget-item-card {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }
        .budget-item-card:hover {
          border-color: var(--color-accent);
          background: #f0f7ff;
        }
        .budget-item-card.active {
          border-color: var(--color-accent);
          background: #eff6ff;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .selection-panel {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 180px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.05);
          z-index: 5;
        }
      `}</style>
    </>
  );
}
