'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import ExcelImporter from './ExcelImporter';
import { calcularPrecioMercado, calcularDiferencia } from '@/lib/price-engine';

const TIPOS = [
  { value: 'MATERIAL', label: 'Material', tagClass: 'tag-material' },
  { value: 'EQUIPO', label: 'Equipo', tagClass: 'tag-equipo' },
  { value: 'TRANSPORTE', label: 'Transporte', tagClass: 'tag-transporte' },
];



const UNIDADES = ['un', 'kg', 'Lb', 'ML', 'm2', 'm3', 'lt', 'Gal', 'Bto', 'Var', 'Jgo', 'Hr', 'Día', 'Ton', 'Bolsa', 'Pliego', 'rollo', 'Caps'];

const MARCAS = [
  'Sin Marca',
  'Corona',
  'Argos',
  'Cemex',
  'Sika',
  'Pintuco',
  'Toxement',
  'Pavco',
  'Gerfor',
  'Ternium',
  'Acesco',
  'Bosch',
  'DeWalt',
  'Makita',
  'Stanley',
  'Caterpillar',
  'Otro'
];

const emptyForm = {
  nombre: '',
  tipo: 'MATERIAL',
  unidad: 'un',
  precio_unitario: '',
  categoria_id: '',
  marca: 'Sin Marca',
  notas: '',
};

const UNIDADES_PAGO = ['Mes', 'Día', 'Hora'];

