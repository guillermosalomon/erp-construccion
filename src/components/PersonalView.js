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
  telefono: '',
  whatsapp: '',
  telegram_id: '',
  profesion: '',
  tipo_documento: 'CC',
  cedula: '',
  ciudad: '',
  pais: 'Colombia',
  tp_numero: '',
  foto_url: '',
  cedula_url: '',
  tp_url: '',
  arl_numero: '',
  arl_url: '',
  portafolio_url: '',
  portafolio_nombre: '',
  hoja_vida_url: '',
  hoja_vida_nombre: '',
  diplomas_url: '',
  diplomas_nombre: '',
  cargo_id: '',
  app_role: 'cuadrilla',
  unidad_pago: 'Mes',
  salario_base: '',
  factor_smlv: '',
  tareas_asignadas: [], 
  posgrados: [],
  perfil_publico: false,
  disponible: true,
  plan: 'free',
};

export default function PersonalView() {
  const { user } = useAuth();
  const { state, dispatch, getProjectLaborNeeds, getCargoProjectItems, calcularDatosCargo } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [linkedClient, setLinkedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('person');
  const [manualProfession, setManualProfession] = useState('');
  const [isOtherCargo, setIsOtherCargo] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [numCuadrillasMap, setNumCuadrillasMap] = useState({});
  const [activeCuadTab, setActiveCuadTab] = useState({});
  
  // Posgrados form temp state
  const [newPosType, setNewPosType] = useState('Especialización');
  const [newPosName, setNewPosName] = useState('');

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

  const allProyectos = useMemo(() => {
    const proys = state.proyectos || [];
    const tiendas = (state.mkTiendas || []).map(t => ({ ...t, tipo: 'TIENDA' }));
    const pvs = (state.mkPuntosVenta || []).map(pv => ({ ...pv, tipo: 'PUNTO_VENTA', parent_id: pv.tienda_id }));
    return [...proys, ...tiendas, ...pvs];
  }, [state.proyectos, state.mkTiendas, state.mkPuntosVenta]);

  const filteredPersonal = useMemo(() => {
    if (selectedProjectId) {
      const assignedIds = state.personalProyecto
        .filter(ap => ap.proyecto_id === selectedProjectId || ap.tienda_id === selectedProjectId || ap.punto_venta_id === selectedProjectId)
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

  const openEdit = (person, assignment = null) => {
    setEditingId(person.id);
    const names = person.nombres || (person.nombre?.split(' ') || [])[0] || '';
    const lastNames = person.apellidos || (person.nombre?.split(' ') || []).slice(1).join(' ') || '';
    
    const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
    const factorCalc = person.salario_base ? (person.salario_base / smlv).toFixed(2) : '';

    setForm({
      ...emptyForm,
      ...person,
      email: person.email || '',
      nombres: names,
      apellidos: lastNames,
      profesion: person.profesion || '',
      salario_base: String(person.salario_base || 0),
      factor_smlv: factorCalc,
      unidad_pago: person.unidad_pago || 'Mes',
      app_role: (() => { 
        const NORM = { 'gerencia': 'admin', 'almacen': 'bodega', 'ing_residente': 'operativo', 'arq_residente': 'operativo', 'practicante': 'operativo', 'interventor': 'operativo' }; 
        const r = (person.app_role || '').toLowerCase(); 
        return NORM[r] || r || 'cuadrilla'; 
      })(),
      arl_numero: person.arl_numero || '',
      arl_url: person.arl_url || '',
      posgrados: Array.isArray(person.posgrados) ? person.posgrados : [],
      tareas_asignadas: assignment?.tareas_asignadas || [],
      current_equipo: assignment?.equipo_padre_id ? state.cargos.find(c => c.id === assignment.equipo_padre_id)?.nombre : null
    });

    setIsOtherCargo(false);
    setNewCargoName('');
    setActiveTab('person');
    setShowModal(true);
  };

  const handleEmailChange = async (email) => {
    try {
      setForm(f => ({ ...f, email }));
      if (email && email.includes('@') && email.length > 5) {
        // 1. Buscar en Personal (local state)
        if (state.personal) {
          const match = state.personal.find(p => p.email?.toLowerCase() === email.toLowerCase());
          if (match) {
            const names = match.nombres || (match.nombre?.split(' ') || [])[0] || '';
            const lastNames = match.apellidos || (match.nombre?.split(' ') || []).slice(1).join(' ') || '';
            const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
            const factorCalc = match.salario_base ? (match.salario_base / smlv).toFixed(2) : '';

            setForm(f => ({
              ...f,
              ...match,
              email,
              nombres: names,
              apellidos: lastNames,
              salario_base: String(match.salario_base || ''),
              factor_smlv: factorCalc,
              posgrados: Array.isArray(match.posgrados) ? match.posgrados : []
            }));
          }
        }

        // 2. Buscar en Clientes (CRM) para auto-completar/vincular
        const { data: crmMatch } = await supabase.from('clientes')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (crmMatch) {
          setLinkedClient(crmMatch);
          // Si no encontramos match en personal, sugerimos usar el del CRM
          const localMatch = state.personal?.find(p => p.email?.toLowerCase() === email.toLowerCase());
          if (!localMatch && confirm(`¿Autocompletar datos desde el cliente CRM "${crmMatch.nombre}"?`)) {
            const parts = (crmMatch.nombre || '').split(' ');
            setForm(f => ({
              ...f,
              nombres: parts[0] || '',
              apellidos: parts.slice(1).join(' ') || '',
              telefono: crmMatch.telefono || f.telefono,
              whatsapp: crmMatch.whatsapp || f.whatsapp,
              telegram_id: crmMatch.telegram_id || f.telegram_id,
              ciudad: crmMatch.ciudad || f.ciudad,
            }));
          }
        } else {
          setLinkedClient(null);
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

  const handleAddPosgrado = () => {
    if (!newPosName) return;
    setForm(f => ({
      ...f,
      posgrados: [...(f.posgrados || []), { type: newPosType, name: newPosName }]
    }));
    setNewPosName('');
  };

  const handleRemovePosgrado = (index) => {
    setForm(f => ({
      ...f,
      posgrados: f.posgrados.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalCargoId = form.cargo_id;
    if (finalCargoId === 'NEW' && newCargoName) {
      const newCargo = {
        id: crypto.randomUUID(),
        nombre: newCargoName,
        categoria: 'Mano de Obra Directa',
        factor_smlv: 1.0,
        unidad: 'Mes'
      };
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
            <optgroup label="Proyectos de Construcción">
              {allProyectos.filter(p => p.tipo !== 'TIENDA' && p.tipo !== 'PUNTO_VENTA').map(pr => <option key={pr.id} value={pr.id}>🏗️ {pr.nombre}</option>)}
            </optgroup>
            <optgroup label="Comercios y Marketplace">
              {allProyectos.filter(p => p.tipo === 'TIENDA').map(pr => <option key={pr.id} value={pr.id}>🏪 {pr.nombre} (Tienda)</option>)}
              {allProyectos.filter(p => p.tipo === 'PUNTO_VENTA').map(pr => <option key={pr.id} value={pr.id}>📍 {pr.nombre} (Punto de Venta)</option>)}
            </optgroup>
          </select>
          <button className="btn btn-primary" onClick={() => openCreate()}>
            + Nuevo Perfil
          </button>
        </div>
      </div>

      <div className="page-body">
        {(() => {
          if (selectedProjectId) {
            const project = allProyectos.find(p => p.id === selectedProjectId);
            const isTienda = project?.tipo === 'TIENDA';
            const isPuntoVenta = project?.tipo === 'PUNTO_VENTA';
            const puntosVentaDeTienda = allProyectos.filter(p => p.parent_id === selectedProjectId && p.tipo === 'PUNTO_VENTA');

            if (isTienda || isPuntoVenta) {
              return (
                <section style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3>🏪 Personal de Comercio</h3>
                    <div className="badge badge-primary">{isTienda ? 'Sede Principal' : 'Punto de Venta'}</div>
                  </div>
                  
                  <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--color-primary)' }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🛡️ Administradores y Gerencia</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {state.personalProyecto
                          .filter(ap => (isTienda ? ap.tienda_id === selectedProjectId : ap.punto_venta_id === selectedProjectId) && ap.unidad_pactada === 'ADMIN_COMERCIO')
                          .map(ap => {
                            const p = state.personal.find(pers => pers.id === ap.personal_id);
                            if (!p) return null;
                            return (
                              <div key={ap.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '6px 12px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🔑</div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{p.nombre}</span>
                                <button 
                                  className="btn btn-ghost btn-sm" style={{ padding: 0, minWidth: 'auto', color: '#ef4444', marginLeft: 4 }}
                                  onClick={() => { if(confirm('¿Quitar administrador?')) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: ap.id }); }}
                                >✕</button>
                              </div>
                            );
                          })}
                        <select 
                          className="form-select" style={{ width: 'auto', minWidth: 160, fontSize: 11, height: 28, padding: '0 8px' }} defaultValue=""
                          onChange={(e) => {
                            const pid = e.target.value;
                            if (!pid) return;
                            dispatch({ 
                              type: 'ADD_PERSON_PROYECTO', 
                              payload: { 
                                id: crypto.randomUUID(), personal_id: pid, 
                                tienda_id: isTienda ? selectedProjectId : null, 
                                punto_venta_id: isPuntoVenta ? selectedProjectId : null,
                                cargo_id: null, unidades_asignadas: 0, salario_pactado: 0, 
                                unidad_pactada: 'ADMIN_COMERCIO', tareas_asignadas: [] 
                              }
                            });
                            e.target.value = '';
                          }}
                        >
                          <option value="">+ Añadir Administrador...</option>
                          {state.personal
                            .filter(p => !state.personalProyecto.some(ap => (isTienda ? ap.tienda_id === selectedProjectId : ap.punto_venta_id === selectedProjectId) && ap.personal_id === p.id && ap.unidad_pactada === 'ADMIN_COMERCIO'))
                            .map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.email})</option>)
                          }
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Si es Tienda, mostrar sus Puntos de Venta como si fueran cuadrillas */}
                  {isTienda && puntosVentaDeTienda.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                      {puntosVentaDeTienda.map(pv => {
                        const vendedores = state.personalProyecto.filter(ap => ap.punto_venta_id === pv.id && ap.unidad_pactada === 'VENDEDOR');
                        return (
                          <div key={pv.id} className="card" style={{ borderLeft: '4px solid #10b981' }}>
                            <div style={{ padding: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>📍 {pv.nombre}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>Punto de Venta</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* --- Supervisores del PV --- */}
                                {state.personalProyecto.filter(ap => ap.punto_venta_id === pv.id && ap.unidad_pactada === 'SUPERVISOR').map(ap => {
                                  const p = state.personal.find(pers => pers.id === ap.personal_id);
                                  if (!p) return null;
                                  return (
                                    <div key={ap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309' }}>{p.nombre} (Supervisor)</div>
                                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.email}</div>
                                        </div>
                                      </div>
                                      <button 
                                        className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '2px 4px', fontSize: 10 }}
                                        onClick={() => { if(confirm('¿Quitar supervisor?')) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: ap.id }); }}
                                      >✕</button>
                                    </div>
                                  );
                                })}
                                <div style={{ marginTop: 2 }}>
                                  <select 
                                    className="form-select" style={{ fontSize: 11, padding: '4px 8px', height: 28, borderColor: '#fde68a', background: '#fffbeb' }} defaultValue=""
                                    onChange={(e) => {
                                      const pid = e.target.value;
                                      if (!pid) return;
                                      // Validar que no esté ya asignado a OTRO punto de venta
                                      const yaAsignado = state.personalProyecto.find(ap => ap.punto_venta_id && String(ap.personal_id) === String(pid));
                                      if (yaAsignado) {
                                        alert('Esta persona ya está asignada a otro Punto de Venta física.');
                                        e.target.value = '';
                                        return;
                                      }
                                      dispatch({ 
                                        type: 'ADD_PERSON_PROYECTO', 
                                        payload: { 
                                          id: crypto.randomUUID(), personal_id: pid, 
                                          tienda_id: selectedProjectId, punto_venta_id: pv.id,
                                          cargo_id: null, unidades_asignadas: 0, salario_pactado: 0, 
                                          unidad_pactada: 'SUPERVISOR', tareas_asignadas: [] 
                                        }
                                      });
                                      e.target.value = '';
                                    }}
                                  >
                                    <option value="">+ Asignar Supervisor...</option>
                                    {state.personal
                                      .filter(p => !state.personalProyecto.some(ap => ap.punto_venta_id === pv.id && ap.unidad_pactada === 'SUPERVISOR' && ap.personal_id === p.id))
                                      .map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)
                                    }
                                  </select>
                                </div>
                                <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />

                                {/* --- Vendedores --- */}
                                {vendedores.map(ap => {
                                  const p = state.personal.find(pers => pers.id === ap.personal_id);
                                  if (!p) return null;
                                  return (
                                    <div key={ap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{p.nombre}</div>
                                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.email}</div>
                                        </div>
                                      </div>
                                      <button 
                                        className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '2px 4px', fontSize: 10 }}
                                        onClick={() => { if(confirm('¿Quitar vendedor?')) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: ap.id }); }}
                                      >✕</button>
                                    </div>
                                  );
                                })}
                                
                                <div style={{ marginTop: 8 }}>
                                  <select 
                                    className="form-select" style={{ fontSize: 11, padding: '4px 8px', height: 28 }} defaultValue=""
                                    onChange={(e) => {
                                      const pid = e.target.value;
                                      if (!pid) return;
                                      // Validar que no esté ya asignado a OTRO punto de venta
                                      const yaAsignado = state.personalProyecto.find(ap => ap.punto_venta_id && String(ap.personal_id) === String(pid));
                                      if (yaAsignado) {
                                        alert('Esta persona ya está asignada a otro Punto de Venta física.');
                                        e.target.value = '';
                                        return;
                                      }
                                      dispatch({ 
                                        type: 'ADD_PERSON_PROYECTO', 
                                        payload: { 
                                          id: crypto.randomUUID(), personal_id: pid, 
                                          tienda_id: selectedProjectId, punto_venta_id: pv.id,
                                          cargo_id: null, unidades_asignadas: 0, salario_pactado: 0, 
                                          unidad_pactada: 'VENDEDOR', tareas_asignadas: [] 
                                        }
                                      });
                                      e.target.value = '';
                                    }}
                                  >
                                    <option value="">+ Asignar Vendedor...</option>
                                    {state.personal
                                      .filter(p => !vendedores.some(ap => ap.personal_id === p.id))
                                      .map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)
                                    }
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Si seleccionó un Punto de Venta específico, mostrarlo directamente */}
                  {isPuntoVenta && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                      <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>👥 Vendedores</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Personal de atención al cliente</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {state.personalProyecto
                              .filter(ap => ap.punto_venta_id === selectedProjectId && ap.unidad_pactada === 'VENDEDOR')
                              .map(ap => {
                                const p = state.personal.find(pers => pers.id === ap.personal_id);
                                if (!p) return null;
                                return (
                                  <div key={ap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{p.nombre}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.email}</div>
                                      </div>
                                    </div>
                                    <button 
                                      className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '2px 4px', fontSize: 10 }}
                                      onClick={() => { if(confirm('¿Quitar vendedor?')) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: ap.id }); }}
                                    >✕</button>
                                  </div>
                                );
                              })}
                            <div style={{ marginTop: 8 }}>
                              <select 
                                className="form-select" style={{ fontSize: 11, padding: '4px 8px', height: 28 }} defaultValue=""
                                onChange={(e) => {
                                  const pid = e.target.value;
                                  if (!pid) return;
                                  dispatch({ 
                                    type: 'ADD_PERSON_PROYECTO', 
                                    payload: { 
                                      id: crypto.randomUUID(), personal_id: pid, 
                                      punto_venta_id: selectedProjectId,
                                      cargo_id: null, unidades_asignadas: 0, salario_pactado: 0, 
                                      unidad_pactada: 'VENDEDOR', tareas_asignadas: [] 
                                    }
                                  });
                                  e.target.value = '';
                                }}
                              >
                                <option value="">+ Asignar Vendedor...</option>
                                {state.personal
                                  .filter(p => !state.personalProyecto.some(ap => ap.punto_venta_id === selectedProjectId && ap.personal_id === p.id && ap.unidad_pactada === 'VENDEDOR'))
                                  .map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)
                                }
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            }
            
            return (
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

                          <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: 12, paddingTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              📋 Tareas en {cargo.nombre}-{((numCuadrillasMap[cargoId] || 1) > 1 ? (activeCuadTab[cargoId] || 0) : 0) + 1}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {(() => {
                                const currentCuadIdx = (numCuadrillasMap[cargoId] || 1) > 1 ? (activeCuadTab[cargoId] || 0) : 0;
                                const currentSignature = `${cargoId}:${currentCuadIdx}`;
                                const relevantAPUs = state.presupuestoItems.filter(pi => {
                                  if (pi.proyecto_id !== selectedProjectId) return false;
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
                                  const groupAssignments = assignments.filter(a => a.startsWith(`${cargoId}:`));
                                  const totalInGroup = groupAssignments.length;
                                  let bgColor = '#f1f5f9'; let textColor = '#64748b'; let label = '⚪ Libre';
                                  if (isHere) {
                                    if (totalInGroup > 1) { bgColor = '#ffedd5'; textColor = '#d97706'; label = '🟠 Repetido'; } 
                                    else { bgColor = '#dcfce7'; textColor = '#166534'; label = '🟢 Asignado'; }
                                  } else if (totalInGroup > 0) { bgColor = '#f1f5f9'; textColor = '#64748b'; label = '🚫 Ocupada'; }

                                  const toggleAssignment = () => {
                                    let newAssignments = [...assignments];
                                    if (isHere) newAssignments = newAssignments.filter(a => a !== currentSignature);
                                    else newAssignments.push(currentSignature);
                                    dispatch({ type: 'UPDATE_PRESUPUESTO_ITEM', payload: { id: item.id, asignado_a_cuadrilla: newAssignments.join(',') } });
                                  };

                                  return (
                                    <button key={item.id} onClick={toggleAssignment} title={item.descripcion || 'Tarea'} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid transparent', background: bgColor, color: textColor, fontSize: 9, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 120, overflow: 'hidden' }}>
                                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{label} {item.descripcion?.slice(0, 15) || 'Ítem'}</div>
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
            );
          }
          
          return null;
        })()}

        <div className="toolbar">
           <input className="form-input" style={{ width: 300 }} placeholder="Buscar por nombre o email..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Profesión</th>
                {selectedProjectId && <th>Equipo</th>}
                {selectedProjectId && <th>Cuadrilla</th>}
                <th>Encargado / Supervisor</th>
                {selectedProjectId && <th>Tareas</th>}
                <th>Pago Base</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {selectedProjectId ? (
                // === MODO PROYECTO: Mostrar asignaciones de personalProyecto ===
                state.personalProyecto
                  .filter(ap => ap.proyecto_id === selectedProjectId || ap.tienda_id === selectedProjectId || ap.punto_venta_id === selectedProjectId)
                  .map((ap, idx) => {
                    const p = state.personal.find(pers => pers.id === ap.personal_id);
                    if (!p) return null;
                    const c = state.cargos.find(cargo => cargo.id === ap.cargo_id);
                    const parentCargo = ap.equipo_padre_id ? state.cargos.find(cargo => cargo.id === ap.equipo_padre_id) : null;
                    const supervisors = state.personalProyecto.filter(asig => 
                      (asig.proyecto_id === selectedProjectId || asig.tienda_id === selectedProjectId || asig.punto_venta_id === selectedProjectId) && 
                      asig.cargo_id === (ap.equipo_padre_id || ap.cargo_id) && 
                      asig.unidad_pactada === 'SUPERVISOR'
                    );

                    return (
                      <tr key={`${ap.id}-${idx}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {p.foto_url ? <img src={p.foto_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.nombres || p.nombre} {p.apellidos || ''}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                {p.email} {p.plataforma === 'telegram' ? ' • 📱 Telegram' : ''}
                                {p.creado_por ? ` • 👤 ${p.creado_por.split('@')[0]}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{c?.nombre || p.profesion || '—'}</td>
                        <td style={{ color: '#3b82f6', fontWeight: 600 }}>{parentCargo?.nombre || '—'}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>Cuadrilla {(ap.cuadrilla_idx || 0) + 1}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {supervisors.map((s, sIdx) => {
                              const sp = state.personal.find(pers => pers.id === s.personal_id);
                              return <span key={`${s.id}-${sIdx}`} style={{ fontSize: 10, color: '#6366f1' }}>🔑 {sp?.nombre || 'Supervisor'}</span>;
                            })}
                            {supervisors.length === 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>—</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                            {(() => {
                              const taskIds = Array.isArray(ap.tareas_asignadas) ? ap.tareas_asignadas : [];
                              if (taskIds.length === 0) return <span style={{ fontSize: 10, color: '#94a3b8' }}>Sin tareas</span>;
                              return taskIds.map((tid, tIdx) => {
                                const item = state.presupuestoItems.find(it => String(it.id) === String(tid));
                                return (
                                  <span key={`${tid}-${tIdx}`} style={{ fontSize: 9, padding: '2px 6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#475569' }}>
                                    • {item?.descripcion || 'Tarea'}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </td>
                        <td>{formatCurrency(ap.salario_pactado || p.salario_base)} / {ap.unidad_pactada || p.unidad_pago || 'Mes'}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p, ap)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { if(confirm('¿Eliminar esta asignación?')) dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: ap.id }); }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                // === MODO GLOBAL: Mostrar todos los trabajadores de la base de datos ===
                filteredPersonal.map(p => {
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
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              {p.email} {p.plataforma === 'telegram' ? ' • 📱 Telegram' : ''}
                              {p.creado_por ? ` • 👤 ${p.creado_por.split('@')[0]}` : ''}
                            </div>
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
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => { if (confirm('¿Eliminar trabajador GLOBALMENTE?')) dispatch({ type: 'DELETE_PERSON', payload: p.id }); }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
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
                      <input className="form-input" type="email" value={form.email || ''} onChange={(e) => handleEmailChange(e.target.value)} required disabled={!!editingId} placeholder="ejemplo@correo.com" />
                      
                      {linkedClient && (
                        <div style={{ marginTop:8, padding:'6px 12px', background:'#fff7ed', borderRadius:8, border:'1px solid #fed7aa', display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:14 }}>👤</span>
                          <div style={{ fontSize:10 }}>
                            <div style={{ fontWeight:700, color:'#9a3412' }}>Vínculo CRM Activo</div>
                            <div style={{ color:'#c2410c' }}>Cliente: {linkedClient.nombre} ({linkedClient.estado})</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nombres *</label>
                        <input className="form-input" value={form.nombres || ''} onChange={(e)=>setForm({...form, nombres: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Apellidos *</label>
                        <input className="form-input" value={form.apellidos || ''} onChange={(e)=>setForm({...form, apellidos: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Profesión</label>
                        <input className="form-input" value={form.profesion || ''} onChange={(e)=>setForm({...form, profesion: e.target.value})} placeholder="Ej: Ingeniero Civil, Maestro..." list="profesion-options" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Documento de Identidad</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select className="form-select" style={{ width: 90, fontSize: 11 }} value={form.tipo_documento || 'CC'} onChange={(e)=>setForm({...form, tipo_documento: e.target.value})}>
                            <option value="CC">🇨🇴 CC</option><option value="CE">🌐 CE</option><option value="PP">✈️ PP</option>
                          </select>
                          <input className="form-input" style={{ flex: 1 }} value={form.cedula || ''} onChange={(e)=>setForm({...form, cedula: e.target.value})} placeholder={form.tipo_documento === 'PP' ? 'Nº Pasaporte' : 'Nº Cédula'} />
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Ciudad</label>
                        <input className="form-input" value={form.ciudad || ''} onChange={(e)=>setForm({...form, ciudad: e.target.value})} placeholder="Ej: Bogotá..." list="ciudad-options" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">País</label>
                        <select className="form-select" value={form.pais || 'Colombia'} onChange={(e)=>setForm({...form, pais: e.target.value})}><option value="Colombia">🇨🇴 Colombia</option><option value="Otro">🌍 Otro</option></select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">📱 Teléfono</label>
                        <input className="form-input" value={form.telefono || ''} onChange={(e)=>setForm({...form, telefono: e.target.value})} placeholder="+57 300 123 4567" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">💬 WhatsApp</label>
                        <input className="form-input" value={form.whatsapp || ''} onChange={(e)=>setForm({...form, whatsapp: e.target.value})} placeholder="+57 300 123 4567" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">✈️ Telegram ID</label>
                        <input className="form-input" value={form.telegram_id || ''} onChange={(e)=>setForm({...form, telegram_id: e.target.value})} placeholder="@username o ID numérico" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cargo (Base Salarial) *</label>
                      <select className="form-select" value={form.cargo_id || ''} onChange={(e) => {
                        const cid = e.target.value;
                        const cargo = state.cargos.find(c => c.id === cid);
                        if (cargo) {
                          const data = calcularDatosCargo(cid);
                          setForm({ ...form, cargo_id: cid, profesion: form.profesion || cargo.nombre, factor_smlv: String(cargo.factor_smlv || 1.0), salario_base: String(Math.round(data.precioHora * h_mes)), tareas_asignadas: selectedProjectId ? getCargoProjectItems(selectedProjectId, cid).map(t => t.id) : [] });
                        } else setForm({ ...form, cargo_id: cid });
                      }} required>
                        <option value="">Seleccionar Cargo...</option>
                        {['Oficina (Escritorio)', 'Campo (Móvil)', 'Mano de Obra Directa', 'Comercio (Ventas)'].map(cat => {
                          const filtered = state.cargos.filter(c => c.categoria === cat);
                          if (filtered.length === 0) return null;
                          return <optgroup key={cat} label={cat}>{filtered.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>;
                        })}
                        <option value="NEW">+ Otro Cargo...</option>
                      </select>
                    </div>

                    <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label className="form-label">🎓 Posgrados y Estudios Adicionales</label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select className="form-select" style={{ width: 150, fontSize: 11 }} value={newPosType} onChange={(e) => setNewPosType(e.target.value)}><option value="Especialización">Especialización</option><option value="Maestría">Maestría</option><option value="Certificación">Certificación</option></select>
                        <input className="form-input" style={{ flex: 1, fontSize: 11 }} placeholder="Nombre del estudio..." value={newPosName} onChange={(e) => setNewPosName(e.target.value)} />
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddPosgrado}>+ Agregar</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(form.posgrados || []).map((pos, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 20, fontSize: 10 }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{pos.type}:</span><span>{pos.name}</span><button type="button" onClick={() => handleRemovePosgrado(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">Rol de Aplicación (Permisos) *</label>
                      <select className="form-select" value={form.app_role} onChange={(e)=>setForm({...form, app_role: e.target.value})} required><option value="cuadrilla">📲 Cuadrilla</option><option value="admin">🔑 Admin</option><option value="bodega">📦 Bodega</option><option value="tienda">🛒 Tienda</option><option value="operativo">🏗️ Campo</option><option value="cliente">👁️ Cliente</option></select>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Unidad</label><select className="form-select" value={form.unidad_pago} onChange={(e)=>setForm({...form, unidad_pago: e.target.value})}>{UNIDADES_PAGO.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Factor (x SMLV)</label><input className="form-input" type="number" step="0.1" value={form.factor_smlv || ''} onChange={(e) => { const f = parseFloat(e.target.value) || 0; const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000; setForm({ ...form, factor_smlv: e.target.value, salario_base: String(Math.round(f * smlv)) }); }} /></div>
                      <div className="form-group"><label className="form-label">Salario Pactado *</label><input className="form-input" type="number" value={form.salario_base || ''} onChange={(e) => { const s = parseFloat(e.target.value) || 0; const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000; setForm({ ...form, salario_base: e.target.value, factor_smlv: (s / smlv).toFixed(2) }); }} required /></div>
                    </div>
                  </>
                ) : (
                  <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="stat-card" style={{ textAlign: 'center' }}><label className="form-label">Foto</label><div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', margin: '10px auto', overflow: 'hidden' }}>{form.foto_url ? <img src={form.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}</div><label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>📸 Subir <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'foto_url')} accept="image/*" /></label></div>
                    <div className="stat-card" style={{ textAlign: 'center' }}><label className="form-label">Documento</label><div style={{ height: 50, background: '#f8fafc', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0', border: form.cedula_url ? '2px solid #10b981' : '1px dashed #cbd5e1' }}>{form.cedula_url ? '✅ Cargado' : '📄'}</div><label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>📁 Subir <input type="file" hidden onChange={(e)=>handleFileUpload(e, 'cedula_url')} accept="image/*,application/pdf" /></label></div>
                    <div className="stat-card" style={{ gridColumn: 'span 2' }}><label className="form-label">Portafolio (PDF)</label>{form.portafolio_url ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'white', borderRadius: 8, border: '1px solid #bfdbfe' }}><span style={{ flex: 1, fontSize: 11 }}>{form.portafolio_nombre || 'Archivo'}</span><a href={form.portafolio_url} target="_blank" className="btn btn-ghost btn-sm">👁️</a><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({...form, portafolio_url: '', portafolio_nombre: ''})}>✕</button></div> : <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer' }}><span style={{ fontSize: 11 }}>📎 Seleccionar PDF</span><input type="file" hidden accept="application/pdf" onChange={(e) => { if (e.target.files[0]) { const fn = e.target.files[0].name; handleFileUpload(e, 'portafolio_url'); setForm(prev => ({...prev, portafolio_nombre: fn})); }}} /></label>}</div>
                    <div className="stat-card" style={{ gridColumn: 'span 2' }}><label className="form-label">Hoja de Vida (PDF)</label>{form.hoja_vida_url ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'white', borderRadius: 8, border: '1px solid #bbf7d0' }}><span style={{ flex: 1, fontSize: 11 }}>{form.hoja_vida_nombre || 'CV'}</span><a href={form.hoja_vida_url} target="_blank" className="btn btn-ghost btn-sm">👁️</a><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({...form, hoja_vida_url: '', hoja_vida_nombre: ''})}>✕</button></div> : <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer' }}><span style={{ fontSize: 11 }}>📎 Seleccionar PDF</span><input type="file" hidden accept="application/pdf" onChange={(e) => { if (e.target.files[0]) { const fn = e.target.files[0].name; handleFileUpload(e, 'hoja_vida_url'); setForm(prev => ({...prev, hoja_vida_nombre: fn})); }}} /></label>}</div>
                    <div className="stat-card" style={{ gridColumn: 'span 2' }}><label className="form-label">Diplomas</label>{form.diplomas_url ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'white', borderRadius: 8, border: '1px solid #fde68a' }}><span style={{ flex: 1, fontSize: 11 }}>{form.diplomas_nombre || 'Diplomas'}</span><a href={form.diplomas_url} target="_blank" className="btn btn-ghost btn-sm">👁️</a><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({...form, diplomas_url: '', diplomas_nombre: ''})}>✕</button></div> : <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer' }}><span style={{ fontSize: 11 }}>📎 Seleccionar PDF</span><input type="file" hidden accept="application/pdf,image/*" onChange={(e) => { if (e.target.files[0]) { const fn = e.target.files[0].name; handleFileUpload(e, 'diplomas_url'); setForm(prev => ({...prev, diplomas_nombre: fn})); }}} /></label>}</div>
                  </div>
                )}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isUploading}>{editingId ? 'Actualizar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
      <datalist id="profesion-options"><option value="Ingeniero Civil" /><option value="Arquitecto" /><option value="Maestro de Obra" /></datalist>
    </>
  );
}
