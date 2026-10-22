'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import { generarOrdenesCompraProgramadas } from '@/lib/compras-engine';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function AgendaPOSView({ tiendaId, puntoVentaId, puntoVentaNombre }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();

  const [filterEstado, setFilterEstado] = useState('todos'); // 'todos', 'pendiente', 'en_camino', 'completado'
  const [filterTipo, setFilterTipo] = useState('todos');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAutoOrdersModal, setShowAutoOrdersModal] = useState(false);
  const [selectedProyectoId, setSelectedProyectoId] = useState('');

  const [newItem, setNewItem] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'entrega_cliente',
    fecha_programada: new Date().toISOString().split('T')[0],
    prioridad: 'media',
    contacto_nombre: '',
    contacto_telefono: '',
    direccion: '',
  });

  // Filtrar agenda para este punto de venta / tienda
  const posItems = useMemo(() => {
    let list = (state.posAgenda || []).filter(item => {
      if (puntoVentaId && item.punto_venta_id && item.punto_venta_id !== puntoVentaId) return false;
      if (tiendaId && item.tienda_id && item.tienda_id !== tiendaId) return false;
      return true;
    });

    if (filterEstado !== 'todos') {
      list = list.filter(i => i.estado === filterEstado);
    }
    if (filterTipo !== 'todos') {
      list = list.filter(i => i.tipo === filterTipo);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.titulo?.toLowerCase().includes(s) ||
        i.contacto_nombre?.toLowerCase().includes(s) ||
        i.direccion?.toLowerCase().includes(s)
      );
    }

    return list.sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
  }, [state.posAgenda, puntoVentaId, tiendaId, filterEstado, filterTipo, search]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.titulo) return alert('El título es obligatorio');

    const payload = {
      ...newItem,
      id: crypto.randomUUID(),
      tienda_id: tiendaId,
      punto_venta_id: puntoVentaId,
      estado: 'pendiente',
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_POS_AGENDA', payload });
    setShowAddModal(false);
    setNewItem({
      titulo: '',
      descripcion: '',
      tipo: 'entrega_cliente',
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

  // ── Generación de órdenes de compra desde un proyecto ──
  const previewOrdenes = useMemo(() => {
    if (!selectedProyectoId) return [];
    const proyItems = state.presupuestoItems.filter(pi => pi.proyecto_id === selectedProyectoId);
    if (proyItems.length === 0) return [];

    const catalogoMap = {};
    (state.apus || []).forEach(a => { catalogoMap[a.id] = a; });

    return generarOrdenesCompraProgramadas({
      presupuestoItems: proyItems,
      catalogoMap,
      proyectoId: selectedProyectoId,
      tiendaId,
      puntoVentaId,
    });
  }, [selectedProyectoId, state.presupuestoItems, state.apus, tiendaId, puntoVentaId]);

  const handleConfirmarOrdenesAuto = () => {
    if (previewOrdenes.length === 0) return;

    previewOrdenes.forEach(oc => {
      // 1. Guardar orden de compra
      dispatch({ type: 'ADD_ORDEN_COMPRA', payload: oc });

      // 2. Agendar en la Agenda POS como recepción programada
      dispatch({
        type: 'ADD_POS_AGENDA',
        payload: {
          id: crypto.randomUUID(),
          tienda_id: tiendaId,
          punto_venta_id: puntoVentaId,
          titulo: `📥 Recepción de Materiales: ${oc.proveedor_nombre} (${oc.numero_orden})`,
          descripcion: `Pedido de ${oc.items.length} insumos por valor de ${fmt(oc.total)}.`,
          tipo: 'recepcion_proveedor',
          fecha_programada: oc.fecha_programada,
          prioridad: 'alta',
          estado: 'pendiente',
          contacto_nombre: oc.proveedor_nombre,
          relacion_id: oc.id,
          user_id: user?.id,
          created_at: new Date().toISOString(),
        }
      });
    });

    alert(`¡Éxito! Se han agendado ${previewOrdenes.length} órdenes de compra al proveedor más barato.`);
    setShowAutoOrdersModal(false);
    setSelectedProyectoId('');
  };

  const tipoBadge = (t) => {
    switch (t) {
      case 'entrega_cliente':
        return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>🚚 Entrega Obra</span>;
      case 'recepcion_proveedor':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>📥 Recepción Prov.</span>;
      case 'reposicion_stock':
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>🔄 Reposición</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>📋 General</span>;
    }
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
            <option value="entrega_cliente">Entregas Obra</option>
            <option value="recepcion_proveedor">Recepciones Prov.</option>
            <option value="reposicion_stock">Reposición Stock</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAutoOrdersModal(true)}
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            ⚡ Auto-Compras por Fecha
          </button>
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
            <p style={{ fontSize: 11 }}>Crea un despacho manual o genera las órdenes de compra automáticas desde un proyecto.</p>
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
                      <option value="entrega_cliente">Entrega a Obra / Cliente</option>
                      <option value="recepcion_proveedor">Recepción de Proveedor</option>
                      <option value="reposicion_stock">Reposición de Stock</option>
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

      {/* Modal: Compras Inteligentes Automáticas por Fecha */}
      {showAutoOrdersModal && (
        <div className="modal-overlay" onClick={() => setShowAutoOrdersModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>⚡ Programar Compras al Proveedor Más Barato</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAutoOrdersModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Seleccionar Proyecto del ERP *</label>
                <select
                  className="form-select"
                  value={selectedProyectoId}
                  onChange={e => setSelectedProyectoId(e.target.value)}
                >
                  <option value="">Selecciona un proyecto...</option>
                  {(state.proyectos || []).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.ciudad || 'Pasto'})</option>
                  ))}
                </select>
              </div>

              {previewOrdenes.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                    Órdenes de Compra Sugeridas ({previewOrdenes.length} proveedores):
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table className="data-table" style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th>Proveedor (Mejor Tarifa)</th>
                          <th>Fecha Entrega</th>
                          <th>Insumos</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewOrdenes.map(oc => (
                          <tr key={oc.id}>
                            <td style={{ fontWeight: 700, color: '#059669' }}>⭐ {oc.proveedor_nombre}</td>
                            <td>📅 {oc.fecha_programada}</td>
                            <td>{oc.items.length} ítems</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(oc.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedProyectoId ? (
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                  Este proyecto no tiene ítems de presupuesto con insumos vinculados.
                </div>
              ) : (
                <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
                  💡 <strong>¿Cómo funciona?</strong> El algoritmo analiza todos los materiales requeridos para la obra, compara automáticamente las cotizaciones de los proveedores registrados (Homecenter, Construrama, Casa Andina, etc.), y agenda las órdenes de compra por fecha hacia el proveedor con la tarifa más baja. Si un proveedor no tiene stock, puedes alternarlo fácilmente.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAutoOrdersModal(false)}>Cerrar</button>
              {previewOrdenes.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirmarOrdenesAuto}>
                  Confirmar y Agendar {previewOrdenes.length} Órdenes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
