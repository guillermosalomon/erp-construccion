'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';

/* Agenda comercial: pos_agenda con ambito 'COMERCIAL' (null se trata como COMERCIAL) */
const TIPOS_COMERCIAL = {
  DESPACHO: { label: 'Despacho', bg: '#dbeafe', color: '#1e40af', icon: '🚚' },
  ENTREGA_OBRA: { label: 'Entrega en obra', bg: '#e0e7ff', color: '#3730a3', icon: '🏗️' },
  RECEPCION: { label: 'Recepción', bg: '#dcfce7', color: '#166534', icon: '📥' },
  LLAMAR_PROVEEDOR: { label: 'Llamar proveedor', bg: '#ede9fe', color: '#5b21b6', icon: '📞' },
  TAREA: { label: 'Tarea', bg: '#f1f5f9', color: '#64748b', icon: '📋' },
};
// Tipos anteriores a la agenda centralizada
const TIPOS_LEGACY = {
  entrega_cliente: 'DESPACHO',
  recepcion_proveedor: 'RECEPCION',
  reposicion_stock: 'LLAMAR_PROVEEDOR',
  visita_obra: 'ENTREGA_OBRA',
};
const tipoNormalizado = (t) => (TIPOS_COMERCIAL[t] ? t : TIPOS_LEGACY[t] || 'TAREA');