export default function InsumosView() {
  const { state, dispatch, getInsumoApuUsage } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [marcaFilters, setMarcaFilters] = useState({});

  const filteredInsumos = useMemo(() => {
    return state.insumos.filter((i) => {
      const matchSearch =
        !search ||
        i.nombre.toLowerCase().includes(search.toLowerCase()) ||
        i.codigo.toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filterTipo || i.tipo === filterTipo;
      const matchCat = !filterCategoria || i.categoria_id === filterCategoria;
      return matchSearch && matchTipo && matchCat;
    });
  }, [state.insumos, search, filterTipo, filterCategoria]);

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
      categoria_id: insumo.categoria_id || '',
      marca: insumo.marca || 'Sin Marca',
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
      categoria_id: form.categoria_id === '' ? null : form.categoria_id,
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

    if (confirm(`¿Estás seguro de que deseas eliminar el insumo "${item.nombre}"? Esta acción no se puede deshacer.`)) {
      dispatch({ type: 'DELETE_INSUMO', payload: id });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleImportExcel = (data) => {
    dispatch({ type: 'ADD_INSUMOS_BATCH', payload: data });
  };

  const [loadingSeed, setLoadingSeed] = useState(false);

  const handleLoadSeedInsumos = async () => {
    setLoadingSeed(true);
    try {
      console.log('[SeedImport] Fetching seed-insumos.json...');
      const res = await fetch('/seed-insumos.json');
      if (!res.ok) {
        alert('Error: No se pudo leer el archivo seed-insumos.json (HTTP ' + res.status + ')');
        setLoadingSeed(false);
        return;
      }
      const data = await res.json();
      const insumos = data?.insumos;
      console.log('[SeedImport] Insumos leídos:', insumos?.length);
      
      if (!Array.isArray(insumos) || insumos.length === 0) {
        alert('El archivo de catálogo está vacío o tiene formato inválido.');
        setLoadingSeed(false);
        return;
      }

      // Filtrar insumos que ya existen (por nombre)
      const existingNames = new Set(state.insumos.map(i => i.nombre.toLowerCase()));
      const insumosPayload = insumos
        .filter(i => i.nombre && !existingNames.has(i.nombre.toLowerCase()))
        .map(i => ({
          nombre: i.nombre,
          tipo: i.tipo || 'MATERIAL',
          unidad: i.unidad || 'un',
          precio_unitario: i.precio_unitario || 0,
          categoria_id: null,
          notas: i.categoria ? `Cat: ${i.categoria}` : '',
        }));

      console.log('[SeedImport] Nuevos insumos a importar:', insumosPayload.length);

      if (insumosPayload.length === 0) {
        alert('Todos los insumos del catálogo ya existen en el sistema.');
        setLoadingSeed(false);
        return;
      }

      dispatch({ type: 'ADD_INSUMOS_BATCH', payload: insumosPayload });
      alert(`✅ ${insumosPayload.length} insumos importados exitosamente.`);
    } catch (err) {
      console.error('[SeedImport] Error:', err);
      alert('Error al cargar el catálogo: ' + err.message);
    }
    setLoadingSeed(false);
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
          <button className="btn btn-ghost" onClick={handleLoadSeedInsumos} disabled={loadingSeed} title="Importar catálogo de construcción desde APU_ERP.xlsx" style={{ fontSize: 12 }}>
            {loadingSeed ? '⏳ Importando...' : '📦 Catálogo Base'}
          </button>
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
          <select
            className="form-select"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">Todas las categorías</option>
            {state.categorias?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
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
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ textAlign: 'right' }}>Mercado</th>
                    <th>APU Asociados</th>
                    <th style={{ width: 60 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInsumos.map((insumo) => {
                    const tipoInfo = TIPOS.find((t) => t.value === insumo.tipo);
                    const mercado = calcularPrecioMercado(insumo.id, state.mkOfertas, '', marcaFilters[insumo.id] || '');
                    
                    return (
                      <tr key={insumo.id}>
                        <td><code style={{ fontSize: 12 }}>{insumo.codigo}</code></td>
                        <td>
                          <input 
                            className="inline-edit-input"
                            style={{ fontWeight: 600, width: '100%' }}
                            defaultValue={insumo.nombre}
                            onBlur={(e) => {
                              if (e.target.value !== insumo.nombre) {
                                dispatch({ type: 'UPDATE_INSUMO', payload: { id: insumo.id, nombre: e.target.value } });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <select 
                            className="inline-edit-input"
                            style={{ width: '100%', fontSize: 10 }}
                            value={insumo.tipo}
                            onChange={(e) => dispatch({ type: 'UPDATE_INSUMO', payload: { id: insumo.id, tipo: e.target.value } })}
                          >
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="inline-edit-input"
                            style={{ width: '100%', fontSize: 10 }}
                            value={insumo.categoria_id || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_INSUMO', payload: { id: insumo.id, categoria_id: e.target.value === '' ? null : e.target.value } })}
                          >
                            <option value="">Sin Categoría</option>
                            {state.categorias?.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                          </select>
                        </td>
                        <td>
                          <select 
                            className="inline-edit-input"
                            style={{ width: '100%', fontSize: 10 }}
                            value={insumo.unidad}
                            onChange={(e) => dispatch({ type: 'UPDATE_INSUMO', payload: { id: insumo.id, unidad: e.target.value } })}
                          >
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            key={`price-${insumo.id}-${insumo.precio_unitario}-${mercado?.precio_mercado}`}
                            type="number"
                            defaultValue={Number(insumo.precio_unitario) === 0 && mercado ? mercado.precio_mercado : insumo.precio_unitario}
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
                            style={{ 
                              textAlign: 'right', 
                              width: 120,
                              color: Number(insumo.precio_unitario) === 0 && mercado ? '#8b5cf6' : 'inherit',
                              fontWeight: Number(insumo.precio_unitario) === 0 && mercado ? 700 : 'normal'
                            }}
                            title={Number(insumo.precio_unitario) === 0 && mercado ? 'Reflejando precio de mercado (Marketplace)' : ''}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(() => {
                            if (!mercado) return <span style={{ fontSize: 10, color: '#cbd5e1' }}>—</span>;
                            const diff = calcularDiferencia(insumo.precio_unitario, mercado.precio_mercado);
                            const diffColor = diff.direccion === 'abajo' ? '#16a34a' : diff.direccion === 'arriba' ? '#ef4444' : '#64748b';
                            const diffBg = diff.direccion === 'abajo' ? '#f0fdf4' : diff.direccion === 'arriba' ? '#fef2f2' : '#f8fafc';
                            return (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{formatCurrency(mercado.precio_mercado)}</div>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 }}>
                                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, color: diffColor, background: diffBg }}>
                                    {diff.porcentaje > 0 ? '+' : ''}{diff.porcentaje}%
                                  </span>
                                  <span style={{ fontSize: 9, color: '#94a3b8' }}>{mercado.num_ofertas} oferta{mercado.num_ofertas !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ maxWidth: 200 }}>
                            {(() => {
                              const apus = getInsumoApuUsage(insumo.id);
                              if (apus.length === 0) return <span style={{ fontSize: 9, color: '#94a3b8' }}>Sin uso</span>;
                              return (
                                <details className="apu-dropdown" style={{ cursor: 'pointer' }}>
                                  <summary style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>📦 {apus.length} APUs</span>
                                    <span style={{ fontSize: 8 }}>▼</span>
                                  </summary>
                                  <div style={{ 
                                    marginTop: 4, 
                                    padding: 6, 
                                    background: '#fff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: 4, 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    position: 'absolute',
                                    zIndex: 10,
                                    maxHeight: 150,
                                    overflowY: 'auto',
                                    width: 180
                                  }}>
                                    {apus.map(a => (
                                      <div key={a.id} style={{ fontSize: 9, padding: '4px 0', borderBottom: '1px solid #f1f5f9', whiteSpace: 'normal', color: '#475569' }}>
                                        <strong>{a.codigo}</strong>: {a.nombre}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              );
                            })()}
                          </div>
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
                            {(() => {
                              const apuCount = getInsumoApuUsage(insumo.id).length;
                              const hasInventory = state.inventario.some(t => t.insumo_id === insumo.id);
                              const isLocked = apuCount > 0 || hasInventory;
                              if (isLocked) {
                                return (
                                  <button className="btn btn-ghost btn-sm" disabled title={`No se puede eliminar: ${apuCount > 0 ? apuCount + ' APU(s) asociados' : ''}${apuCount > 0 && hasInventory ? ' + ' : ''}${hasInventory ? 'tiene movimientos de inventario' : ''}`} style={{ color: '#94a3b8', cursor: 'not-allowed', opacity: 0.6 }}>🔒</button>
                                );
                              }
                              return (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleDelete(insumo.id)}
                                  title="Eliminar"
                                  style={{ color: 'var(--color-danger)' }}
                                >
                                  🗑️
                                </button>
                              );
                            })()}
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
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={form.categoria_id || ''}
                    onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  >
                    <option value="">Sin Categoría</option>
                    {state.categorias?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
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
