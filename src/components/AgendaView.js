'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

export default function AgendaView({ proyectoId }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [filter, setFilter] = useState('todos'); // 'todos', 'pendiente', 'completado'
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    titulo: '',
    descripcion: '',
    fecha_programada: '',
    prioridad: 'media',
    presupuesto_item_id: ''
  });

  const proyecto = state.proyectos.find(p => p.id === proyectoId);
  const projectItems = useMemo(() => state.presupuestoItems.filter(pi => pi.proyecto_id === proyectoId), [state.presupuestoItems, proyectoId]);
  
  const agendaItems = useMemo(() => {
    let items = state.agenda.filter(a => a.proyecto_id === proyectoId);
    if (filter !== 'todos') {
      items = items.filter(a => a.estado === filter);
    }
    return items.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [state.agenda, proyectoId, filter]);

  const handleAddItem = () => {
    if (!newItem.titulo) return alert('El título es obligatorio.');
    dispatch({
      type: 'ADD_AGENDA_ITEM',
      payload: {
        ...newItem,
        proyecto_id: proyectoId,
        author_id: user?.id,
        estado: 'pendiente'
      }
    });
    setShowAddModal(false);
    setNewItem({ titulo: '', descripcion: '', fecha_programada: '', prioridad: 'media', presupuesto_item_id: '' });
  };

  const toggleItemStatus = (item) => {
    const nextEstado = item.estado === 'completado' ? 'pendiente' : 'completado';
    dispatch({
      type: 'UPDATE_AGENDA_ITEM',
      payload: { id: item.id, changes: { estado: nextEstado } }
    });
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
          <p style={{ fontSize: 13, color: '#64748b' }}>Gestión de hitos y tareas operativas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
                <th>Actividad Vinculada</th>
                <th>Fecha Entrega</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agendaItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No hay tareas programadas para este proyecto.
                  </td>
                </tr>
              ) : (
                agendaItems.map(item => (
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
                    </td>
                    <td>
                      {item.presupuesto_item_id ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>
                          #{projectItems.find(i => i.id === item.presupuesto_item_id)?.nombre || 'Actividad'}
                        </span>
                      ) : <span style={{ color: '#cbd5e1' }}>General</span>}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>
                        {item.fecha_programada ? new Date(item.fecha_programada).toLocaleDateString() : '—'}
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
                        {item.estado?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => dispatch({ type: 'DELETE_AGENDA_ITEM', payload: item.id })}
                        style={{ color: '#ef4444' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
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
                    <option key={item.id} value={item.id}>{item.nombre}</option>
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
