'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import { personalService } from '@/lib/services';

const UNIDADES_PAGO = ['Mes', 'Día', 'Hora'];

const emptyForm = {
  nombres: '',
  apellidos: '',
  email: '',
  profesion: '',
  cedula: '',
  tp_numero: '',
  foto_url: '',
  cedula_url: '',
  tp_url: '',
  arl_numero: '',
  arl_url: '',
  cargo_id: '',
  app_role: 'cuadrilla',
  unidad_pago: 'Mes',
  salario_base: '',
  factor_smlv: '',
  tareas_asignadas: [], 
};

export default function PersonalView() {
  const { user } = useAuth();
  const { state, dispatch, getProjectLaborNeeds, getCargoProjectItems, calcularDatosCargo } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('person');
  const [manualProfession, setManualProfession] = useState('');
  const [isOtherCargo, setIsOtherCargo] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [numCuadrillasMap, setNumCuadrillasMap] = useState({});
  const [activeCuadTab, setActiveCuadTab] = useState({});

  // Persistir numCuadrillasMap en localStorage por proyecto
  useEffect(() => {
    if (selectedProjectId) {
      try {
        const saved = localStorage.getItem(`cuadrillas_${selectedProjectId}`);
        if (saved) setNumCuadrillasMap(JSON.parse(saved));
        else setNumCuadrillasMap({});
      } catch { setNumCuadrillasMap({}); }
    }
  }, [selectedProjectId]);

  const updateNumCuadrillas = (cargoId, val) => {
    const newVal = Math.max(1, parseInt(val) || 1);
    setNumCuadrillasMap(prev => {
      const updated = { ...prev, [cargoId]: newVal };
      if (selectedProjectId) {
        localStorage.setItem(`cuadrillas_${selectedProjectId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  useEffect(() => {
    const handleOpenMyProfile = () => {
      const me = state.personal.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase());
      if (me) {
        openEdit(me);
      } else {
        openCreate();
        setForm(f => ({ ...f, email: user?.email || '' }));
      }
    };
    window.addEventListener('open-my-profile', handleOpenMyProfile);
    return () => window.removeEventListener('open-my-profile', handleOpenMyProfile);
  }, [user, state.personal]);

  // Listener: abrir perfil desde otros módulos (ej: click en supervisor en ProgressView)
  useEffect(() => {
    const handleEditPerson = (e) => {
      const personId = e.detail?.personId;
      if (!personId) return;
      const person = state.personal.find(p => p.id === personId);
      if (person) openEdit(person);
    };
    window.addEventListener('edit-person-profile', handleEditPerson);
    return () => window.removeEventListener('edit-person-profile', handleEditPerson);
  }, [state.personal]);

  const h_dia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
  const h_mes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
  const dias_mes = h_mes / h_dia;

  const projectNeeds = useMemo(() => getProjectLaborNeeds(selectedProjectId), [selectedProjectId, getProjectLaborNeeds]);
  
  const possibleTasks = useMemo(() => {
    if (!selectedProjectId || !form.cargo_id) return [];
    return getCargoProjectItems(selectedProjectId, form.cargo_id);
  }, [selectedProjectId, form.cargo_id, getCargoProjectItems]);

  const filteredPersonal = useMemo(() => {
    if (selectedProjectId) {
      const assignedIds = state.personalProyecto
        .filter(ap => ap.proyecto_id === selectedProjectId)
        .map(ap => ap.personal_id);
      return state.personal.filter(p => assignedIds.includes(p.id));
    }
    return state.personal.filter(p => 
      !search || 
      (p.nombres + ' ' + p.apellidos + ' ' + p.nombre).toLowerCase().includes(search.toLowerCase()) || 
      p.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.personal, state.personalProyecto, search, selectedProjectId]);

  const openCreate = (cargoId = '') => {
    setEditingId(null);
    setForm({ ...emptyForm, cargo_id: cargoId });
    setActiveTab('person');
    setManualProfession('');
    setShowModal(true);
  };

  const openEdit = (person) => {
    setEditingId(person.id);
    const names = person.nombres || (person.nombre?.split(' ') || [])[0] || '';
    const lastNames = person.apellidos || (person.nombre?.split(' ') || []).slice(1).join(' ') || '';
    
    const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
    const factorCalc = person.salario_base ? (person.salario_base / smlv).toFixed(2) : '';

    setForm({
      ...emptyForm,
      ...person,
      nombres: names,
      apellidos: lastNames,
      profesion: person.profesion || '',
      salario_base: String(person.salario_base || 0),
      factor_smlv: factorCalc,
      unidad_pago: person.unidad_pago || 'Mes',
      app_role: (() => { const NORM = { 'gerencia': 'admin', 'almacen': 'bodega', 'ing_residente': 'operativo', 'arq_residente': 'operativo', 'practicante': 'operativo', 'interventor': 'operativo' }; const r = (person.app_role || '').toLowerCase(); return NORM[r] || r || 'cuadrilla'; })(),
      arl_numero: person.arl_numero || '',
      arl_url: person.arl_url || '',
    });

    setIsOtherCargo(false);
    setNewCargoName('');

    setActiveTab('person');
    setShowModal(true);
  };

  const handleEmailChange = (email) => {
    try {
      setForm(f => ({ ...f, email }));
      
      // Solo buscar si tiene formato mínimo de email
      if (email && email.includes('@') && email.length > 5) {
        if (!Array.isArray(state.personal)) return;
        
        const match = state.personal.find(p => p.email?.toLowerCase() === email.toLowerCase());
        if (match) {
          const names = match.nombres || (match.nombre?.split(' ') || [])[0] || '';
          const lastNames = match.apellidos || (match.nombre?.split(' ') || []).slice(1).join(' ') || '';
          
          const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
          const factorCalc = match.salario_base ? (match.salario_base / smlv).toFixed(2) : '';

          setForm(f => ({
            ...f,
            ...match,
            email, // Mantener el texto tal cual se escribe
            nombres: names,
            apellidos: lastNames,
            salario_base: String(match.salario_base || ''),
            factor_smlv: factorCalc
          }));
        }
      }
    } catch (err) {
      console.error("[EmailAutocomplete] Error:", err);
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await personalService.uploadDocument(file, field);
      setForm(f => ({ ...f, [field]: url }));
    } catch (err) {
      alert('Error al subir archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let finalCargoId = form.cargo_id;

    // Si es un cargo nuevo, lo creamos primero en la base de datos
    if (finalCargoId === 'NEW' && newCargoName) {
      const newCargo = {
        id: crypto.randomUUID(),
        nombre: newCargoName,
        categoria: 'Mano de Obra Directa', // Categoría inicial sugerida
        factor_smlv: 1.0,
        unidad: 'Mes'
      };
      
      // Intentar sincronizar inmediatamente
      dispatch({ type: 'ADD_CARGO', payload: newCargo });
      finalCargoId = newCargo.id;
    }

    const globalPayload = {
      ...form,
      cargo_id: finalCargoId,
      profesion: state.cargos.find(c => c.id === finalCargoId)?.nombre || form.profesion || newCargoName,
      nombre: (form.nombres + ' ' + form.apellidos).trim(),
      salario_base: parseFloat(form.salario_base) || 0
    };

    const existingPerson = state.personal.find(p => p.email?.toLowerCase() === form.email?.toLowerCase());
    let personToLink = existingPerson;

    if (!existingPerson) {
      const newPersonId = crypto.randomUUID();
      dispatch({ type: 'ADD_PERSON', payload: { ...globalPayload, id: newPersonId } });
      personToLink = { ...globalPayload, id: newPersonId };
    } else {
      dispatch({ type: 'UPDATE_PERSON', payload: { ...globalPayload, id: existingPerson.id } });
      personToLink = { ...globalPayload, id: existingPerson.id };
    }

    if (selectedProjectId) {
      const asignacionPayload = {
        personal_id: personToLink.id,
        proyecto_id: selectedProjectId,
        cargo_id: finalCargoId || null,
        unidades_asignadas: 1,
        salario_pactado: parseFloat(form.salario_base) || 0,
        unidad_pactada: form.unidad_pago,
        tareas_asignadas: form.tareas_asignadas || []
      };

      const existingAsignacion = state.personalProyecto.find(
        ap => ap.proyecto_id === selectedProjectId && ap.personal_id === personToLink.id
      );

      if (existingAsignacion) {
        dispatch({ type: 'UPDATE_PERSON_PROYECTO', payload: { ...asignacionPayload, id: existingAsignacion.id } });
      } else {
        dispatch({ type: 'ADD_PERSON_PROYECTO', payload: { ...asignacionPayload, id: crypto.randomUUID() } });
      }
    }
    setShowModal(false);
    setIsOtherCargo(false);
    setNewCargoName('');
  };

  const handleDelete = (id) => {
    if (selectedProjectId) {
      const asignacion = state.personalProyecto.find(ap => ap.proyecto_id === selectedProjectId && ap.personal_id === id);
      if (asignacion && confirm('¿Quitar trabajador del proyecto?')) {
        dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: asignacion.id });
      }
    } else {
      if (confirm('¿Eliminar trabajador GLOBALMENTE?')) {
        dispatch({ type: 'DELETE_PERSON', payload: id });
      }
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Perfil Profesional y Personal</h1>
          <div className="page-header-subtitle">Hoja de vida digital y asignación de obra</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            className="form-select" 
            style={{ width: 250, border: '2px solid var(--color-primary)' }}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">🌎 Base de Datos Global</option>
            {state.proyectos.map(pr => <option key={pr.id} value={pr.id}>🏗️ {pr.nombre}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => openCreate()}>
            + Nuevo Perfil
          </button>
        </div>
      </div>

      <div className="page-body">
        {selectedProjectId && (
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16 }}>📋 Roles Requeridos (Presupuesto)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {Object.entries(projectNeeds).map(([cargoId, metrics]) => {
                const cargo = state.cargos.find(c => c.id === cargoId);
                if (!cargo) return null;
                const crewMembers = state.cargoDetalles.filter(d => d.cargo_padre_id === cargoId);
                const isCrew = crewMembers.length > 0;
                const rolesToShow = isCrew 
                  ? crewMembers.map(m => {
                      const cc = state.cargos.find(c => c.id === m.cargo_hijo_id);
                      return { id: m.cargo_hijo_id, nombre: cc?.nombre || '?', cantidad: m.cantidad };
                    })
                  : [{ id: cargoId, nombre: cargo.nombre, cantidad: 1 }];
                const supervisors = state.personalProyecto.filter(ap => ap.proyecto_id === selectedProjectId && ap.cargo_id === cargoId && ap.unidad_pactada === 'SUPERVISOR');
                const supPersons = supervisors.map(ap => ({ person: state.personal.find(p => p.id === ap.personal_id), aId: ap.id })).filter(a => a.person);
                return (
                  <div key={cargoId} className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{isCrew ? '👥 ' : '👤 '}{cargo.nombre}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Requerido: {Math.round(metrics.horasTotal)}h</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                          <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>N° CUADRILLAS</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="20"
                            value={numCuadrillasMap[cargoId] || 1}
                            onChange={(e) => updateNumCuadrillas(cargoId, e.target.value)}
                            style={{ width: 36, border: '1px solid #e2e8f0', borderRadius: 4, textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '2px 4px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(numCuadrillasMap[cargoId] || 1) > 1 && (
                          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 4 }}>
                            {Array.from({ length: numCuadrillasMap[cargoId] || 1 }).map((_, cuadIdx) => {
                              const isActive = (activeCuadTab[cargoId] || 0) === cuadIdx;
                              // Count assigned workers for this tab
                              const tabAssigned = rolesToShow.reduce((sum, role) => {
                                return sum + state.personalProyecto.filter(ap => ap.proyecto_id === selectedProjectId && ap.cargo_id === role.id && ap.unidad_pactada !== 'SUPERVISOR' && (ap.cuadrilla_idx === cuadIdx || (!ap.cuadrilla_idx && cuadIdx === 0))).length;
                              }, 0);
                              return (
                                <button
                                  key={cuadIdx}
                                  onClick={() => setActiveCuadTab(prev => ({ ...prev, [cargoId]: cuadIdx }))}
                                  style={{
                                    padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                    background: isActive ? '#fff' : 'transparent',
                                    color: isActive ? '#3b82f6' : '#64748b',
                                    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                                    marginBottom: '-2px', transition: 'all 0.2s',
                                  }}
                                >
                                  {cargo.nombre}-{cuadIdx + 1}
                                  {tabAssigned > 0 && <span style={{ marginLeft: 4, fontSize: 8, color: '#10b981' }}>✓{tabAssigned}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {(() => {
                          const cuadIdx = (numCuadrillasMap[cargoId] || 1) > 1 ? (activeCuadTab[cargoId] || 0) : 0;
                          return rolesToShow.map((role, idx) => {
                          const assigned = state.personalProyecto.filter(ap => ap.proyecto_id === selectedProjectId && ap.cargo_id === role.id && ap.unidad_pactada !== 'SUPERVISOR' && (ap.cuadrilla_idx === cuadIdx || (!ap.cuadrilla_idx && cuadIdx === 0)));
                          const aPersons = assigned.map(ap => ({ p: state.personal.find(pp => pp.id === ap.personal_id), aId: ap.id })).filter(a => a.p);
                          const candidates = state.personal.filter(p => (p.cargo_id === role.id || p.profesion === role.nombre) && !assigned.some(ap => ap.personal_id === p.id));
                          return (
                            <div key={`${role.id}-${idx}-${cuadIdx}`} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 12 }}>{role.nombre} {isCrew && <span style={{ color: '#94a3b8', fontWeight: 400 }}>×{role.cantidad}</span>}</span>
                                <span style={{ fontSize: 10, color: aPersons.length > 0 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{aPersons.length > 0 ? `✓ ${aPersons.length}` : 'Sin asignar'}</span>
                              </div>
                              {aPersons.map(({ p, aId }) => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                                    <span>✅</span>
                                    <span style={{ fontWeight: 500 }}>{p.nombres || p.nombre} {p.apellidos || ''}</span>
                                    <span style={{ color: '#94a3b8' }}>({p.email})</span>
                                  </div>
                                  <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: 10, padding: '2px 6px', minWidth: 'auto' }} onClick={() => { if (confirm(`¿Quitar a ${p.nombres || p.nombre}?`)) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: aId }); }} title="Quitar">✕</button>
                                </div>
                              ))}
                              {candidates.length > 0 ? (
                                <select className="form-select" style={{ fontSize: 11, padding: '4px 8px', marginTop: 4 }} defaultValue="" onChange={(e) => { const pid = e.target.value; if (!pid) return; const pr = state.personal.find(pp => pp.id === pid); if (!pr) return; dispatch({ type: 'ADD_PERSON_PROYECTO', payload: { id: crypto.randomUUID(), personal_id: pid, proyecto_id: selectedProjectId, cargo_id: role.id, unidades_asignadas: 1, salario_pactado: pr.salario_base || 0, unidad_pactada: pr.unidad_pago || 'Mes', tareas_asignadas: [], cuadrilla_idx: cuadIdx }}); e.target.value = ''; }}>
                                  <option value="">Asignar {role.nombre}...</option>
                                  {candidates.map(p => <option key={p.id} value={p.id}>{p.nombres || p.nombre} {p.apellidos || ''} — {p.email}</option>)}
                                </select>
                              ) : (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>No hay profesionales "{role.nombre}" disponibles</div>
                              )}
                            </div>
                          );
                        });
                        })()}
                      </div>

                      {/* --- NUEVO: Asignación de APUs por Instancia de Cuadrilla --- */}
                      <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: 12, paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📋 Tareas en {cargo.nombre}-{((numCuadrillasMap[cargoId] || 1) > 1 ? (activeCuadTab[cargoId] || 0) : 0) + 1}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(() => {
                            const currentCuadIdx = (numCuadrillasMap[cargoId] || 1) > 1 ? (activeCuadTab[cargoId] || 0) : 0;
                            const currentSignature = `${cargoId}:${currentCuadIdx}`;
                            const apusNeeded = projectNeeds[cargoId]?.items || []; // Asumiendo que projectNeeds tiene la lista de items

                            // Si no tenemos la lista de items en projectNeeds, la obtenemos dinámicamente
                            const relevantAPUs = state.presupuestoItems.filter(pi => {
                              if (pi.proyecto_id !== selectedProjectId) return false;
                              // El APU es relevante si este cargo está en sus detalles
                              const hasCargo = (apuId) => {
                                const ds = state.apuDetalles.filter(d => d.apu_id === apuId);
                                if (ds.some(d => d.cargo_id === cargoId)) return true;
                                return ds.some(d => d.apu_hijo_id && hasCargo(d.apu_hijo_id));
                              };
                              return hasCargo(pi.apu_id);
                            });

                            return relevantAPUs.map(item => {
                              const assignments = (item.asignado_a_cuadrilla || '').split(',').filter(Boolean);
                              const isHere = assignments.includes(currentSignature);
                              
                              // Contar cuántas veces está asignado a este grupo de cargos en total
                              const groupAssignments = assignments.filter(a => a.startsWith(`${cargoId}:`));
                              const totalInGroup = groupAssignments.length;
                              
                              let bgColor = '#f1f5f9'; // Gris (No asignado a ESTA cuadrilla)
                              let textColor = '#64748b';
                              let label = '⚪ Libre';
                              if (isHere) {
                                if (totalInGroup > 1) {
                                  bgColor = '#ffedd5'; textColor = '#d97706'; label = '🟠 Repetido';
                                } else {
                                  bgColor = '#dcfce7'; textColor = '#166534'; label = '🟢 Asignado';
                                }
                              } else if (totalInGroup > 0) {
                                // Ocupado en otra cuadrilla (Mismo tono que libre, solo cambia icono)
                                bgColor = '#f1f5f9'; textColor = '#64748b';
                                label = '🚫 Ocupada';
                              }

                              const toggleAssignment = () => {
                                let newAssignments = [...assignments];
                                if (isHere) {
                                  newAssignments = newAssignments.filter(a => a !== currentSignature);
                                } else {
                                  newAssignments.push(currentSignature);
                                }
                                dispatch({
                                  type: 'UPDATE_PRESUPUESTO_ITEM',
                                  payload: { id: item.id, asignado_a_cuadrilla: newAssignments.join(',') }
                                });
                              };

                              return (
                                <button
                                  key={item.id}
                                  onClick={toggleAssignment}
                                  title={item.descripcion || 'Tarea'}
                                  style={{
                                    padding: '4px 8px', borderRadius: 6, border: '1px solid transparent',
                                    background: bgColor, color: textColor, fontSize: 9, fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                    maxWidth: 120, overflow: 'hidden'
                                  }}
                                >
                                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                    {label} {item.descripcion?.slice(0, 15) || 'Ítem'}
                                  </div>
                                  <div style={{ fontSize: 7, opacity: 0.7 }}>{item.cantidad} {state.apus.find(a=>a.id===item.apu_id)?.unidad}</div>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: 12, paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 6 }}>🔑 Supervisor (Administración)</div>
                        {supPersons.map(({ person: p, aId }) => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}><span>🔑</span><span style={{ fontWeight: 500 }}>{p.nombres || p.nombre} {p.apellidos || ''}</span><span style={{ color: '#94a3b8' }}>({p.email})</span></div>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: 10, padding: '2px 6px', minWidth: 'auto' }} onClick={() => dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: aId })} title="Quitar">✕</button>
                          </div>
                        ))}
                        <select className="form-select" style={{ fontSize: 11, padding: '4px 8px', borderColor: '#c7d2fe' }} defaultValue="" onChange={(e) => { const pid = e.target.value; if (!pid) return; dispatch({ type: 'ADD_PERSON_PROYECTO', payload: { id: crypto.randomUUID(), personal_id: pid, proyecto_id: selectedProjectId, cargo_id: cargoId, unidades_asignadas: 0, salario_pactado: 0, unidad_pactada: 'SUPERVISOR', tareas_asignadas: [] }}); e.target.value = ''; }}>
                          <option value="">+ Asignar supervisor...</option>
                          {state.personal.filter(p => !supervisors.some(s => s.personal_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.nombres || p.nombre} {p.apellidos || ''} — {p.email}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="toolbar">
           <input className="form-input" style={{ width: 300 }} placeholder="Buscar por nombre o email..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Profesión</th>
                <th>Encargado / Supervisor</th>
                <th>Pago Base</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersonal.map(p => {
                const cargo = state.cargos.find(c => c.id === p.cargo_id);
                const supProjects = state.personalProyecto.filter(ap => ap.personal_id === p.id && ap.unidad_pactada === 'SUPERVISOR');
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.foto_url ? <img src={p.foto_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.nombres || p.nombre} {p.apellidos || ''}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.profesion || cargo?.nombre || '—'}</td>
                    <td>
                      {supProjects.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {supProjects.map(ap => {
                            const proy = state.proyectos.find(pr => pr.id === ap.proyecto_id);
                            return <span key={ap.id} style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>🔑 {proy?.nombre || '—'}</span>;
                          })}
                        </div>
                      ) : <span style={{ fontSize: 10, color: '#94a3b8' }}>—</span>}
                    </td>
                    <td>{formatCurrency(p.salario_base)} / {p.unidad_pago || 'Mes'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Perfil Profesional' : 'Asignar / Crear Trabajador'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 20, marginBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
                  <button type="button" onClick={()=>setActiveTab('person')} style={{ padding: '10px 4px', background: 'none', border: 'none', borderBottom: activeTab==='person'?'2px solid var(--color-primary)':'none', color: activeTab==='person'?'var(--color-primary)':'var(--color-text-tertiary)', fontWeight: 700, cursor: 'pointer' }}>Información Básica</button>
                  <button type="button" onClick={()=>setActiveTab('docs')} style={{ padding: '10px 4px', background: 'none', border: 'none', borderBottom: activeTab==='docs'?'2px solid var(--color-primary)':'none', color: activeTab==='docs'?'var(--color-primary)':'var(--color-text-tertiary)', fontWeight: 700, cursor: 'pointer' }}>Documentos y Fotos</button>
                </div>

                {activeTab === 'person' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email de Identidad *</label>
                      <input 
                        className="form-input" 
                        type="email" 
                        value={form.email} 
                        onChange={(e) => handleEmailChange(e.target.value)} 
                        required 
                        disabled={!!editingId} 
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nombres *</label>
                        <input className="form-input" value={form.nombres} onChange={(e)=>setForm({...form, nombres: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Apellidos *</label>
                        <input className="form-input" value={form.apellidos} onChange={(e)=>setForm({...form, apellidos: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Cédula Nº</label>
                        <input className="form-input" value={form.cedula || ''} onChange={(e)=>setForm({...form, cedula: e.target.value})} placeholder="Documento" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cargo (Base Salarial) *</label>
                        <select className="form-select" value={form.cargo_id || ''} onChange={(e) => {
                          const cid = e.target.value;
                          const cargo = state.cargos.find(c => c.id === cid);
                          if (cargo) {
                            const data = calcularDatosCargo(cid);
                            setForm({ 
                              ...form, 
                              cargo_id: cid, 
                              profesion: form.profesion || cargo.nombre, 
                              factor_smlv: String(cargo.factor_smlv || 1.0),
                              salario_base: String(Math.round(data.precioHora * (parseFloat(state.config.find(c => c.clave === 'HORAS_MES')?.valor) || 192))),
                              tareas_asignadas: selectedProjectId ? getCargoProjectItems(selectedProjectId, cid).map(t => t.id) : [] 
                            });
                          } else {
                            setForm({ ...form, cargo_id: cid });
                          }
                        }} required>
                          <option value="">Seleccionar Cargo...</option>
                          {['Oficina (Escritorio)', 'Campo (Móvil)', 'Mano de Obra Directa'].map(cat => {
                            const filtered = state.cargos.filter(c => c.categoria === cat);
                            if (filtered.length === 0) return null;
                            return (
                              <optgroup key={cat} label={cat}>
                                {filtered.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                              </optgroup>
                            );
                          })}
                          <option value="NEW">+ Otro Cargo... (Crear nuevo)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Rol de Aplicación (Permisos) *</label>
                      <select 
                        className="form-select" 
                        value={form.app_role} 
                        onChange={(e)=>setForm({...form, app_role: e.target.value})}
                        required
                      >
                        <option value="cuadrilla">📲 Cuadrilla / Mano de Obra</option>
                        <option value="admin">🔑 Administrador General</option>
                        <option value="bodega">📦 Bodega / Logística</option>
                        <option value="contabilidad">💰 Contabilidad / Finanzas</option>
                        <option value="operativo">🏗️ Campo (Residente/Diseñador)</option>
                      </select>
                    </div>

                    {editingId && (() => {
                      const supAssignments = state.personalProyecto.filter(ap => ap.personal_id === editingId && ap.unidad_pactada === 'SUPERVISOR');
                      if (supAssignments.length === 0) return null;
                      return (
                        <div className="form-group">
                          <label className="form-label">🔑 Encargado / Supervisor en:</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {supAssignments.map(ap => {
                              const proy = state.proyectos.find(p => p.id === ap.proyecto_id);
                              const cargo = state.cargos.find(c => c.id === ap.cargo_id);
                              return (
                                <div key={ap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: '#eef2ff', borderRadius: 6, border: '1px solid #c7d2fe', fontSize: 11 }}>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#6366f1' }}>🏗️ {proy?.nombre || '—'}</span>
                                    {cargo && <span style={{ color: '#64748b', marginLeft: 6 }}>({cargo.nombre})</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                        {form.cargo_id === 'NEW' && (
                          <div style={{ marginTop: 8 }}>
                            <input 
                              className="form-input" 
                              placeholder="Nombre de la nueva profesión..." 
                              value={newCargoName}
                              onChange={(e) => setNewCargoName(e.target.value)}
                              required
                            />
                            <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                              Se creará automáticamente en la base de datos con factor 1.0.
                            </p>
                          </div>
                        )}
                      {/* Cargo Proyecto heredado del bloque de arriba para evitar duplicidad */}
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Unidad</label>
                          <select className="form-select" value={form.unidad_pago} onChange={(e)=>setForm({...form, unidad_pago: e.target.value})}>
                            {UNIDADES_PAGO.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Factor (x SMLV)</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            step="0.1"
                            value={form.factor_smlv} 
                            onChange={(e) => {
                              const f = parseFloat(e.target.value) || 0;
                              const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
                              setForm({ ...form, factor_smlv: e.target.value, salario_base: String(Math.round(f * smlv)) });
                            }} 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Salario Pactado *</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            value={form.salario_base} 
                            onChange={(e) => {
                              const s = parseFloat(e.target.value) || 0;
                              const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
                              setForm({ ...form, salario_base: e.target.value, factor_smlv: (s / smlv).toFixed(2) });
                            }} 
                            required 
                          />
                        </div>
                      </div>
                      {possibleTasks.length > 0 && activeTab === 'person' && (
                        <div style={{ marginTop: 12 }}>
                          <label className="form-label">Tareas Asignadas ({form.tareas_asignadas.length})</label>
                          <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid #e2e8f0', padding: 8, borderRadius: 4, background: 'white' }}>
                            {possibleTasks.map(t => (
                              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                                <input type="checkbox" checked={form.tareas_asignadas.includes(t.id)} onChange={(e)=>{
                                  const checked = e.target.checked;
                                  setForm({ ...form, tareas_asignadas: checked ? [...form.tareas_asignadas, t.id] : form.tareas_asignadas.filter(id => id !== t.id) });
                                }} /> {t.descripcion || t.apu_nombre}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                  <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <label className="form-label">Foto de Perfil</label>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', margin: '10px auto', overflow: 'hidden' }}>
                        {form.foto_url ? <img src={form.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                      </div>
                      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>📸 Subir <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'foto_url')} accept="image/*" /></label>
                    </div>
                    <div className="stat-card" style={{ textAlign: 'center' }}>
                      <label className="form-label">Doc. Cédula</label>
                      <div style={{ height: 60, background: '#f8fafc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0' }}>
                         {form.cedula_url ? 'Imagen Cargada' : '📄'}
                      </div>
                      <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>📁 Subir <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'cedula_url')} accept="image/*" /></label>
                    </div>
                    <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Tarjeta Profesional</label>
                      <div style={{ display: 'flex', gap: 12 }}>
                         <input className="form-input" style={{ flex: 1 }} placeholder="Número TP" value={form.tp_numero || ''} onChange={(e)=>setForm({...form, tp_numero: e.target.value})} />
                         <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>{form.tp_url ? '✅' : '📁'} Subir Soporte <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'tp_url')} accept="image/*" /></label>
                      </div>
                    </div>
                    <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Certificaciones / ARL</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                         <input className="form-input" style={{ flex: 1 }} placeholder="N° ARL / EPS / Certificación" value={form.arl_numero || ''} onChange={(e)=>setForm({...form, arl_numero: e.target.value})} />
                         <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>{form.arl_url ? '✅' : '📁'} Subir <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'arl_url')} accept="image/*,application/pdf" /></label>
                      </div>
                    </div>
                    {isUploading && <div style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: 12, color: 'var(--color-primary)' }}>Cargando archivos...</div>}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>{editingId ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
