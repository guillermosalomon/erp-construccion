'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';

const UNIDADES = ['Hora', 'Día', 'Mes'];

const emptyForm = {
  nombre: '',
  unidad: 'Mes',
  precio_unitario: '0',
  factor_smlv: '1.0',
  categoria: 'Mano de Obra Directa',
};

const CATEGORIAS_CARGO = ['Oficina (Escritorio)', 'Campo (Móvil)', 'Mano de Obra Directa'];

export default function CargosView() {  const { state, dispatch, calcularDatosCargo } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, factor_smlv: '1.0', recargo_cop: 0, recargo_pct: 0 });
  const [search, setSearch] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberQty, setNewMemberQty] = useState(1);
  const [newMemberFactor, setNewMemberFactor] = useState('');

  const smlv = state.config?.find(c => c.clave === 'SMLV')?.valor || 2200000;
  const horasDia = state.config?.find(c => c.clave === 'HORAS_DIA')?.valor || 8;
  const horasMes = state.config?.find(c => c.clave === 'HORAS_MES')?.valor || 192;

  const currentMembers = useMemo(() => {
    if (!editingId) return [];
    return state.cargoDetalles.filter(d => d.cargo_padre_id === editingId);
  }, [state.cargoDetalles, editingId]);

  const filteredCargos = useMemo(() => {
    return state.cargos.filter((c) => {
      const matchSearch =
        !search ||
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (c.codigo && c.codigo.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [state.cargos, search]);

  const openCreate = () => {
    setForm({ ...emptyForm, factor_smlv: '1.0', recargo_cop: 0, recargo_pct: 0 });
    setEditingId(crypto.randomUUID());
    setIsCreating(true);
    setShowModal(true);
  };

  const openEdit = (cargo) => {
    setForm({
      nombre: cargo.nombre,
      unidad: cargo.unidad,
      precio_unitario: String(cargo.precio_unitario),
      factor_smlv: String(cargo.factor_smlv || 1.0),
      recargo_cop: cargo.recargo_cop || 0,
      recargo_pct: cargo.recargo_pct || 0,
      categoria: cargo.categoria || 'Mano de Obra Directa',
    });
    setEditingId(cargo.id);
    setIsCreating(false);
    setShowModal(true);
  };

  const handleSeedRoles = () => {
    const seed = [
      { nombre: 'Administrador', categoria: 'Oficina (Escritorio)', factor_smlv: 3.5, unidad: 'Mes', codigo: 'ADM-001' },
      { nombre: 'Director de Proyectos', categoria: 'Oficina (Escritorio)', factor_smlv: 8.0, unidad: 'Mes', codigo: 'DIR-001' },
      { nombre: 'Dir Financiero', categoria: 'Oficina (Escritorio)', factor_smlv: 6.0, unidad: 'Mes', codigo: 'FIN-001' },
      { nombre: 'Contabilidad', categoria: 'Oficina (Escritorio)', factor_smlv: 4.0, unidad: 'Mes', codigo: 'CON-001' },
      { nombre: 'Gerencia', categoria: 'Campo (Móvil)', factor_smlv: 10.0, unidad: 'Mes', codigo: 'GER-001' },
      { nombre: 'Interventor', categoria: 'Campo (Móvil)', factor_smlv: 8.0, unidad: 'Mes', codigo: 'INT-001' },
      { nombre: 'Ing. Residente', categoria: 'Campo (Móvil)', factor_smlv: 4.5, unidad: 'Mes', codigo: 'RES-001' },
      { nombre: 'Arq. Residente', categoria: 'Campo (Móvil)', factor_smlv: 4.5, unidad: 'Mes', codigo: 'RES-002' },
      { nombre: 'Practicante', categoria: 'Campo (Móvil)', factor_smlv: 1.0, unidad: 'Mes', codigo: 'PRA-001' },
      { nombre: 'Almacén (Bodega)', categoria: 'Campo (Móvil)', factor_smlv: 1.5, unidad: 'Mes', codigo: 'ALM-001' },
    ];

    seed.forEach(item => {
      const exists = state.cargos.some(c => c.nombre === item.nombre);
      if (!exists) {
        dispatch({ type: 'ADD_CARGO', payload: { ...item, id: crypto.randomUUID() } });
      }
    });
    alert('Roles de ley y administrativos unificados con éxito.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      factor_smlv: parseFloat(form.factor_smlv) || 1,
      recargo_cop: parseFloat(form.recargo_cop) || 0,
      recargo_pct: parseFloat(form.recargo_pct) || 0,
    };

    if (isCreating) {
      dispatch({ type: 'ADD_CARGO', payload: { ...payload, id: editingId } });
    } else {
      dispatch({ type: 'UPDATE_CARGO', payload: { ...payload, id: editingId } });
    }

    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleAddMember = () => {
    if (!newMemberId || !editingId) return;
    const childCargo = state.cargos.find(c => c.id === newMemberId);
    const inheritedFactor = parseFloat(childCargo?.factor_smlv) || 1.0;
    dispatch({
      type: 'ADD_CARGO_DETALLE',
      payload: { 
        id: crypto.randomUUID(),
        cargo_padre_id: editingId, 
        cargo_hijo_id: newMemberId, 
        cantidad: parseFloat(newMemberQty) || 1,
        factor_smlv: newMemberFactor ? parseFloat(newMemberFactor) : inheritedFactor
      }
    });
    setNewMemberId('');
    setNewMemberQty(1);
    setNewMemberFactor('');
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Base de Datos de Mano de Obra</h1>
          <div className="page-header-subtitle">
            Gestione cargos individuales y arme cuadrillas (equipos) con costos consolidados.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleSeedRoles}>
            ⚖️ Sincronizar Roles de Ley
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo Cargo / Equipo
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* SMLV Config Bar */}
        <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'var(--color-bg-alt)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: 24 }}>⚖️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>SMLV Global</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: 150, fontWeight: 700, fontSize: 18 }}
                    value={smlv}
                    onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'SMLV', valor: e.target.value } })}
                  />
                  <span style={{ color: '#94a3b8' }}>COP / mes</span>
                </div>
              </div>
            </div>
            <div style={{ height: 40, width: 1, background: '#e2e8f0' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: 24 }}>⏱️</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Horas / Día</div>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ width: 70, fontWeight: 700, padding: '4px 8px' }}
                  value={horasDia}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'HORAS_DIA', valor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ height: 40, width: 1, background: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: 24 }}>📅</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Horas / Mes</div>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ width: 70, fontWeight: 700, padding: '4px 8px' }}
                  value={horasMes}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'HORAS_MES', valor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ height: 40, width: 1, background: '#e2e8f0' }} />
            <div style={{ fontSize: 11, color: '#64748b', maxWidth: 300, lineHeight: 1.3 }}>
              Las tarifas se ajustan automáticamente al cambiar SMLV o factores de tiempo.
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-bar">
            {/* SVG icon unchanged */}
            <input
              className="form-input"
              type="text"
              placeholder="Buscar por cargo o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 300 }}
            />
          </div>
        </div>

        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Nombre del Cargo / Equipo</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'right' }}>Factor SMLV</th>
                  <th style={{ textAlign: 'right' }}>Tarifa Real</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCargos.map((cargo) => {
                  const data = calcularDatosCargo(cargo.id);
                  const isCrew = state.cargoDetalles.some(d => d.cargo_padre_id === cargo.id);

                  return (
                    <tr key={cargo.id}>
                      <td><code>{cargo.codigo}</code></td>
                      <td>
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 6px', 
                          borderRadius: 4, 
                          background: cargo.categoria?.includes('Oficina') ? '#dbeafe' : cargo.categoria?.includes('Campo') ? '#dcfce7' : '#f1f5f9',
                          color: cargo.categoria?.includes('Oficina') ? '#1e40af' : cargo.categoria?.includes('Campo') ? '#166534' : '#475569',
                          fontWeight: 600
                        }}>
                          {cargo.categoria || 'Mano de Obra'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isCrew ? 'badge-primary' : 'badge-light'}`}>
                          {isCrew ? '👥 Equipo' : '👤 Individual'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{cargo.nombre}</td>
                      <td>
                        <select 
                          className="inline-edit-input"
                          style={{ width: 80 }}
                          value={cargo.unidad}
                          onChange={(e) => dispatch({ type: 'UPDATE_CARGO', payload: { id: cargo.id, unidad: e.target.value } })}
                        >
                          <option value="Hora">Hora</option>
                          <option value="Día">Día</option>
                          <option value="Mes">Mes</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          {isCrew ? (
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>
                              {data.factor.toFixed(2)}
                            </span>
                          ) : (
                            <input 
                              type="number"
                              step="0.01"
                              className="inline-edit-input"
                              style={{ width: 60, textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}
                              defaultValue={cargo.factor_smlv || 1.0}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 1.0;
                                if (val !== cargo.factor_smlv) {
                                  dispatch({ type: 'UPDATE_CARGO', payload: { id: cargo.id, factor_smlv: val } });
                                }
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            />
                          )}
                          <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>x</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                          {formatCurrency(smlv * data.factor)} /mes
                        </div>
                        {formatCurrency(data.precio)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cargo)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => dispatch({ type: 'DELETE_CARGO', payload: cargo.id })}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 850 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isCreating ? 'Nuevo Cargo / Equipo' : 'Editar Cargo / Equipo'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
                <form onSubmit={handleSubmit} id="cargo-form">
                  <h3 style={{ fontSize: 14, marginBottom: 16 }}>Configuración General</h3>
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <select
                      className="form-select"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    >
                      {CATEGORIAS_CARGO.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                        <option value="Hora">Hora</option>
                        <option value="Día">Día</option>
                        <option value="Mes">Mes</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Factor SMLV Base</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={currentMembers.length > 0 ? calcularDatosCargo(editingId).factor.toFixed(2) : form.factor_smlv}
                        onChange={(e) => setForm({ ...form, factor_smlv: e.target.value })}
                        disabled={currentMembers.length > 0}
                        style={currentMembers.length > 0 ? { fontWeight: 700, color: 'var(--color-primary)', background: '#f8fafc' } : {}}
                        title={currentMembers.length > 0 ? "Calculado automáticamente como la suma de integrantes" : ""}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: 14, marginBottom: 12 }}>Recargos Administrativos</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Recargo Fijo ($)</label>
                        <input
                          className="form-input"
                          type="number"
                          value={form.recargo_cop}
                          onChange={(e) => setForm({ ...form, recargo_cop: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recargo (%)</label>
                        <input
                          className="form-input"
                          type="number"
                          value={form.recargo_pct}
                          onChange={(e) => setForm({ ...form, recargo_pct: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </form>

                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 24 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 16 }}>Composición del Equipo (Integrantes)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 40px', gap: 8, marginBottom: 16 }}>
                    <select 
                      className="form-select" 
                      value={newMemberId}
                      onChange={(e) => setNewMemberId(e.target.value)}
                    >
                      <option value="">Integrante...</option>
                      {state.cargos.filter(c => c.id !== editingId).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={newMemberQty} 
                      onChange={(e) => setNewMemberQty(e.target.value)}
                      placeholder="Cant."
                    />
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-input" 
                      value={newMemberFactor} 
                      onChange={(e) => setNewMemberFactor(e.target.value)}
                      placeholder="Factor"
                      title="Sobreescribir factor SMLV para este equipo"
                    />
                    <button className="btn btn-secondary" onClick={handleAddMember}>+</button>
                  </div>

                  <div className="table-container" style={{ maxHeight: 250 }}>
                    <table className="data-table" style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Cant.</th>
                          <th style={{ textAlign: 'right' }}>Factor</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMembers.map((det, idx) => {
                          const cargo = state.cargos.find(c => c.id === det.cargo_hijo_id);
                          const factorFromDB = parseFloat(cargo?.factor_smlv) || 1.0;
                          const displayFactor = det.factor_smlv != null ? parseFloat(det.factor_smlv) : factorFromDB;
                          return (
                            <tr key={det.id || `member-${idx}`}>
                              <td>{cargo?.nombre}</td>
                              <td>{det.cantidad}</td>
                              <td style={{ textAlign: 'right' }}>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="inline-edit-input"
                                  style={{ width: 50, textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}
                                  value={displayFactor}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    dispatch({ type: 'UPDATE_CARGO_DETALLE', payload: { id: det.id, factor_smlv: val } });
                                  }}
                                />
                              </td>
                              <td>
                                <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'DELETE_CARGO_DETALLE', payload: det.id })}>✕</button>
                              </td>
                            </tr>
                          );
                        })}
                        {currentMembers.length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', opacity: 0.5 }}>Individual (Sin integrantes)</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 24, background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', borderStyle: 'dashed' }}>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-primary)' }}>Resultado Consolidado</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Costo Miembros: <strong style={{ color: 'var(--color-text)' }}>{formatCurrency(editingId ? calcularDatosCargo(editingId).precio : 0)}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Suma Factor Base: <strong style={{ color: 'var(--color-text)' }}>{editingId ? calcularDatosCargo(editingId).factor.toFixed(2) : 1}x</strong>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatCurrency(editingId ? calcularDatosCargo(editingId).precio : 0)}
                      <small style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>/ {form.unidad}</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" form="cargo-form" className="btn btn-primary" onClick={handleSubmit}>
                {isCreating ? 'Crear Cargo' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .badge { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 700; text-transform: uppercase; }
        .badge-primary { background: var(--color-primary-light); color: var(--color-primary); }
        .badge-light { background: #f1f5f9; color: #64748b; }
      `}</style>
    </>
  );
}
