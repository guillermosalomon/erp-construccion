'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { supabase } from '@/lib/supabase';

const ESTADOS = [
  { value: 'PLANEACION', label: 'Planeación', color: '#2563eb' },
  { value: 'EJECUCION', label: 'Ejecución', color: '#d97706' },
  { value: 'FINALIZADO', label: 'Finalizado', color: '#16a34a' },
  { value: 'CANCELADO', label: 'Cancelado', color: '#dc2626' },
];

const TIPOS_OBRA = [
  { value: 'residencial', label: '🏠 Residencial' },
  { value: 'comercial', label: '🏢 Comercial' },
  { value: 'industrial', label: '🏭 Industrial' },
  { value: 'institucional', label: '🏛️ Institucional' },
  { value: 'remodelacion', label: '🔧 Remodelación' },
  { value: 'infraestructura', label: '🛣️ Infraestructura' },
  { value: 'consultoria', label: '📐 Consultoría' },
  { value: 'otro', label: '📋 Otro' },
];

const emptyForm = {
  nombre: '',
  cliente: '',
  tipo_obra: 'residencial',
  ubicacion: '',
  estado: 'PLANEACION',
  fecha_inicio: '',
  fecha_fin: '',
  notas: '',
  aiu_admin: '10',
  aiu_imprev: '5',
  aiu_utilidad: '5',
  aiu_iva: '19',
  aiu_retefuente: '0',
};

