'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';

const ESTADOS = [
  { value: 'PLANEACION', label: 'Planeación', color: '#2563eb' },
  { value: 'EJECUCION', label: 'Ejecución', color: '#d97706' },
  { value: 'FINALIZADO', label: 'Finalizado', color: '#16a34a' },
  { value: 'CANCELADO', label: 'Cancelado', color: '#dc2626' },
];

const emptyForm = {
  nombre: '',
  cliente: '',
  ubicacion: '',
  estado: 'PLANEACION',
  fecha_inicio: '',
  fecha_fin: '',
  notas: '',
  aiu_admin: '10',
  aiu_imprev: '5',
  aiu_utilidad: '5',
};

export default function ProyectosView({ onOpenHub }) {
  const { state, dispatch, calcularPresupuesto } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const filteredProyectos = useMemo(() => {
    return state.proyectos.filter(
      (p) =>
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.cliente && p.cliente.toLowerCase().includes(search.toLowerCase()))
    );
  }, [state.proyectos, search]);

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
      ubicacion: proyecto.ubicacion || '',
      estado: proyecto.estado,
      fecha_inicio: proyecto.fecha_inicio || '',
      fecha_fin: proyecto.fecha_fin || '',
      notas: proyecto.notas || '',
      aiu_admin: String(proyecto.aiu_admin ?? 10),
      aiu_imprev: String(proyecto.aiu_imprev ?? 5),
      aiu_utilidad: String(proyecto.aiu_utilidad ?? 5),
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
    if (confirm('¿Eliminar este proyecto y todo su presupuesto?')) {
      dispatch({ type: 'DELETE_PROYECTO', payload: id });
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Proyectos</h1>
          <div className="page-header-subtitle">Gestión de proyectos de obra</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Proyecto</button>
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
              placeholder="Buscar proyecto o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 280 }}
            />
          </div>
          <div className="toolbar-spacer" />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {filteredProyectos.length} proyecto{filteredProyectos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Project Cards */}
        {filteredProyectos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-md)' }}>
            {filteredProyectos.map((proyecto) => {
              const items = state.presupuestoItems.filter((pi) => pi.proyecto_id === proyecto.id);
              const presupuesto = calcularPresupuesto(proyecto.id);
              const estadoInfo = ESTADOS.find((e) => e.value === proyecto.estado);

              return (
                <div className="card" key={proyecto.id} style={{ display: 'flex', flexDirection: 'column' }}>
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
                        style={{ background: `${estadoInfo?.color}18`, color: estadoInfo?.color }}
                      >
                        {estadoInfo?.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 'var(--space-md)' }}>
                      {proyecto.ubicacion && <div>📍 {proyecto.ubicacion}</div>}
                      {proyecto.fecha_inicio && (
                        <div>📅 {proyecto.fecha_inicio}{proyecto.fecha_fin ? ` → ${proyecto.fecha_fin}` : ''}</div>
                      )}
                      <div>📋 {items.length} ítem{items.length !== 1 ? 's' : ''} en presupuesto</div>
                      <div>💼 AIU: {proyecto.aiu_admin}% + {proyecto.aiu_imprev}% + {proyecto.aiu_utilidad}%</div>
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
                        <div className="currency" style={{ fontSize: 13 }}>{formatCurrency(presupuesto.costoDirecto)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Total c/AIU</div>
                        <div className="currency" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-accent)' }}>
                          {formatCurrency(presupuesto.gran_total)}
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
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onOpenHub(proyecto.id)}>
                      ⚙️ Panel de Control
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(proyecto)}>✏️</button>
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
                    <label className="form-label">Cliente</label>
                    <input
                      className="form-input"
                      value={form.cliente}
                      onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                      placeholder="Constructora ABC S.A.S."
                    />
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
                  <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="form-group">
                      <label className="form-label">Administración %</label>
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
