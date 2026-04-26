'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import ExcelImporter from './ExcelImporter';

const TIPOS = [
  { value: 'MATERIAL', label: 'Material', tagClass: 'tag-material' },
  { value: 'EQUIPO', label: 'Equipo', tagClass: 'tag-equipo' },
  { value: 'TRANSPORTE', label: 'Transporte', tagClass: 'tag-transporte' },
];

const UNIDADES = ['un', 'kg', 'm', 'm2', 'm3', 'lt', 'gl', 'hr', 'día', 'viaje', 'saco', 'varilla', 'pliego', 'rollo'];

const emptyForm = {
  nombre: '',
  tipo: 'MATERIAL',
  unidad: 'un',
  precio_unitario: '',
  notas: '',
};

const UNIDADES_PAGO = ['Mes', 'Día', 'Hora'];

export default function InsumosView() {
  const { state, dispatch } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const filteredInsumos = useMemo(() => {
    return state.insumos.filter((i) => {
      const matchSearch =
        !search ||
        i.nombre.toLowerCase().includes(search.toLowerCase()) ||
        i.codigo.toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filterTipo || i.tipo === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [state.insumos, search, filterTipo]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (insumo) => {
    setForm({
      nombre: insumo.nombre,
      tipo: insumo.tipo,
      unidad: insumo.unidad,
      precio_unitario: String(insumo.precio_unitario),
      notas: insumo.notas || '',
    });
    setEditingId(insumo.id);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      precio_unitario: parseFloat(form.precio_unitario) || 0,
    };

    if (editingId) {
      dispatch({ type: 'UPDATE_INSUMO', payload: { ...payload, id: editingId } });
    } else {
      dispatch({ type: 'ADD_INSUMO', payload });
    }

    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    // Verificar si el insumo está en uso en APU Detalles
    const isInAPU = state.apuDetalles.some(d => d.insumo_id === id);
    // Verificar si tiene transacciones de inventario
    const hasTransactions = state.inventario.some(t => t.insumo_id === id);

    if (isInAPU || hasTransactions) {
      let mensaje = 'No se puede eliminar este insumo porque: \n';
      if (isInAPU) mensaje += '- Está siendo utilizado en uno o más Análisis de Precios Unitarios (APU).\n';
      if (hasTransactions) mensaje += '- Tiene movimientos de inventario (entradas/salidas) registrados.\n';
      mensaje += '\nPor favor, remueva estas dependencias antes de intentar eliminarlo.';
      alert(mensaje);
      return;
    }

    if (confirm('¿Está seguro de eliminar este insumo? Esta acción no se puede deshacer.')) {
      dispatch({ type: 'DELETE_INSUMO', payload: id });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleImportExcel = (data) => {
    dispatch({ type: 'ADD_INSUMOS_BATCH', payload: data });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Insumos</h1>
          <div className="page-header-subtitle">
            Materiales, equipos y transporte
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            📤 Importación Masiva
          </button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-create-insumo">
            + Nuevo Insumo
          </button>
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
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 280 }}
              id="search-insumos"
            />
          </div>
          <select
            className="form-select"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            style={{ width: 160 }}
            id="filter-tipo-insumo"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="toolbar-spacer" />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {filteredInsumos.length} registro{filteredInsumos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="card">
          {filteredInsumos.length > 0 ? (
            <div className="table-container">
              <table className="data-table" id="table-insumos">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Unidad</th>
                    <th>Responsable</th>
                    <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInsumos.map((insumo) => {
                    const tipoInfo = TIPOS.find((t) => t.value === insumo.tipo);
                    return (
                      <tr key={insumo.id}>
                        <td><code style={{ fontSize: 12 }}>{insumo.codigo}</code></td>
                        <td style={{ fontWeight: 500 }}>{insumo.nombre}</td>
                        <td>
                          <span className={`tag ${tipoInfo?.tagClass || ''}`}>
                            {tipoInfo?.label || insumo.tipo}
                          </span>
                        </td>
                        <td>{insumo.unidad}</td>
                        <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{insumo.responsable_email || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            defaultValue={insumo.precio_unitario}
                            onBlur={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              if (newVal !== insumo.precio_unitario) {
                                dispatch({ type: 'UPDATE_INSUMO', payload: { id: insumo.id, precio_unitario: newVal } });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                            }}
                            className="inline-edit-input"
                            style={{ textAlign: 'right', width: 120 }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(insumo)}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(insumo.id)}
                              title="Eliminar"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No hay insumos registrados</h3>
              <p>
                {search || filterTipo
                  ? 'No se encontraron resultados con los filtros actuales.'
                  : 'Comienza agregando materiales, mano de obra y equipos.'}
              </p>
              {!search && !filterTipo && (
                <button className="btn btn-primary" onClick={openCreate}>
                  + Crear primer insumo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select
                    className="form-select"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Cemento Portland Tipo I"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unidad *</label>
                    <select
                      className="form-select"
                      value={form.unidad}
                      onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Precio Unitario (COP) *
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      value={form.precio_unitario}
                      onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                </div>

                <div className="form-group">

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea
                    className="form-textarea"
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ExcelImporter 
          onImport={handleImportExcel} 
          onClose={() => setShowImport(false)} 
          title="Importar Insumos"
        />
      )}
    </>
  );
}
