'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

/* Agenda de obra centralizada en pos_agenda (ambito = 'OBRA') */
export const TIPOS_AGENDA_OBRA = {
  TAREA: { label: 'Tarea', color: '#64748b', icon: '📋' },
  LLAMAR_PROVEEDOR: { label: 'Llamar proveedor', color: '#7c3aed', icon: '📞' },
  RECEPCION: { label: 'Recepción', color: '#16a34a', icon: '📥' },
  DESPACHO: { label: 'Despacho', color: '#2563eb', icon: '🚚' },
  TRASLADO_RETIRO: { label: 'Retiro traslado', color: '#ea580c', icon: '📤' },
  TRASLADO_RECEPCION: { label: 'Recepción traslado', color: '#0891b2', icon: '🔁' },
  ENTREGA_OBRA: { label: 'Entrega en obra', color: '#1d4ed8', icon: '🏗️' },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_KEYS = ['erp_agenda', 'agenda'];
const hoy = () => new Date().toISOString().split('T')[0];

/** Convierte un ítem de la agenda local antigua a una fila de pos_agenda */
function aPosAgenda(item, userId) {
  return {
    id: UUID_RE.test(String(item.id || '')) ? item.id : crypto.randomUUID(),
    ambito: 'OBRA',
    proyecto_id: item.proyecto_id || null,
    presupuesto_item_id: UUID_RE.test(String(item.presupuesto_item_id || '')) ? item.presupuesto_item_id : null,
    titulo: item.titulo || 'Tarea',
    descripcion: item.descripcion || null,
    tipo: item.tipo && TIPOS_AGENDA_OBRA[item.tipo] ? item.tipo : 'TAREA',
    fecha_programada: item.fecha_programada || (item.created_at || hoy()).slice(0, 10),
    prioridad: item.prioridad || 'media',
    estado: item.estado || 'pendiente',
    responsable_id: UUID_RE.test(String(item.author_id || '')) ? item.author_id : (userId || null),
    datos: { migrado_de: 'agenda_local' },
  };
}

export default function AgendaView({ proyectoId }) {
  const { state, dispatch, dataLoading } = useStore();
  const { user } = useAuth();
  const [filter, setFilter] = useState('todos'); // 'todos', 'pendiente', 'completado'
  const [filterTipo, setFilterTipo] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'TAREA',
    fecha_programada: '',
    prioridad: 'media',
    presupuesto_item_id: ''
  });
  const migrado = useRef(false);

  const projectItems = useMemo(() => state.presupuestoItems.filter(pi => pi.proyecto_id === proyectoId), [state.presupuestoItems, proyectoId]);
  const bodega = useMemo(() => state.bodegas.find(b => b.proyecto_id === proyectoId), [state.bodegas, proyectoId]);

  // ── Migración única: agenda local (memoria / localStorage) → pos_agenda ──
  // También traslada ítems agregados después a la agenda local (p. ej. desde el Chat).
  const procesados = useRef(new Set());
  useEffect(() => {
    if (dataLoading) return;
    const existentes = new Set((state.posAgenda || []).map(a => a.id));
    const pendientes = (state.agenda || []).filter(a => !procesados.current.has(a.id));
    if (!migrado.current) {
      migrado.current = true;
      if (typeof window !== 'undefined') {
        LEGACY_KEYS.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            const arr = raw ? JSON.parse(raw) : null;
            if (Array.isArray(arr)) {
              pendientes.push(...arr.filter(a => a && a.titulo).map(a => ({ ...a, _legacy: true })));
              localStorage.removeItem(k);
            }
          } catch { /* ignore */ }
        });
      }
    }
    if (pendientes.length === 0) return;
    pendientes.forEach(item => {
      if (item.id) procesados.current.add(item.id);
      if (item.proyecto_id) {
        const row = aPosAgenda(item, user?.id);
        if (!existentes.has(row.id)) {
          existentes.add(row.id);
          dispatch({ type: 'ADD_POS_AGENDA', payload: row });
        }
      }
      if (item.id && !item._legacy) dispatch({ type: 'DELETE_AGENDA_ITEM', payload: item.id });
    });
  }, [dataLoading, state.agenda, state.posAgenda, dispatch, user?.id]);

  const agendaItems = useMemo(() => {
    let items = (state.posAgenda || []).filter(a => a.ambito === 'OBRA' && a.proyecto_id === proyectoId);
    if (filter !== 'todos') {
      items = items.filter(a => (filter === 'completado' ? a.estado === 'completado' : a.estado !== 'completado'));
    }
    if (filterTipo !== 'todos') {
      items = items.filter(a => (a.tipo || 'TAREA') === filterTipo);
    }
    return [...items].sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [state.posAgenda, proyectoId, filter, filterTipo]);

  const ordenNumero = (id) => (state.ordenesCompra || []).find(o => o.id === id)?.numero_orden;

  const handleAddItem = () => {
    if (!newItem.titulo) return alert('El título es obligatorio.');
    dispatch({
      type: 'ADD_POS_AGENDA',
      payload: {
        id: crypto.randomUUID(),
        ambito: 'OBRA',
        proyecto_id: proyectoId,
        bodega_id: bodega?.id || null,
        titulo: newItem.titulo,
        descripcion: newItem.descripcion || null,
        tipo: newItem.tipo || 'TAREA',
        fecha_programada: newItem.fecha_programada || hoy(),
        prioridad: newItem.prioridad,
        presupuesto_item_id: newItem.presupuesto_item_id || null,
        responsable_id: user?.id || null,
        estado: 'pendiente'
      }
    });
    setShowAddModal(false);
    setNewItem({ titulo: '', descripcion: '', tipo: 'TAREA', fecha_programada: '', prioridad: 'media', presupuesto_item_id: '' });
  };

  const toggleItemStatus = (item) => {
    const nextEstado = item.estado === 'completado' ? 'pendiente' : 'completado';
    dispatch({
      type: 'UPDATE_POS_AGENDA',
      payload: { id: item.id, estado: nextEstado }
    });
  };

  const handleDelete = (item) => {
    if (confirm('¿Eliminar este evento de la agenda?')) dispatch({ type: 'DELETE_POS_AGENDA', payload: item.id });
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'critica': return '#ef4444';
      case 'alta': return '#f97316';
      case 'media': return '#3b82f6';
      case 'baja': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Agenda y Tareas del Proyecto</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Tareas, pedidos, recepciones y traslados de la obra</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="form-select btn-sm"
            style={{ width: 170 }}
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(TIPOS_AGENDA_OBRA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="form-select btn-sm"
            style={{ width: 140 }}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="completado">Completados</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Nueva Tarea
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Tarea / Hito</th>
                <th>Tipo</th>
                <th>Actividad Vinculada</th>
                <th>Fecha</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agendaItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No hay tareas programadas para este proyecto.
                  </td>
                </tr>
              ) : (
                agendaItems.map(item => {
                  const tipo = TIPOS_AGENDA_OBRA[item.tipo] || TIPOS_AGENDA_OBRA.TAREA;
                  const oc = item.orden_compra_id ? ordenNumero(item.orden_compra_id) : null;
                  return (
                    <tr key={item.id} style={{ opacity: item.estado === 'completado' ? 0.6 : 1 }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={item.estado === 'completado'} 
                          onChange={() => toggleItemStatus(item)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b', textDecoration: item.estado === 'completado' ? 'line-through' : 'none' }}>
                          {item.titulo}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{item.descripcion}</div>
                        {(item.contacto_telefono || item.direccion) && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {item.contacto_telefono ? `📞 ${item.contacto_telefono} ` : ''}{item.direccion ? `📍 ${item.direccion}` : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="tag" style={{ background: tipo.color + '20', color: tipo.color, fontSize: 10 }}>
                          {tipo.icon} {tipo.label}
                        </span>
                        {oc && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{oc}</div>}
                      </td>
                      <td>
                        {item.presupuesto_item_id ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>
                            #{(() => { const pi = projectItems.find(i => i.id === item.presupuesto_item_id); return pi?.descripcion || pi?.nombre || 'Actividad'; })()}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>General</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                          {item.fecha_programada ? new Date(String(item.fecha_programada).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO') : '—'}
                        </div>
                      </td>
                      <td>
                        <span className="tag" style={{ background: getPriorityColor(item.prioridad) + '20', color: getPriorityColor(item.prioridad), fontSize: 9 }}>
                          {item.prioridad?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: 10, fontWeight: 700, 
                          color: item.estado === 'completado' ? '#16a34a' : '#f97316'
                        }}>
                          {(item.estado || 'pendiente').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleDelete(item)}
                          style={{ color: '#ef4444' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Crear Nueva Tarea en Agenda</h2>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Título</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: Entrega de materiales cimentación" 
                  value={newItem.titulo}
                  onChange={e => setNewItem({...newItem, titulo: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Detalles adicionales..." 
                  value={newItem.descripcion}
                  onChange={e => setNewItem({...newItem, descripcion: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={newItem.tipo} onChange={e => setNewItem({ ...newItem, tipo: e.target.value })}>
                  {Object.entries(TIPOS_AGENDA_OBRA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Fecha Programada</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newItem.fecha_programada}
                    onChange={e => setNewItem({...newItem, fecha_programada: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prioridad</label>
                  <select 
                    className="form-select"
                    value={newItem.prioridad}
                    onChange={e => setNewItem({...newItem, prioridad: e.target.value})}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vincular a Actividad (Opcional)</label>
                <select 
                  className="form-select"
                  value={newItem.presupuesto_item_id}
                  onChange={e => setNewItem({...newItem, presupuesto_item_id: e.target.value})}
                >
                  <option value="">-- Actividad General --</option>
                  {projectItems.map(item => (
                    <option key={item.id} value={item.id}>{item.descripcion || item.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddItem}>Guardar en Agenda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