export default function ProyectosView({ onOpenHub }) {
  const { state, dispatch, calcularPresupuesto } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterOrigen, setFilterOrigen] = useState('todos');
  const [crmClientes, setCrmClientes] = useState([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Load User
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Load CRM clients
  useEffect(() => { loadCrmClientes(); }, []);
  async function loadCrmClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, empresa, telefono, email').order('nombre');
    setCrmClientes(data || []);
  }
  async function handleCreateQuickClient() {
    if (!newClientName.trim()) return;
    await supabase.from('clientes').insert({ nombre: newClientName.trim(), estado: 'activo', origen: 'manual' });
    setForm({ ...form, cliente: newClientName.trim() });
    setShowNewClient(false);
    setNewClientName('');
    loadCrmClientes();
  }

  const [viewMode, setViewMode] = useState('proyectos'); // 'proyectos' o 'cotizaciones'

  const filteredProyectos = useMemo(() => {
    const base = viewMode === 'proyectos' ? state.proyectos : (state.chatCotizaciones || []).map(c => ({
      id: c.id,
      nombre: 'Cotización Sin Nombre',
      cliente: c.cliente_nombre || 'Cliente Telegram',
      ubicacion: c.ubicacion || 'No especificada',
      estado: 'PLANEACION',
      plataforma_origen: 'telegram',
      creado_por: 'Bot Telegram',
      is_cotizacion: true,
      items: c.items || []
    }));

    return base.filter((p) => {
      const matchSearch = !search || 
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.cliente && p.cliente.toLowerCase().includes(search.toLowerCase()));
      
      const matchOrigen = filterOrigen === 'todos' || 
        (filterOrigen === 'mis' && p.creado_por === currentUser?.email) ||
        (filterOrigen === 'telegram' && p.plataforma_origen === 'telegram') ||
        (filterOrigen === 'web' && (!p.plataforma_origen || p.plataforma_origen === 'web'));
        
      return matchSearch && matchOrigen;
    });
  }, [state.proyectos, state.chatCotizaciones, search, filterOrigen, currentUser, viewMode]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (proyecto) => {
    setForm({
      nombre: proyecto.nombre,
      cliente: proyecto.cliente || '',
      tipo_obra: proyecto.tipo_obra || 'residencial',
      ubicacion: proyecto.ubicacion || '',
      estado: proyecto.estado,
      fecha_inicio: proyecto.fecha_inicio || '',
      fecha_fin: proyecto.fecha_fin || '',
      notas: proyecto.notas || '',
      aiu_admin: String(proyecto.aiu_admin ?? 10),
      aiu_imprev: String(proyecto.aiu_imprev ?? 5),
      aiu_utilidad: String(proyecto.aiu_utilidad ?? 5),
      aiu_iva: String(proyecto.aiu_iva ?? 19),
      aiu_retefuente: String(proyecto.aiu_retefuente ?? 0),
    });
    setEditingId(proyecto.id);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      aiu_admin: parseFloat(form.aiu_admin) || 0,
      aiu_imprev: parseFloat(form.aiu_imprev) || 0,
      aiu_utilidad: parseFloat(form.aiu_utilidad) || 0,
      aiu_iva: parseFloat(form.aiu_iva) || 0,
      aiu_retefuente: parseFloat(form.aiu_retefuente) || 0,
    };

    if (editingId) {
      dispatch({ type: 'UPDATE_PROYECTO', payload: { ...payload, id: editingId } });
    } else {
      dispatch({ type: 'ADD_PROYECTO', payload });
    }
    setShowModal(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    const item = state.proyectos.find(p => p.id === id);
    if (viewMode === 'proyectos') {
      if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${item?.nombre}"? Se perderán todos sus ítems de presupuesto vinculados.`)) {
        dispatch({ type: 'DELETE_PROYECTO', payload: id });
      }
    } else {
      alert('Funcionalidad de borrado de cotizaciones en desarrollo.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{viewMode === 'proyectos' ? 'Proyectos' : 'Cotizaciones Telegram'}</h1>
          <div className="page-header-subtitle">
            {viewMode === 'proyectos' ? 'Gestión de proyectos de obra' : 'Presupuestos rápidos recibidos por el bot'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--color-bg-secondary)', padding: 4, borderRadius: 10, display: 'flex', gap: 4 }}>
            <button 
              className={`btn btn-sm ${viewMode === 'proyectos' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('proyectos')}
            >
              Proyectos
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'cotizaciones' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('cotizaciones')}
            >
              Cotizaciones
            </button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Proyecto</button>
        </div>
      </div>

      <div className="page-body">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-bar">
            <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="form-input"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 220 }}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: 180, marginLeft: 12 }} 
            value={filterOrigen} 
            onChange={(e) => setFilterOrigen(e.target.value)}
          >
            <option value="todos">🌍 Todos los orígenes</option>
            <option value="mis">👤 Mis proyectos</option>
            <option value="telegram">📱 Telegram</option>
            <option value="web">💻 Web / Manual</option>
          </select>
          <div className="toolbar-spacer" />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {filteredProyectos.length} {viewMode === 'proyectos' ? 'proyectos' : 'cotizaciones'}
          </span>
        </div>

        {/* Project Cards */}
        {filteredProyectos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-md)' }}>
            {filteredProyectos.map((proyecto) => {
              const isCot = proyecto.is_cotizacion;
              const items = isCot ? proyecto.items : state.presupuestoItems.filter((pi) => pi.proyecto_id === proyecto.id);
              
              let totalDirecto = 0;
              if (isCot) {
                totalDirecto = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
              } else {
                totalDirecto = calcularPresupuesto(proyecto.id).costoDirecto;
              }

              const aiuAdmin = proyecto.aiu_admin ?? 10;
              const aiuImprev = proyecto.aiu_imprev ?? 5;
              const aiuUtilidad = proyecto.aiu_utilidad ?? 5;
              const totalAiu = totalDirecto * (1 + (aiuAdmin + aiuImprev + aiuUtilidad) / 100);

              const estadoInfo = ESTADOS.find((e) => e.value === proyecto.estado);

              return (
                <div className="card" key={proyecto.id} style={{ display: 'flex', flexDirection: 'column', border: isCot ? '1px dashed var(--color-accent)' : '1px solid var(--color-border)' }}>
                  <div className="card-body" style={{ flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{proyecto.nombre}</h3>
                        {proyecto.cliente && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>🏢 {proyecto.cliente}</div>
                        )}
                      </div>
                      <span
                        className="tag"
                        style={{ background: isCot ? '#0088cc18' : `${estadoInfo?.color}18`, color: isCot ? '#0088cc' : estadoInfo?.color }}
                      >
                        {isCot ? '📋 COTIZACIÓN' : estadoInfo?.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-md)' }}>
                      {proyecto.ubicacion && <div>📍 {proyecto.ubicacion}</div>}
                      {proyecto.fecha_inicio && (
                        <div>📅 {proyecto.fecha_inicio}{proyecto.fecha_fin ? ` → ${proyecto.fecha_fin}` : ''}</div>
                      )}
                      <div>📋 {items.length} ítem{items.length !== 1 ? 's' : ''} {isCot ? 'detectados' : 'en presupuesto'}</div>
                      {!isCot && <div>💼 AIU: {aiuAdmin}% + {aiuImprev}% + {aiuUtilidad}%</div>}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ 
                          padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: proyecto.plataforma_origen === 'telegram' ? '#0088cc18' : '#6366f118',
                          color: proyecto.plataforma_origen === 'telegram' ? '#0088cc' : '#6366f1',
                          border: `1px solid ${proyecto.plataforma_origen === 'telegram' ? '#0088cc30' : '#6366f130'}`,
                        }}>
                          {proyecto.plataforma_origen === 'telegram' ? '📱 Telegram' : '💻 ERP'}
                        </span>
                        {proyecto.creado_por && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                            👤 {proyecto.creado_por}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Budget Summary */}
                    <div style={{
                      background: 'var(--color-bg)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Costo Directo</div>
                        <div className="currency" style={{ fontSize: 13 }}>{formatCurrency(totalDirecto)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Total Est.</div>
                        <div className="currency" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>
                          {formatCurrency(totalAiu)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: 'var(--space-sm)',
                  }}>
                    {isCot ? (
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{ flex: 1 }} 
                        onClick={() => {
                          setForm({ ...emptyForm, nombre: proyecto.nombre, cliente: proyecto.cliente, ubicacion: proyecto.ubicacion });
                          setShowModal(true);
                          // Aquí podríamos pasar los items al modal si fuera necesario
                        }}
                      >
                        🚀 Convertir a Proyecto
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onOpenHub(proyecto.id)}>
                        ⚙️ Panel de Control
                      </button>
                    )}
                    {!isCot && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(proyecto)}>✏️</button>}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(proyecto.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No hay proyectos</h3>
              <p>Crea un proyecto para comenzar a armar presupuestos.</p>
              <button className="btn btn-primary" onClick={openCreate}>+ Crear proyecto</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Proyecto *</label>
                  <input
                    className="form-input"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Edificio Torres del Parque — Etapa 2"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cliente (CRM)</label>
                    {!showNewClient ? (
                      <>
                        <select
                          className="form-select"
                          value={form.cliente}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                              setShowNewClient(true);
                              setNewClientName('');
                            } else {
                              setForm({ ...form, cliente: e.target.value });
                            }
                          }}
                        >
                          <option value="">— Seleccionar cliente —</option>
                          {crmClientes.map(c => (
                            <option key={c.id} value={c.nombre}>
                              {c.nombre}{c.empresa ? ` (${c.empresa})` : ''}
                            </option>
                          ))}
                          <option value="__NEW__">➕ Crear nuevo cliente...</option>
                        </select>
                        {form.cliente && !crmClientes.some(c => c.nombre === form.cliente) && (
                          <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>⚠️ "{form.cliente}" no está en el CRM</div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="form-input"
                          style={{ flex: 1 }}
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Nombre del nuevo cliente..."
                          autoFocus
                        />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateQuickClient}>✓</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewClient(false)}>✕</button>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS.map((e) => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tipo de Proyecto</label>
                    <select className="form-select" value={form.tipo_obra} onChange={(e) => setForm({ ...form, tipo_obra: e.target.value })}>
                      {TIPOS_OBRA.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input
                    className="form-input"
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    placeholder="Bogotá, Colombia"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha Inicio</label>
                    <input type="date" className="form-input" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha Fin</label>
                    <input type="date" className="form-input" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                  </div>
                </div>

                {/* AIU Section */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    AIU (Administración, Imprevistos, Utilidad)
                  </div>
                  <div className="form-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className="form-group">
                      <label className="form-label">Admin %</label>
                      <input type="number" className="form-input" step="0.1" min="0" value={form.aiu_admin} onChange={(e) => setForm({ ...form, aiu_admin: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Imprevistos %</label>
                      <input type="number" className="form-input" step="0.1" min="0" value={form.aiu_imprev} onChange={(e) => setForm({ ...form, aiu_imprev: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Utilidad %</label>
                      <input type="number" className="form-input" step="0.1" min="0" value={form.aiu_utilidad} onChange={(e) => setForm({ ...form, aiu_utilidad: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">IVA %</label>
                      <input type="number" className="form-input" step="0.1" min="0" value={form.aiu_iva} onChange={(e) => setForm({ ...form, aiu_iva: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Retefuente %</label>
                      <input type="number" className="form-input" step="0.1" min="0" value={form.aiu_retefuente} onChange={(e) => setForm({ ...form, aiu_retefuente: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones del proyecto..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Proyecto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