export default function AgendaPOSView({ tiendaId, puntoVentaId, puntoVentaNombre }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();

  const [filterEstado, setFilterEstado] = useState('todos'); // 'todos', 'pendiente', 'en_camino', 'completado'
  const [filterTipo, setFilterTipo] = useState('todos');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newItem, setNewItem] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'DESPACHO',
    fecha_programada: new Date().toISOString().split('T')[0],
    prioridad: 'media',
    contacto_nombre: '',
    contacto_telefono: '',
    direccion: '',
  });

  // Filtrar agenda comercial para este punto de venta / tienda
  const posItems = useMemo(() => {
    let list = (state.posAgenda || []).filter(item => {
      if ((item.ambito || 'COMERCIAL') !== 'COMERCIAL') return false;
      if (puntoVentaId && item.punto_venta_id && item.punto_venta_id !== puntoVentaId) return false;
      if (tiendaId && item.tienda_id && item.tienda_id !== tiendaId) return false;
      return true;
    });

    if (filterEstado !== 'todos') {
      list = list.filter(i => (i.estado || 'pendiente') === filterEstado);
    }
    if (filterTipo !== 'todos') {
      list = list.filter(i => tipoNormalizado(i.tipo) === filterTipo);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.titulo?.toLowerCase().includes(s) ||
        i.contacto_nombre?.toLowerCase().includes(s) ||
        i.direccion?.toLowerCase().includes(s)
      );
    }

    return [...list].sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [state.posAgenda, puntoVentaId, tiendaId, filterEstado, filterTipo, search]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.titulo) return alert('El título es obligatorio');

    const payload = {
      ...newItem,
      id: crypto.randomUUID(),
      ambito: 'COMERCIAL',
      tienda_id: tiendaId || null,
      punto_venta_id: puntoVentaId || null,
      responsable_id: user?.id || null,
      estado: 'pendiente',
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_POS_AGENDA', payload });
    setShowAddModal(false);
    setNewItem({
      titulo: '',
      descripcion: '',
      tipo: 'DESPACHO',
      fecha_programada: new Date().toISOString().split('T')[0],
      prioridad: 'media',
      contacto_nombre: '',
      contacto_telefono: '',
      direccion: '',
    });
  };

  const handleToggleEstado = (item) => {
    const orden = ['pendiente', 'en_camino', 'completado'];
    const currentIdx = orden.indexOf(item.estado || 'pendiente');
    const nextEstado = orden[(currentIdx + 1) % orden.length];

    dispatch({
      type: 'UPDATE_POS_AGENDA',
      payload: { ...item, estado: nextEstado },
    });
  };

  const handleDeleteItem = (id) => {
    if (confirm('¿Eliminar este evento de la agenda POS?')) {
      dispatch({ type: 'DELETE_POS_AGENDA', payload: id });
    }
  };

  const tipoBadge = (t) => {
    const tipo = TIPOS_COMERCIAL[tipoNormalizado(t)];
    return <span style={{ background: tipo.bg, color: tipo.color, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{tipo.icon} {tipo.label}</span>;
  };

  const estadoBadge = (e) => {
    switch (e) {
      case 'completado':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>✓ Entregado</span>;
      case 'en_camino':
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>🚛 En camino</span>;
      default:
        return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>⏳ Pendiente</span>;
    }
  };

  const prioridadColor = (p) => {
    switch (p) {
      case 'critica': return '#ef4444';
      case 'alta': return '#f97316';
      case 'media': return '#3b82f6';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      {/* Barra de control superior */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Buscar por cliente, entrega o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220, fontSize: 12 }}
          />

          <select
            className="form-select"
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            style={{ width: 130, fontSize: 12 }}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_camino">En camino</option>
            <option value="completado">Completados</option>
          </select>

          <select
            className="form-select"
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            style={{ width: 140, fontSize: 12 }}
          >
            <option value="todos">Todos los tipos</option>
            {Object.entries(TIPOS_COMERCIAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            + Nueva Tarea / Despacho
          </button>
        </div>
      </div>

      {/* Tabla de la Agenda */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {posItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>No hay despachos ni entregas programadas</p>
            <p style={{ fontSize: 11 }}>Crea un despacho o tarea comercial. Las compras de obra se programan en Proyecto → Abastecimiento.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Actividad / Hito</th>
                <th>Tipo</th>
                <th>Fecha Programada</th>
                <th>Destinatario / Contacto</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {posItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <button
                      onClick={() => handleToggleEstado(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                      title="Clic para cambiar estado"
                    >
                      {item.estado === 'completado' ? '✅' : item.estado === 'en_camino' ? '🚛' : '⏳'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12 }}>{item.titulo}</div>
                    {item.descripcion && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.descripcion}</div>
                    )}
                  </td>
                  <td>{tipoBadge(item.tipo)}</td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                      📅 {new Date(item.fecha_programada).toLocaleDateString('es-CO')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.contacto_nombre || '—'}</div>
                    {item.contacto_telefono && (
                      <div style={{ fontSize: 11, color: '#64748b' }}>📞 {item.contacto_telefono}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b' }}>{item.direccion || '—'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleEstado(item)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {estadoBadge(item.estado)}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ color: '#ef4444' }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Nuevo Despacho / Tarea */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>📅 Programar Despacho o Recepción</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título de la Operación *</label>
                  <input
                    className="form-input"
                    placeholder="Ej: Despacho de Cemento a Obra Ricaurte"
                    value={newItem.titulo}
                    onChange={e => setNewItem({ ...newItem, titulo: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={newItem.tipo}
                      onChange={e => setNewItem({ ...newItem, tipo: e.target.value })}
                    >
                      {Object.entries(TIPOS_COMERCIAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Fecha Programada *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newItem.fecha_programada}
                      onChange={e => setNewItem({ ...newItem, fecha_programada: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Destinatario / Contacto</label>
                    <input
                      className="form-input"
                      placeholder="Nombre del cliente o proveedor"
                      value={newItem.contacto_nombre}
                      onChange={e => setNewItem({ ...newItem, contacto_nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Teléfono</label>
                    <input
                      className="form-input"
                      placeholder="300 123 4567"
                      value={newItem.contacto_telefono}
                      onChange={e => setNewItem({ ...newItem, contacto_telefono: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección de Entrega / Origen</label>
                  <input
                    className="form-input"
                    placeholder="Ej: Cra 10 # 20-30, Pasto (Nariño)"
                    value={newItem.direccion}
                    onChange={e => setNewItem({ ...newItem, direccion: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notas Adicionales</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Detalles de la entrega o insumos..."
                    value={newItem.descripcion}
                    onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Agendar Operación</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
