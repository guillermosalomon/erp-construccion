'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/lib/auth';
import { storageService, obraAvancesService, asistenciaService } from '@/lib/services';
import { useZxing } from 'react-zxing';

// ─── Componente Lector de Códigos de Barras Nativo ───
const BarcodeScanner = ({ onResult, onCancel }) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
    onError(err) {
      console.log('Scanner error:', err);
    }
  });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'black', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Enfoca el código</h3>
        <button onClick={onCancel} style={{ background: 'none', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: 8 }}>❌ Cerrar</button>
      </div>
      <video ref={ref} style={{ width: '100%', flex: 1, objectFit: 'cover' }} />
      <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#1e293b' }}>
        Apunta la cámara al código de barras o QR impreso en el material.
      </div>
    </div>
  );
};

export default function CuadrillaPortalView() {
  const { user, logout } = useAuth();
  const { state, dispatch, calcularCostoMO } = useStore();
  
  // Tabs for Cuadrilla
  const [activeTab, setActiveTab] = useState('tareas'); // 'tareas' | 'bodega'
  
  // Almacen States
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [showInoutModal, setShowInoutModal] = useState(false);
  const [inoutType, setInoutType] = useState('ENTRADA');
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [qty, setQty] = useState('');
  const [motivo, setMotivo] = useState('');
  const [distribuidor, setDistribuidor] = useState('');
  const [costoReal, setCostoReal] = useState('');
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [insumoSearch, setInsumoSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState('info');
  const [tasksProjectId, setTasksProjectId] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [profileEditing, setProfileEditing] = useState(null); 
  const [globalScope, setGlobalScope] = useState('RESUMEN');
  const [itemActiveScopes, setItemActiveScopes] = useState({}); 
  const [hoverCobrar, setHoverCobrar] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState({});  // { [itemId]: true/false }
  const [collapsedSub, setCollapsedSub] = useState({});     // { [itemId_section]: true/false }

  // Asistencia con Foto
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [asistenciaType, setAsistenciaType] = useState('LLEGADA');
  const [asistenciaItemId, setAsistenciaItemId] = useState('');
  const [asistenciaComment, setAsistenciaComment] = useState('');
  const [asistenciaFile, setAsistenciaFile] = useState(null);
  const [isUploadingAsistencia, setIsUploadingAsistencia] = useState(false);
  const [asistenciaScope, setAsistenciaScope] = useState('RESUMEN');
  
  // Reportar Avances con Evidencia
  const [showAvanceModal, setShowAvanceModal] = useState(false);
  const [avanceQty, setAvanceQty] = useState('');
  const [avanceComment, setAvanceComment] = useState('');
  const [avanceFile, setAvanceFile] = useState(null);
  const [isUploadingAvance, setIsUploadingAvance] = useState(false);
  const [avanceItemId, setAvanceItemId] = useState('');
  const [avanceScope, setAvanceScope] = useState('RESUMEN');
  const [avanceTotalQty, setAvanceTotalQty] = useState(0);
  const [avanceCurrentProg, setAvanceCurrentProg] = useState(0);
  const [avanceUnit, setAvanceUnit] = useState('');

  // Supervisión Detallada
  const [supervisionItem, setSupervisionItem] = useState(null);
  const [supervisionTab, setSupervisionTab] = useState('general');
  const [supervisionScope, setSupervisionScope] = useState('RESUMEN');

  // Autocompletado de Menciones (@Cargo)
  const [showSuggestions, setShowSuggestions] = useState(null); // { itemId, cursorX, cursorY, text }
  const [suggestions, setSuggestions] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Estados de Hilos y Reportes Técnicos
  const [replyingTo, setReplyingTo] = useState(null); // ID del evento al que se responde
  const [replyText, setReplyText] = useState('');
  const [showTechnicalReportModal, setShowTechnicalReportModal] = useState(false);
  const [reportingItem, setReportingItem] = useState(null);
  const [technicalReportFile, setTechnicalReportFile] = useState(null);
  const [technicalReportComment, setTechnicalReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [technicalReportPct, setTechnicalReportPct] = useState(0);

  const myProfile = state.personal.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase());
  const cuadrillaId = myProfile?.id || user?.id;
  
  const APP_ROLE_LABELS = {
    'cuadrilla': '📲 Cuadrilla',
    'admin': '🔑 Administrador',
    'bodega': '📦 Almacén',
    'contabilidad': '💰 Contabilidad',
    'operativo': '🏗️ Operativo'
  };
  
  const ApuSpecs = ({ apu, item }) => {
    const specText = item?.descripcion || apu?.descripcion;
    if (!specText) return null;
    return (
      <div style={{ padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -5, right: -5, fontSize: 40, opacity: 0.05, transform: 'rotate(15deg)' }}>📐</div>
        <h4 style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ficha Técnica / Especificación</h4>
        <div style={{ fontSize: 11, color: '#1e3a8a', lineHeight: 1.5, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{specText}</div>
        {item?.descripcion && apu?.descripcion && item.descripcion !== apu.descripcion && (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #bfdbfe' }}>
            <strong>Nota base APU:</strong> {apu.descripcion}
          </div>
        )}
      </div>
    );
  };
  // Normalizar roles legacy de BD a los nuevos
  const ROLE_NORMALIZE = { 'gerencia': 'admin', 'almacen': 'bodega', 'ing_residente': 'operativo', 'arq_residente': 'operativo', 'practicante': 'operativo', 'interventor': 'operativo' };
  const getAppRole = (raw) => { const r = (raw || '').toLowerCase(); return ROLE_NORMALIZE[r] || r; };
  const normalizedRole = getAppRole(myProfile?.app_role);
  const myRoleStr = useMemo(() => {
    if (myProfile?.app_role) return APP_ROLE_LABELS[normalizedRole] || myProfile.app_role;
    return '';
  }, [myProfile, normalizedRole]);

  const currentBodega = state.bodegas.find(b => b.proyecto_id === selectedProyectoId);

  // ─── DEFINICIÓN DE ITEMS (Necesaria para progressMap) ───
  const misItems = useMemo(() => {
    if (!myProfile || normalizedRole === 'bodega') return [];
    
    const myAssignmentsSource = state.personalProyecto.filter(ap => ap.personal_id === myProfile.id);
    const myProjectAssignments = tasksProjectId 
      ? myAssignmentsSource.filter(ap => ap.proyecto_id === tasksProjectId)
      : myAssignmentsSource;

    const isSup = myProjectAssignments.some(ap => ap.unidad_pactada === 'SUPERVISOR');
    const myCrewIndices = [...new Set(myProjectAssignments
      .filter(ap => ap.unidad_pactada !== 'SUPERVISOR')
      .map(ap => ap.cuadrilla_idx || 0))];
    
    const myName = user?.user_metadata?.nombre || '';

    const dirAssigned = state.presupuestoItems.filter(i => {
      if (tasksProjectId && i.proyecto_id !== tasksProjectId) return false;
      const assignedSignatures = (i.asignado_a_cuadrilla || '').split(',').map(s => s.trim()).filter(Boolean);
      if (isSup && assignedSignatures.length > 0) return true;
      const hasMyCrew = assignedSignatures.some(sig => {
        const parts = sig.split(':');
        if (parts.length < 2) return false;
        return myCrewIndices.includes(parseInt(parts[1]));
      });
      const isMeDirect = assignedSignatures.includes(cuadrillaId.toLowerCase()) || 
                        assignedSignatures.includes(myName.toLowerCase());
      return hasMyCrew || isMeDirect;
    }).map(i => i.id);

    const notesAssigned = state.notas.filter(n => {
      if (!n.assigned_to) return false;
      const target = n.assigned_to.toLowerCase();
      return target === myRoleStr.toLowerCase() || target === cuadrillaId.toLowerCase() || target === myName.toLowerCase();
    }).map(n => n.presupuesto_item_id);

    const validIds = new Set([...dirAssigned, ...notesAssigned]);
    return state.presupuestoItems.filter(item => 
      (!tasksProjectId || item.proyecto_id === tasksProjectId) && 
      validIds.has(item.id)
    ).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [state.presupuestoItems, state.personalProyecto, state.notas, tasksProjectId, myProfile, cuadrillaId, myRoleStr, user]);

  // Cálculo de progreso para tareas (Ponderado por Checklist + Reporte Físico)
  const progressMap = useMemo(() => {
    const map = {};
    misItems.forEach(item => {
      const checklistItems = state.itemChecklistItems?.filter(it => it.presupuesto_item_id === item.id) || [];
      const itemAvances = state.avances.filter(a => a.presupuesto_item_id === item.id && a.estado === 'APROBADO');
      const physicalQty = itemAvances.reduce((sum, a) => sum + Number(a.cantidad_incremental || 0), 0);
      
      const checklistTotalWeight = checklistItems.reduce((acc, it) => acc + (Number(it.porcentaje_peso) || 0), 0);
      const physicalWeight = Math.max(0, 100 - checklistTotalWeight);
      
      const physicalPctReal = (physicalQty / (item.cantidad || 1)) * 100;
      const physicalContribution = (physicalPctReal * physicalWeight) / 100;
      
      const checklistContribution = checklistItems
        .filter(it => it.completado && it.estado_aprobacion === 'APROBADO')
        .reduce((acc, it) => acc + (Number(it.porcentaje_peso) || 0), 0);
      
      const totalPct = Math.min(100, physicalContribution + checklistContribution);
      
      map[item.id] = {
        totalQty: (totalPct / 100) * (item.cantidad || 1),
        physicalContribution,
        technicalContribution: checklistContribution,
        physicalWeight,
        checklistTotalWeight,
        totalPct
      };
    });
    return map;
  }, [misItems, state.avances, state.itemChecklistItems]);

  // Asignaciones del usuario actual
  const myAssignments = useMemo(() => {
    if (!myProfile) return [];
    return state.personalProyecto.filter(ap => ap.personal_id === myProfile.id);
  }, [state.personalProyecto, myProfile]);

  const isSupervisor = useMemo(() => 
    myAssignments.some(ap => ap.proyecto_id === tasksProjectId && ap.unidad_pactada === 'SUPERVISOR'),
  [myAssignments, tasksProjectId]);

  const canSeeResumen = normalizedRole === 'admin' || normalizedRole === 'operativo' || isSupervisor;

  // Posibles canales para el proyecto seleccionado
  const availableChannels = useMemo(() => {
    if (!tasksProjectId) return [];
    
    const options = [];
    const canSeeResumen = normalizedRole === 'admin' || normalizedRole === 'operativo' || isSupervisor;
    
    if (canSeeResumen) {
      options.push({ id: 'RESUMEN', label: '📊 Canal Resumen (Total)' });
    }

    if (isSupervisor || normalizedRole === 'admin') {
      const distinct = [...new Set(state.personalProyecto
        .filter(ap => ap.proyecto_id === tasksProjectId && ap.unidad_pactada !== 'SUPERVISOR')
        .map(ap => ap.cuadrilla_idx ?? 0))].sort((a,b) => a - b);
      options.push(...distinct.map(idx => ({ id: `CUAD_${idx}`, label: `👷 Cuadrilla A-${idx+1}` })));
    } else {
      const myProjectAsigs = myAssignments.filter(ap => ap.proyecto_id === tasksProjectId);
      options.push(...myProjectAsigs.map(ap => ({ id: `CUAD_${ap.cuadrilla_idx ?? 0}`, label: `👷 Mi Equipo (A-${(ap.cuadrilla_idx ?? 0) + 1})` })));
    }
    return options;
  }, [state.personalProyecto, tasksProjectId, myAssignments]);

  // Actualizar scope global solo si no hay selección válida (pero permitir RESUMEN)
  useEffect(() => {
    if (availableChannels.length > 0 && !availableChannels.some(c => c.id === globalScope)) {
      setGlobalScope(availableChannels[0].id);
    }
  }, [availableChannels, globalScope]);

  // Cálculo de Presupuesto Canal y Ganancias Mensuales
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalChannelBudget = 0;
    let totalEarned = 0;

    // 1. Calcular Presupuesto Total del Canal en el Proyecto
    if (tasksProjectId) {
      const isResumen = globalScope === 'RESUMEN';
      const crewIdx = !isResumen ? parseInt(globalScope.split('_')[1]) : -1;

      state.presupuestoItems
        .filter(pi => pi.proyecto_id === tasksProjectId)
        .forEach(pi => {
          const itemMOBudget = calcularCostoMO(pi.apu_id) * (Number(pi.cantidad) || 0);
          if (isResumen) {
            totalChannelBudget += itemMOBudget;
          } else if (pi.asignado_a_cuadrilla) {
            const numCrews = Math.max(Number(pi.num_cuadrillas) || 1, 1);
            totalChannelBudget += itemMOBudget / numCrews;
          }
        });
    }

    // 2. Calcular Valor Ganado del canal en el mes
    state.avances.forEach(a => {
      const aDate = new Date(a.created_at || a.fecha);
      const inMonth = aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
      
      const isResumen = globalScope === 'RESUMEN';
      const matchScope = isResumen || a.meta?.scope === globalScope;
      const isAprobado = a.estado === 'APROBADO';

      if (inMonth && matchScope && isAprobado) {
        const item = state.presupuestoItems.find(pi => pi.id === a.presupuesto_item_id && pi.proyecto_id === tasksProjectId);
        if (item) {
          const moCost = calcularCostoMO(item.apu_id);
          totalEarned += moCost * (Number(a.cantidad_incremental) || 0);
        }
      }
    });

    return { totalChannelBudget, totalEarned };
  }, [state.avances, state.presupuestoItems, tasksProjectId, globalScope, calcularCostoMO]);

  const [showCobroModal, setShowCobroModal] = useState(false);

  const calculateDateEnd = (item) => {
    if (!item.fecha_inicio || (!item.num_cuadrillas && item.num_cuadrillas !== 0)) return item.fecha_fin || null;
    const apu = state.apus.find(a => a.id === item.apu_id);
    const rendimiento = Number(apu?.rendimiento) || 1; 
    const crews = Math.max(Number(item.num_cuadrillas) || 1, 1);
    const days = Math.ceil(item.cantidad / (rendimiento * crews));
    
    let current = new Date(item.fecha_inicio);
    current.setHours(12, 0, 0, 0);
    let count = 1;
    while (count < days) {
      current.setDate(current.getDate() + 1);
      if (current.getDay() !== 0) count++;
    }
    return current.toISOString().split('T')[0];
  };

  const MiniGantt = ({ item, physicalContribution = 0, technicalContribution = 0 }) => {
    const project = state.proyectos.find(p => p.id === item.proyecto_id);
    const startDate = item.fecha_inicio || project?.fecha_inicio || new Date().toISOString().split('T')[0];
    const endDate = calculateDateEnd(item) || project?.fecha_fin || new Date().toISOString().split('T')[0];
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    
    const min = start - 86400000 * 3;
    const max = Math.max(end, now) + 86400000 * 5;
    const totalWidth = max - min;
    
    const getPos = (dString) => {
      const d = new Date(dString).getTime();
      return ((d - min) / totalWidth) * 100;
    };

    const days = [];
    let cur = new Date(min);
    while (cur.getTime() <= max) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const totalProgress = physicalContribution + technicalContribution;

    return (
      <div style={{ marginTop: 12, position: 'relative', background: '#f8fafc', borderRadius: 12, padding: '24px 12px 12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <div style={{ position: 'absolute', top: 6, left: 12, fontSize: 9, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', gap: 10 }}>
          <span>⏱️ Cronograma</span>
          <span style={{ color: '#10b981' }}>● Físico</span>
          <span style={{ color: '#3b82f6' }}>● Técnico</span>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 12, paddingBottom: 4 }}>
          {days.filter((_, i) => i % 2 === 0).map((d, i) => (
            <div key={i} style={{ width: `${(86400000 * 2 / totalWidth) * 100}%`, fontSize: 8, color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>
              {d.getDate()} {d.toLocaleString('es-CO', { month: 'short' }).toUpperCase()}
            </div>
          ))}
        </div>

        <div style={{ height: 30, position: 'relative' }}>
          {now >= min && now <= max && (
            <div style={{ position: 'absolute', left: `${getPos(new Date().toISOString())}%`, top: -10, bottom: -5, width: 2, background: '#ef4444', zIndex: 10 }}>
              <div style={{ position: 'absolute', top: -12, left: -6, fontSize: 7, fontWeight: 900, color: 'white', background: '#ef4444', padding: '1px 3px', borderRadius: 2 }}>HOY</div>
            </div>
          )}

          <div style={{ position: 'absolute', left: `${getPos(startDate)}%`, width: `${((end - start) / totalWidth) * 100}%`, height: 16, background: '#e2e8f0', borderRadius: 8, top: 4, overflow: 'hidden', border: '1px solid #cbd5e1', display: 'flex' }}>
            <div style={{ height: '100%', width: `${technicalContribution}%`, background: '#3b82f6', transition: 'width 0.5s' }}></div>
            <div style={{ height: '100%', width: `${physicalContribution}%`, background: '#10b981', transition: 'width 0.5s' }}></div>
            <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: totalProgress > 50 ? 'white' : '#64748b' }}>{Math.round(totalProgress)}%</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#64748b', marginTop: 4, fontWeight: 700 }}>
          <span>INI: {new Date(startDate).toLocaleDateString()}</span>
          <span>FIN: {new Date(endDate).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  const getCargosByChannel = (projectId, channelScope) => {
    if (!projectId) return [];
    
    // 1. Obtener personal asignado a este proyecto
    const projectPeopleIds = state.personalProyecto
      .filter(ap => ap.proyecto_id === projectId)
      .map(ap => ap.personal_id);
      
    let filteredPeople = state.personal.filter(p => projectPeopleIds.includes(p.id));
    
    // 2. Filtrar por canal si es necesario
    if (channelScope && channelScope.startsWith('CUAD_')) {
      const idx = parseInt(channelScope.split('_')[1]);
      const crewPersonIds = state.personalProyecto
        .filter(ap => ap.proyecto_id === projectId && ap.cuadrilla_idx === idx)
        .map(ap => ap.personal_id);
      filteredPeople = filteredPeople.filter(p => crewPersonIds.includes(p.id));
    }
    
    // 3. Formatear para sugerencias (únicos por cargo + nombre)
    return filteredPeople.map(p => {
      const cargo = state.cargos.find(c => c.id === p.cargo_id);
      return {
        id: p.id,
        nombre: p.nombre || `${p.nombres} ${p.apellidos}`,
        cargo: p.profesion || cargo?.nombre || 'Operario'
      };
    });
  };

  // ─── Dashboard de Gestión Técnica Helpers ───
  const handleAddChecklistItem = (itemId, scope = 'RESUMEN') => {
    if (!newChecklistItem.trim()) return;
    const checklistId = crypto.randomUUID();
    dispatch({
      type: 'ADD_CHECKLIST_ITEM',
      payload: { 
        id: checklistId,
        presupuesto_item_id: itemId, 
        texto: newChecklistItem.trim(), 
        scope, 
        completado: false, 
        estado_aprobacion: 'PENDIENTE',
        porcentaje_peso: 0,
        porcentaje_avance: 0
      }
    });
    // Generar nota automática para que aparezca en historial operativo
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: itemId,
        texto: `📋 Nuevo ítem de checklist creado:\n"${newChecklistItem.trim()}"\nEstado: Pendiente de aprobación`,
        status: 'Recibido',
        author_id: user?.id,
        author_name: myProfile?.nombre || user?.email,
        checklist_item_id: checklistId,
        meta: { scope: scope, type: 'tech_report' }
      }
    });
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (item) => {
    // Solo se puede reportar avance si el ítem fue APROBADO
    if (item.estado_aprobacion !== 'APROBADO') {
      alert('⚠️ Este ítem debe ser aprobado por el supervisor antes de reportar avance.');
      return;
    }

    setReportingItem(item);
    setTechnicalReportPct(item.porcentaje_avance || 0);
    setShowTechnicalReportModal(true);
  };

  const handleUpdateChecklistWeight = (id, weight) => {
    dispatch({
      type: 'UPDATE_CHECKLIST_ITEM',
      payload: { id, changes: { porcentaje_peso: Number(weight) } }
    });
  };

  const handleAddDocument = async (itemId, file) => {
    if (!file) return;
    setIsUploadingDoc(true);
    try {
      const url = await storageService.uploadFile('item_docs', file, `doc_actividad_${itemId}/${Date.now()}_${file.name}`);
      dispatch({
        type: 'ADD_ITEM_DOCUMENT',
        payload: {
          presupuesto_item_id: itemId,
          nombre: file.name,
          file_url: url,
          tipo: file.name.split('.').pop().toUpperCase()
        }
      });
    } catch (err) {
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const submitTechnicalReport = async () => {
    if (!technicalReportFile || !reportingItem) {
      alert("La fotografía de evidencia es obligatoria para reportes técnicos.");
      return;
    }
    const pct = Math.max(0, Math.min(100, Number(technicalReportPct) || 0));
    setIsSubmittingReport(true);
    try {
      const url = await storageService.uploadImage(technicalReportFile, 'checklists');
      
      // Crear una NOTA que sea el "reporte"
      dispatch({
        type: 'ADD_NOTE',
        payload: {
          presupuesto_item_id: reportingItem.presupuesto_item_id,
          texto: `📋 AVANCE DE CHECKLIST: "${reportingItem.texto}"\nAvance reportado: ${pct}%\n${technicalReportComment}`,
          file_url: url,
          status: 'Recibido',
          author_id: user?.id,
          author_name: myProfile?.nombre || user?.email,
          checklist_item_id: reportingItem.id,
          meta: { scope: supervisionScope, type: 'tech_report', porcentaje: pct }
        }
      });

      // NO actualizar el checklist item todavía.
      // El avance se confirma cuando el supervisor APRUEBA la nota.

      alert(`✅ Reporte de avance (${pct}%) enviado para aprobación.`);
      setShowTechnicalReportModal(false);
      setTechnicalReportFile(null);
      setTechnicalReportComment('');
      setTechnicalReportPct(0);
    } catch (err) {
      alert("Error al enviar reporte: " + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const submitReply = (parentId) => {
    if (!replyText.trim()) return;
    const parentNote = state.notas.find(n => n.id === parentId);
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: parentNote?.presupuesto_item_id || reportingItem?.presupuesto_item_id,
        texto: replyText,
        parent_id: parentId,
        author_id: user?.id,
        author_name: myProfile?.nombre || user?.email,
        meta: { scope: parentNote?.meta?.scope || supervisionScope, type: 'reply' }
      }
    });
    setReplyText('');
    setReplyingTo(null);
  };

  const handleLlegada = (itemId, scope) => {
    setAsistenciaType('LLEGADA');
    setAsistenciaItemId(itemId);
    setAsistenciaScope(scope);
    setAsistenciaComment('');
    setAsistenciaFile(null);
    setShowAsistenciaModal(true);
  };
  const handleSalida = (itemId, scope) => {
    setAsistenciaType('SALIDA');
    setAsistenciaItemId(itemId);
    setAsistenciaScope(scope);
    setAsistenciaComment('');
    setAsistenciaFile(null);
    setShowAsistenciaModal(true);
  };

  const submitAsistencia = async () => {
    setIsUploadingAsistencia(true);
    let fotoUrl = null;
    try {
      if (asistenciaFile) {
        fotoUrl = await storageService.uploadImage(asistenciaFile, 'asistencia');
      }
      dispatch({ 
        type: 'ADD_ASISTENCIA', 
        payload: { 
          cuadrilla_id: cuadrillaId, 
          presupuesto_item_id: asistenciaItemId, 
          tipo: asistenciaType, 
          fecha_hora: new Date().toISOString(),
          comentario: asistenciaComment,
          foto_url: fotoUrl,
          meta: { scope: asistenciaScope }
        } 
      });
      alert(`✅ ${asistenciaType} registrado correctamente.`);
      setShowAsistenciaModal(false);
    } catch (err) {
      alert("Error al subir evidencia: " + err.message);
    } finally {
      setIsUploadingAsistencia(false);
    }
  };

  const handleReportarAvance = (itemId, totalQty, currentProg, scope, unit) => {
    setAvanceItemId(itemId);
    setAvanceTotalQty(totalQty);
    setAvanceCurrentProg(currentProg);
    setAvanceScope(scope);
    setAvanceUnit(unit || '');
    setAvanceQty('');
    setAvanceComment('');
    setAvanceFile(null);
    setShowAvanceModal(true);
  };

  const submitAvance = async () => {
    if (!avanceFile) {
      alert("📷 La fotografía de evidencia es obligatoria para reportar avance.");
      return;
    }
    const qtyNum = parseFloat(avanceQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Por favor ingresa una cantidad válida.");
      return;
    }
    
    setIsUploadingAvance(true);
    let fotoUrl = null;
    try {
      if (avanceFile) {
        fotoUrl = await storageService.uploadImage(avanceFile, 'avances');
      }
      
      dispatch({
        type: 'ADD_AVANCE',
        payload: {
          presupuesto_item_id: avanceItemId,
          cantidad_incremental: qtyNum,
          fecha: new Date().toISOString(), // Usar ISO completo para precisión temporal
          comentario: avanceComment,
          foto_url: fotoUrl,
          user_id: user?.id,
          meta: { scope: avanceScope }
        }
      });
      
      alert("✅ Avance reportado correctamente.");
      setShowAvanceModal(false);
    } catch (err) {
      alert("Error al reportar avance: " + err.message);
    } finally {
      setIsUploadingAvance(false);
    }
  };


  // ─── Funciones de Almacén (Manual & IA) ───
  const handleInout = () => {
    if (!currentBodega || !selectedInsumoId || !qty) return;
    dispatch({
      type: 'ADD_INVENTARIO_MOV',
      payload: {
        bodega_id: currentBodega.id, insumo_id: selectedInsumoId, tipo: inoutType, cantidad: Number(qty),
        motivo: motivo || (inoutType === 'ENTRADA' ? 'Ingreso manual app' : 'Salida manual app'),
        distribuidor: inoutType === 'ENTRADA' ? distribuidor : null, costo_real: inoutType === 'ENTRADA' ? Number(costoReal) : null,
        estado: 'APROBADO', solicitante: myRoleStr,
        presupuesto_item_id: inoutType === 'SALIDA' ? distribuidor : null
      }
    });
    alert('Movimiento registrado localmente.');
    setShowInoutModal(false); setSelectedInsumoId(''); setQty(''); setMotivo(''); setDistribuidor(''); setCostoReal('');
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleProcessAI = async () => {
    if (!selectedFile) return;
    setIsProcessingAI(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/parse-invoice', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error parsing invoice');
      
      const itemsMapped = data.items.map(item => {
        const query = item.nombre_detectado.split(' ')[0].toLowerCase();
        const mapped = state.insumos.find(i => i.nombre.toLowerCase().includes(query));
        return { ...item, mapped_insumo: mapped?.id || '' };
      });
      setAiResult({ distribuidor: data.distribuidor || 'Desconocido', items: itemsMapped });
    } catch (err) { alert("Error AI: " + err.message); } finally { setIsProcessingAI(false); }
  };

  const handleImportAI = async () => {
    if (!aiResult || !currentBodega) return;
    let comprobanteUrl = null;
    try {
      if (selectedFile) {
        setIsProcessingAI(true);
        comprobanteUrl = await storageService.uploadImage(selectedFile, 'invoices');
      }
    } catch (err) { alert("Error subiendo archivo: " + err.message); setIsProcessingAI(false); return; }

    aiResult.items.forEach(item => {
      if (item.mapped_insumo) {
        dispatch({ type: 'ADD_INVENTARIO_MOV', payload: {
          bodega_id: currentBodega.id, insumo_id: item.mapped_insumo, tipo: 'ENTRADA', cantidad: Number(item.cantidad) || 1,
          motivo: 'IA Scanner', distribuidor: aiResult.distribuidor, costo_real: Number(item.costo_unitario) || 0,
          comprobante_url: comprobanteUrl, estado: 'APROBADO'
        }});
      }
    });
    setShowAIModal(false); setAiResult(null); setSelectedFile(null); setIsProcessingAI(false);
    alert('✅ Factura ingresada!');
  };

  const handleScanCode = (text) => {
    setShowScanner(false);
    // Find insumo by exact barcode alias, exact "codigo", or fallback to full text search
    const found = state.insumos.find(i => i.codigo?.toLowerCase() === text.toLowerCase());
    if (found) {
      setSelectedInsumoId(found.id);
      setInoutType('SALIDA'); // Assume scan is to withdraw or quick action. Defaulting to SALIDA for field work.
      setDistribuidor('');
      setShowInoutModal(true);
    } else {
      alert('❌ Código no reconocido en el catálogo: ' + text);
    }
  };

  // ─── Renders ───
  const renderAlmacen = () => {
    const pendingRequests = state.inventario.filter(t => t.tipo === 'SALIDA' && t.estado === 'PENDIENTE').sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Selector de Proyecto Obligatorio para Acciones */}
        <div style={{ background: 'var(--color-primary)', color: 'white', padding: 20, borderRadius: 16, marginTop: -20, marginLeft: -20, marginRight: -20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Bodega Activa</h2>
          <select 
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', fontSize: 16, background: 'rgba(255,255,255,0.9)' }}
            value={selectedProyectoId} 
            onChange={e => setSelectedProyectoId(e.target.value)}
          >
            <option value="">Seleccionar Proyecto...</option>
            {state.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>

          {currentBodega && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setInoutType('ENTRADA'); setDistribuidor(''); setShowInoutModal(true); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 12 }}>+ INGRESO / SALIDA</button>
              <button onClick={() => setShowAIModal(true)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 12 }}>🤖 ESCÁNER AI</button>
              <button onClick={() => setShowScanner(true)} style={{ gridColumn: 'span 2', background: '#334155', color: 'white', border: 'none', padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 14 }}>📷 LEER CÓDIGO DE BARRAS / QR</button>
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Inventario de Bodega</h2>
        
        {/* Buscador de Insumos */}
        <input 
          type="text" 
          placeholder="🔍 Buscar material / código..." 
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14 }}
          onChange={(e) => setInsumoSearch(e.target.value)}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.insumos
            .filter(i => !insumoSearch || i.nombre.toLowerCase().includes(insumoSearch.toLowerCase()) || i.codigo.toLowerCase().includes(insumoSearch.toLowerCase()))
            .map(insumo => {
              const globalStock = state.inventario
                .filter(t => t.insumo_id === insumo.id && t.estado !== 'RECHAZADO')
                .reduce((s, t) => s + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)), 0);
              
              const projectStock = currentBodega ? state.inventario
                .filter(t => t.insumo_id === insumo.id && t.bodega_id === currentBodega.id && t.estado !== 'RECHAZADO')
                .reduce((s, t) => s + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)), 0) : 0;

              if (globalStock === 0 && !insumoSearch) return null; // Ocultar si no hay stock a menos que se busque

              return (
                <div key={insumo.id} style={{ background: 'white', padding: 16, borderRadius: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{insumo.codigo}</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{insumo.nombre}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{globalStock.toFixed(1)} {insumo.unidad}</div>
                    {currentBodega && (
                      <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>En Proyecto: {projectStock.toFixed(1)}</div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 24 }}>Solicitudes Pendientes de Cuadrilla</h2>
        {pendingRequests.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: 40, border: '2px dashed #cbd5e1', borderRadius: 16 }}>No hay despachos solicitados hoy.</div>}
        
        {pendingRequests.map(req => {
          const insumo = state.insumos.find(i => i.id === req.insumo_id);
          const bodega = state.bodegas.find(b => b.id === req.bodega_id);
          return (
            <div key={req.id} style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, marginBottom: 4 }}>Para: {bodega?.nombre}</div>
              <h3 style={{ fontSize: 18, marginBottom: 4 }}>{insumo?.nombre}</h3>
              <div style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>Cant: <strong>{req.cantidad} {insumo?.unidad}</strong> | Solicitó: {req.solicitante}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button 
                  onClick={() => confirm('¿Aprobar despacho?') && dispatch({ type: 'UPDATE_INVENTARIO_MOV', payload: { id: req.id, changes: { estado: 'APROBADO', motivo: req.motivo + ' (Autorizado)' } } })}
                  style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontWeight: 700 }}>📦 APROBAR</button>
                <button 
                  onClick={() => dispatch({ type: 'UPDATE_INVENTARIO_MOV', payload: { id: req.id, changes: { estado: 'RECHAZADO', motivo: req.motivo + ' (Rechazado)' } } })}
                  style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontWeight: 700 }}>❌ RECHAZAR</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const submitNote = (item, text, fileUrl = null) => {
    const myName = user?.user_metadata?.nombre || user?.email || 'Usuario';
    // Usar globalScope directamente — es el canal que el usuario ve en el chat
    const activeScope = globalScope;
    
    // Chat libre: siempre publicado sin aprobación
    // Solo instrucciones (@) mantienen lógica de estados
    const isInstruction = text.includes('@');
    let initialStatus = 'Aprobado'; // Chat libre = siempre visible
    
    if (isInstruction) {
      const myCargoLower = (myProfile?.profesion || '').toLowerCase();
      const isDirector = myCargoLower.includes('director') || myCargoLower.includes('gerente') || normalizedRole === 'admin';
      const isResident = myCargoLower.includes('residente');
      if (isDirector) initialStatus = 'Aprobado';
      else if (isResident) initialStatus = 'Recibido';
      else initialStatus = 'Aprobado';
    }

    dispatch({ 
      type: 'ADD_NOTE', 
      payload: { 
        id: crypto.randomUUID(),
        presupuesto_item_id: item.id, 
        texto: text, 
        author_id: user?.id,
        author_name: myName,
        file_url: fileUrl,
        status: initialStatus, 
        created_at: new Date().toISOString(),
        meta: { scope: activeScope, type: 'chat' }
      } 
    });
  };

  const renderTareas = () => {
    const myName = user?.user_metadata?.nombre || '';
    const myProjectIds = [...new Set(myAssignments.map(ap => ap.proyecto_id))];
    const myProjects = state.proyectos.filter(p => myProjectIds.includes(p.id));

    // If only one project, auto-select it
    if (myProjects.length === 1 && !tasksProjectId) {
      setTasksProjectId(myProjects[0].id);
    }

    const isSupervisor = myAssignments.some(ap => ap.proyecto_id === tasksProjectId && ap.unidad_pactada === 'SUPERVISOR');
    
    // Filtrado Inteligente por Canal Global
    const displayItems = misItems.filter(item => {
      // 1. Filtrar por búsqueda de texto
      if (taskSearch && !state.apus.find(a => a.id === item.apu_id)?.nombre.toLowerCase().includes(taskSearch.toLowerCase())) {
        return false;
      }
      
      // 2. Filtrar por canal: El ítem debe estar asignado a este canal específico en este proyecto
      // Nota: Si es supervisor, permitimos ver todo lo del proyecto pero filtrado por el scope global seleccionado
      if (tasksProjectId && globalScope.startsWith('CUAD_')) {
        const targetIdx = parseInt(globalScope.split('_')[1]);
        // Solo mostramos si el item está en el mismo proyecto y tiene asignación (simplificado para campo)
        return item.proyecto_id === tasksProjectId; 
      }

      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Banner de Bolsa de Trabajo (Acumulado Mensual) */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
          padding: '24px 20px', borderRadius: 24, color: 'white', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', gap: 16,
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Decoración Fondo */}
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 100, opacity: 0.1, pointerEvents: 'none' }}>💰</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🏗️ Meta Presupuestal Canal ({new Date().toLocaleString('es-CO', { month: 'long' }).toUpperCase()})
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monthlyStats.totalChannelBudget)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginTop: 10 }}>
                💰 Acumulado Ganado: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monthlyStats.totalEarned)}
              </div>
            </div>
            {canSeeResumen && (
              <div 
                onMouseEnter={() => setHoverCobrar(true)}
                onMouseLeave={() => setHoverCobrar(false)}
                style={{ position: 'relative' }}
              >
                <button 
                  onClick={() => setShowCobroModal(true)}
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', 
                    padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 800, backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s', cursor: 'pointer'
                  }}>
                  💵 Cobrar
                </button>

                {/* Menú Desplegable con Iconos Flotantes */}
                <div style={{ 
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, 
                  background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
                  zIndex: 100, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: hoverCobrar ? 1 : 0, transform: hoverCobrar ? 'translateY(0)' : 'translateY(-10px)',
                  pointerEvents: hoverCobrar ? 'auto' : 'none', minWidth: 120
                }}>
                  <button style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                    <span style={{ fontSize: 16 }}>💸</span> Pagar
                  </button>
                  <button style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                    <span style={{ fontSize: 16 }}>🛒</span> Comprar
                  </button>
                  <button style={{ background: 'transparent', border: 'none', color: 'white', padding: '10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                    <span style={{ fontSize: 16 }}>🏦</span> Ahorrar
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.05)', height: 1, width: '100%' }}></div>
          
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }}>GESTIÓN DE AVANCE</div>
              <div style={{ height: 6, width: 100, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((monthlyStats.totalEarned / (monthlyStats.totalChannelBudget || 1)) * 100, 100)}%`, background: '#10b981' }}></div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }}>REPORTES DEL MES</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {(() => {
                    const now = new Date();
                    return state.avances.filter(a => {
                      const d = new Date(a.created_at || a.fecha);
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.meta?.scope === globalScope;
                    }).length;
                  })()} reportes
                </div>
            </div>
          </div>
        </div>

        {/* Project & Channel Selector */}
        <div style={{ background: 'white', padding: 16, borderRadius: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Proyecto Activo</div>
              <select 
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: '#f8fafc', fontWeight: 600 }}
                value={tasksProjectId}
                onChange={e => { setTasksProjectId(e.target.value); setTaskSearch(''); }}
              >
                <option value="">Seleccionar Proyecto...</option>
                {myProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Canal / Cuadrilla</div>
              <select 
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: '#eff6ff', fontWeight: 700, color: '#2563eb' }}
                value={globalScope}
                onChange={e => setGlobalScope(e.target.value)}
              >
                {availableChannels.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {tasksProjectId && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Buscar Actividad</div>
                <input 
                  type="text" 
                  placeholder="🔍 Nombre..." 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                  value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {displayItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>{tasksProjectId ? 'No se encontraron actividades' : 'No tienes tareas asignadas'}</div>
            <div style={{ fontSize: 12 }}>{tasksProjectId ? 'Intenta con otro término de búsqueda' : 'Contacta al Residente de Obra'}</div>
          </div>
        )}

        {displayItems.map(item => {
          const apu = state.apus.find(a => a.id === item.apu_id);
          const project = state.proyectos.find(p => p.id === item.proyecto_id);
          const isDirectlyAssigned = misItems.some(mi => mi.id === item.id);
          const myProjectAssignment = myAssignments.find(ap => ap.proyecto_id === item.proyecto_id);
          const activeScope = itemActiveScopes[item.id] || (myProjectAssignment?.unidad_pactada === 'SUPERVISOR' ? 'RESUMEN' : `CUAD_${myProjectAssignment?.cuadrilla_idx || 0}`);

          return (
            <div key={item.id} style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: isDirectlyAssigned ? '4px solid #3b82f6' : '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* HEADER COLAPSABLE */}
              <div 
                onClick={() => setCollapsedCards(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: collapsedCards[item.id] ? '#f8fafc' : 'white', transition: 'background 0.15s', userSelect: 'none' }}>
                <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.2s', transform: collapsedCards[item.id] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!tasksProjectId && <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{project?.nombre}</div>}
                  <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {apu?.nombre} {item.descripcion ? `- ${item.descripcion}` : ''}
                  </h3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {isDirectlyAssigned && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#166534' }}>👷 Mi Cuadrilla</span>}
                    {isSupervisor && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>🔍 Supervisor</span>}
                    {(normalizedRole === 'admin') && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#5b21b6' }}>⚙️ Admin</span>}
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8' }}>{apu?.unidad || 'und'}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSupervisionScope(globalScope); setSupervisionItem(item); }}
                  style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  🔍
                </button>
              </div>

              {/* BODY COLAPSABLE */}
              {!collapsedCards[item.id] && (
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <button 
                onClick={() => handleLlegada(item.id, globalScope)}
                style={{ background: '#f8fafc', color: '#10b981', border: '1px solid #d1fae5', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 12 }}>☀️ LLEGADA</button>
              <button 
                onClick={() => handleSalida(item.id, globalScope)}
                style={{ background: '#f8fafc', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 12 }}>🌙 SALIDA</button>
            </div>

            {(() => {
              const info = progressMap[item.id] || { physicalWeight: 100, totalQty: 0 };
              
              return (
                <button 
                  onClick={() => handleReportarAvance(item.id, item.cantidad, info.totalQty, globalScope, apu?.unidad)}
                  style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700 }}>
                  🚀 REPORTAR AVANCE ({apu?.unidad}) - Peso: {info.physicalWeight}%
                </button>
              );
            })()}

            {/* CRONOGRAMA GANTT STACKED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MiniGantt 
                item={item} 
                physicalContribution={progressMap[item.id]?.physicalContribution || 0} 
                technicalContribution={progressMap[item.id]?.technicalContribution || 0} 
              />
            </div>

              {/* MODULOS TECNICOS IN-PLACE (Checklist y Docs integrados en tarjeta) */}
              {(() => {
                const items = state.itemChecklistItems?.filter(it => it.presupuesto_item_id === item.id && it.scope === globalScope) || [];
                const docs = state.itemDocuments?.filter(d => d.presupuesto_item_id === item.id && d.scope === globalScope) || [];
                const info = progressMap[item.id];
                const technicalPct = info?.technicalContribution || 0;
                const totalChecklistWeight = info?.checklistTotalWeight || 0;
                const displayPct = totalChecklistWeight > 0 ? Math.round((technicalPct / totalChecklistWeight) * 100) : 0;

                return (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Mini Checklist — Colapsable */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div 
                        onClick={() => setCollapsedSub(prev => ({ ...prev, [`${item.id}_checklist`]: !prev[`${item.id}_checklist`] }))}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: 12, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                          <span style={{ fontSize: 10, marginRight: 4, display: 'inline-block', transition: 'transform 0.2s', transform: collapsedSub[`${item.id}_checklist`] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                          📝 CHECKLIST TÉCNICO
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6' }}>Ponderado: {technicalPct.toFixed(1)}% / {totalChecklistWeight}% ({displayPct}%)</span>
                      </div>
                      {!collapsedSub[`${item.id}_checklist`] && <div style={{ padding: '0 12px 12px' }}>
                      
                      {/* Input Nueva Tarea Inline */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <input 
                          type="text" 
                          placeholder="Nuevo punto de control..." 
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
                          value={newChecklistItem}
                          onChange={e => setNewChecklistItem(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(item.id, globalScope)}
                        />
                        <button 
                          onClick={() => handleAddChecklistItem(item.id, globalScope)}
                          style={{ padding: '0 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>+</button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                        {items.filter(it => it.estado_aprobacion !== 'RECHAZADO').map(it => {
                          const isApproved = it.estado_aprobacion === 'APROBADO';
                          const isPending = !it.estado_aprobacion || it.estado_aprobacion === 'PENDIENTE';
                          const avancePct = Number(it.porcentaje_avance) || 0;
                          const isComplete = avancePct >= 100;
                          const canSupervise = normalizedRole === 'admin' || normalizedRole === 'operativo' || isSupervisor;
                          
                          return (
                            <div 
                              key={it.id} 
                              onClick={() => handleToggleChecklistItem(it)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: isComplete ? '#f0fdf4' : (isApproved ? '#fafffe' : '#f8fafc'), border: `1px solid ${isComplete ? '#bbf7d0' : (isApproved ? '#a7f3d0' : '#e2e8f0')}`, cursor: isApproved ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                              {/* Candado toggle: cerrado = pendiente, abierto = aprobado */}
                              {(() => {
                                const lockClosed = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
                                const lockOpen = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
                                const checkIcon = <span style={{ fontSize: 14 }}>✅</span>;
                                const icon = isComplete ? checkIcon : (isApproved ? lockOpen : lockClosed);
                                
                                return canSupervise ? (
                                  <div 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: it.id, changes: { estado_aprobacion: isApproved ? 'PENDIENTE' : 'APROBADO' } } }); 
                                    }}
                                    style={{ width: 28, height: 28, borderRadius: 8, background: isComplete ? '#dcfce7' : (isApproved ? '#ecfdf5' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}
                                    title={isApproved ? 'Bloquear actividad' : 'Desbloquear actividad'}>
                                    {icon}
                                  </div>
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: 8, background: isComplete ? '#dcfce7' : (isApproved ? '#ecfdf5' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {icon}
                                  </div>
                                );
                              })()}
                              {/* Texto + estado */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isComplete ? '#065f46' : '#1e293b', textDecoration: isComplete ? 'line-through' : 'none' }}>{it.texto}</div>
                                {isPending && <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>🔒 Pendiente</div>}
                                {isApproved && avancePct > 0 && avancePct < 100 && (
                                  <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ width: `${avancePct}%`, height: '100%', background: '#22c55e', borderRadius: 2 }} />
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#22c55e' }}>{avancePct}%</span>
                                  </div>
                                )}
                                {isApproved && avancePct === 0 && <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>✅ Aprobado</div>}
                              </div>
                              {/* Peso % */}
                              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                <input 
                                  type="number" 
                                  value={it.porcentaje_peso || 0}
                                  onChange={(e) => handleUpdateChecklistWeight(it.id, e.target.value)}
                                  style={{ width: 36, padding: '4px 2px', textAlign: 'center', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 800, color: '#3b82f6', background: 'white' }}
                                />
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b' }}>%</span>
                              </div>
                              {/* X gris para rechazar — al lado derecho del % */}
                              {canSupervise && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: it.id, changes: { estado_aprobacion: 'RECHAZADO' } } }); }}
                                  style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                  title="Eliminar ítem">
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {items.filter(it => it.estado_aprobacion !== 'RECHAZADO').length === 0 && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin tareas de control asignadas.</div>}
                      </div>
                    </div>}
                    </div>

                    {/* Mini Galería Docs — Colapsable */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div 
                        onClick={() => setCollapsedSub(prev => ({ ...prev, [`${item.id}_docs`]: !prev[`${item.id}_docs`] }))}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: 12, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                          <span style={{ fontSize: 10, marginRight: 4, display: 'inline-block', transition: 'transform 0.2s', transform: collapsedSub[`${item.id}_docs`] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                          📎 DOCUMENTACIÓN
                        </span>
                        <label onClick={e => e.stopPropagation()} style={{ fontSize: 9, color: '#3b82f6', fontWeight: 800, cursor: 'pointer' }}>+ SUBIR <input type="file" style={{ display: 'none' }} onChange={e => handleAddDocument(item.id, e.target.files[0], activeScope)} /></label>
                      </div>
                    {!collapsedSub[`${item.id}_docs`] && <div style={{ padding: '0 12px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {docs.map(doc => (
                          <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, background: '#fff', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 6, color: '#334155', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            📄 {doc.nombre.length > 12 ? doc.nombre.slice(0, 10) + '...' : doc.nombre}
                          </a>
                        ))}
                        {docs.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin planos o memorias adjuntas.</div>}
                      </div>
                    </div>}
                    </div>
                  </div>
                );
              })()}

              {/* Sección de Mensajes — Colapsable */}
              <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: 4 }}>
                <div 
                  onClick={() => setCollapsedSub(prev => ({ ...prev, [`${item.id}_chat`]: !prev[`${item.id}_chat`] }))}
                  style={{ padding: 12, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, display: 'inline-block', transition: 'transform 0.2s', transform: collapsedSub[`${item.id}_chat`] ? 'rotate(-90deg)' : 'rotate(0deg)', color: '#94a3b8' }}>▼</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    💬 Mensajes: {globalScope === 'RESUMEN' ? 'Resumen (Admin)' : `Cuadrilla A-${parseInt(globalScope.split('_')[1]) + 1}`}
                  </span>
                </div>
                {!collapsedSub[`${item.id}_chat`] && <div style={{ padding: '0 12px 12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', marginBottom: 16, padding: '4px 2px' }}>
                  {(() => {
                    const filtered = state.notas
                      .filter(n => n.presupuesto_item_id === item.id)
                      .filter(n => {
                        const nScope = n.meta?.scope || 'RESUMEN';
                        return nScope === globalScope;
                      })
                      .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

                    if (filtered.length === 0) return <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>Sin reportes o instrucciones en este canal</div>;
                    
                    const renderTextWithMentions = (text) => {
                      if (!text) return '';
                      const parts = text.split(/(@[\w\s-]+)/g);
                      return parts.map((part, i) => 
                        part.startsWith('@') 
                          ? <span key={i} style={{ color: '#2563eb', fontWeight: 700 }}>{part}</span> 
                          : part
                      );
                    };

                    const myCargoLower = (myProfile?.profesion || '').toLowerCase();
                    const isDirector = myCargoLower.includes('director') || myCargoLower.includes('gerente') || normalizedRole === 'admin';

                    const rootNotes = filtered.filter(n => !n.parent_id);

                    return rootNotes.map(note => {
                      const isMe = note.author_id === user?.id;
                      const status = note.status || 'Recibido';
                      const replies = filtered.filter(r => r.parent_id === note.id).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                      
                      // Determinar colores según estado
                      let bubbleBg = isMe ? '#2563eb' : '#f1f5f9';
                      let textColor = isMe ? 'white' : '#1e293b';
                      let borderColor = isMe ? 'none' : '#e2e8f0';

                      if (status === 'Aprobado') { bubbleBg = '#f0fdf4'; borderColor = '#86efac'; textColor = '#166534'; }
                      if (status === 'Revisado') { bubbleBg = '#fef2f2'; borderColor = '#fca5a5'; textColor = '#991b1b'; }

                      return (
                        <div key={note.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {/* Mensaje principal */}
                          <div style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}>
                            {!isMe && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2, marginLeft: 4 }}>
                                {note.author_name} 🏷️ {status.toUpperCase()}
                              </div>
                            )}
                            <div style={{ 
                              background: bubbleBg, 
                              color: textColor,
                              padding: '10px 14px', 
                              borderRadius: isMe ? '18px 18px 0 18px' : '18px 18px 18px 0', 
                              fontSize: 13,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              border: `1px solid ${borderColor}`,
                              wordBreak: 'break-word',
                              position: 'relative'
                            }}>
                              {renderTextWithMentions(note.texto)}
                              {note.file_url && (
                                <div style={{ marginTop: 8, borderTop: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}`, paddingTop: 8 }}>
                                  {note.file_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                                    <img src={note.file_url} alt="Evidencia" style={{ width: '100%', borderRadius: 8 }} onClick={() => window.open(note.file_url, '_blank')} />
                                  ) : (
                                    <a href={note.file_url} target="_blank" rel="noreferrer" style={{ color: isMe ? 'white' : '#2563eb', fontSize: 11, fontWeight: 700 }}>📎 Documento Adjunto</a>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 9, color: '#94a3b8' }}>
                                {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button 
                                onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                                style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                💬 {replyingTo === note.id ? 'Cancelar' : 'Responder'}
                              </button>
                            </div>
                          </div>

                          {/* Respuestas (hilos estilo WhatsApp) */}
                          {replies.length > 0 && (
                            <div style={{ marginLeft: 28, borderLeft: '2px solid #e2e8f0', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                              {replies.map(reply => {
                                const isReplyMe = reply.author_id === user?.id;
                                return (
                                  <div key={reply.id} style={{ 
                                    alignSelf: isReplyMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '90%'
                                  }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 1 }}>
                                      {reply.author_name}
                                    </div>
                                    <div style={{ 
                                      background: isReplyMe ? '#dbeafe' : '#f1f5f9', 
                                      color: '#1e293b',
                                      padding: '6px 10px', 
                                      borderRadius: 12, 
                                      fontSize: 12,
                                      border: '1px solid #e2e8f0',
                                      wordBreak: 'break-word'
                                    }}>
                                      {renderTextWithMentions(reply.texto)}
                                    </div>
                                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>
                                      {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Input de respuesta inline */}
                          {replyingTo === note.id && (
                            <div style={{ marginLeft: 28, display: 'flex', gap: 6, marginTop: 4 }}>
                              <input 
                                type="text"
                                placeholder="Escribir respuesta..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && replyText.trim() && submitReply(note.id)}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 12 }}
                                autoFocus
                              />
                              <button 
                                onClick={() => replyText.trim() && submitReply(note.id)}
                                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: '#3b82f6', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                Enviar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative' }}>
                  {/* Lista de Sugerencias @Cargo */}
                  {showSuggestions?.itemId === item.id && suggestions.length > 0 && (
                    <div style={{ 
                      position: 'absolute', bottom: '100%', left: 0, background: 'white', border: '1px solid #e2e8f0', 
                      borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: '100%', marginBottom: 8, maxHeight: 150, overflowY: 'auto' 
                    }}>
                      {suggestions.map((s, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            const textarea = document.getElementById(`note-input-${item.id}`);
                            const text = textarea.value;
                            const newVal = text.slice(0, text.lastIndexOf('@')) + `@${s.cargo} - ${s.nombre} `;
                            textarea.value = newVal;
                            setShowSuggestions(null);
                            textarea.focus();
                          }}
                          style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13 }}>
                          <span style={{ fontWeight: 800, color: '#2563eb' }}>{s.cargo}</span> <span style={{ color: '#64748b' }}>- {s.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <textarea 
                      placeholder="Usa @ para delegar un Cargo..." 
                      id={`note-input-${item.id}`}
                      rows={1}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = (e.target.scrollHeight) + 'px';
                        
                        const val = e.target.value;
                        const lastChar = val[val.length - 1];
                        if (lastChar === '@') {
                          const results = getCargosByChannel(item.proyecto_id, globalScope);
                          setSuggestions(results);
                          setShowSuggestions({ itemId: item.id });
                        } else if (val.includes('@') && !val.slice(val.lastIndexOf('@')).includes(' ')) {
                          const filter = val.slice(val.lastIndexOf('@') + 1).toLowerCase();
                          const results = getCargosByChannel(item.proyecto_id, globalScope)
                            .filter(s => s.cargo.toLowerCase().includes(filter) || s.nombre.toLowerCase().includes(filter));
                          setSuggestions(results);
                          setShowSuggestions({ itemId: item.id });
                        } else {
                          setShowSuggestions(null);
                        }
                      }}
                      style={{ 
                        width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', 
                        fontSize: 14, resize: 'none', maxHeight: 100, display: 'block' 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const val = e.target.value;
                          if (!val) return;
                          submitNote(item, val);
                          e.target.value = '';
                          e.target.style.height = 'auto';
                          setShowSuggestions(null);
                        }
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <label style={{ 
                      background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', width: 40, height: 40, 
                      borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 
                    }}>
                      📎
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          try {
                            const url = await storageService.uploadFile('chat_attachments', file);
                            submitNote(item, `Adjunto: ${file.name}`, url);
                          } catch (err) {
                            alert('Error al subir archivo');
                          }
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => {
                        const input = document.getElementById(`note-input-${item.id}`);
                        if (input && input.value) {
                          submitNote(item, input.value);
                          input.value = '';
                          input.style.height = 'auto';
                          setShowSuggestions(null);
                        }
                      }}
                      style={{ background: '#2563eb', color: 'white', border: 'none', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      ➢
                    </button>
                  </div>
                </div>
              </div>}
              </div>
              </div>)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBodega = () => { /* Compressed Cuadrilla logic */
    const myName = user?.user_metadata?.nombre || '';
    const projectIds = [...new Set(misItems.map(i => i.proyecto_id))];
    const bodegas = state.bodegas.filter(b => projectIds.includes(b.proyecto_id));
    
    const misSolicitudes = state.inventario.filter(t => {
      if (t.tipo !== 'SALIDA') return false;
      const sol = t.solicitante?.toLowerCase();
      return sol === cuadrillaId.toLowerCase() || sol === myName.toLowerCase();
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    const calculateStock = (insumoId, bId) => state.inventario.filter(t => t.insumo_id === insumoId && t.bodega_id === bId && t.estado !== 'RECHAZADO').reduce((s, t) => { 
      // Si es una salida pendiente de aprobación (solicitud), no descuenta del stock real de bodega aún, 
      // pero aquí sumamos/restamos según el estado aprobado para ver disponibilidad real.
      if (t.tipo === 'SALIDA' && t.estado !== 'APROBADO') return s; 
      return s + (t.tipo === 'ENTRADA' ? Number(t.cantidad) : -Number(t.cantidad)); 
    }, 0);
    
    const materialsWithStock = state.insumos.map(insumo => {
      const stocks = bodegas.map(b => ({ bodega: b, stock: calculateStock(insumo.id, b.id) })).filter(s => s.stock > 0);
      return stocks.length > 0 ? { insumo, stocks } : null;
    }).filter(Boolean);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {materialsWithStock.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
            <div style={{ fontWeight: 700, color: '#64748b' }}>Sin materiales en bodega</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>No hay insumos con stock disponible para tus proyectos asignados.</div>
          </div>
        )}

        {materialsWithStock.map(({ insumo, stocks }) => ( // Use the filtered list
          <div key={insumo.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, margin: '0 0 12px 0', fontWeight: 700 }}>{insumo.nombre}</h3>
            {stocks.map(s => (
              <div key={s.bodega.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.bodega.nombre}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Disp: {s.stock.toFixed(2)} {insumo.unidad}</div>
                </div>
                <button 
                  onClick={() => {
                    const qty = prompt(`Cantidad a solicitar (Máx: ${s.stock})`);
                    if (qty && Number(qty)>0 && Number(qty)<=s.stock) {
                      dispatch({ type: 'ADD_INVENTARIO_MOV', payload: { bodega_id: s.bodega.id, insumo_id: insumo.id, tipo: 'SALIDA', cantidad: Number(qty), motivo: 'Solicitud móvil', solicitante: cuadrillaId, estado: 'PENDIENTE' }});
                      alert('✅ Solicitud enviada al Almacenista.');
                    }
                  }}
                  style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>SOLICITAR</button>
              </div>
            ))}
          </div>
        ))}

        {misSolicitudes.length > 0 && (
          <div style={{ marginTop: 24, borderTop: '2px dashed #cbd5e1', paddingTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Mis Solicitudes de Estado</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {misSolicitudes.map(sol => {
                const ins = state.insumos.find(i => i.id === sol.insumo_id);
                return (
                  <div key={sol.id} style={{ background: 'white', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <div><div style={{ fontWeight: 600 }}>{ins?.nombre}</div><div style={{ fontSize: 11 }}>{sol.cantidad} {ins?.unidad}</div></div>
                    <div style={{ fontSize: 11, fontWeight: 700, padding: 6, borderRadius: 6, background: sol.estado === 'PENDIENTE' ? '#fef3c7' : sol.estado === 'APROBADO' ? '#dcfce3' : '#fee2e2' }}>
                      {sol.estado || 'APROBADO'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 80 }}>
      {showScanner && <BarcodeScanner onResult={handleScanCode} onCancel={() => setShowScanner(false)} />}
      
      {/* Modal Asistencia Mejorada (Foto + Descripción) */}
      {showAsistenciaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: asistenciaType === 'LLEGADA' ? '#10b981' : '#ef4444' }}>
              {asistenciaType === 'LLEGADA' ? '☀️ Registrar Llegada' : '🌙 Registrar Salida'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Por favor captura una fotografía y describe brevemente el estado actual.</p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Fotografía de Evidencia</label>
              <div 
                onClick={() => document.getElementById('camera-input').click()}
                style={{ height: 160, border: '2px dashed #e2e8f0', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', overflow: 'hidden', background: asistenciaFile ? '#f8fafc' : 'white' }}>
                {asistenciaFile ? (
                  <img src={URL.createObjectURL(asistenciaFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                ) : (
                  <>
                    <span style={{ fontSize: 32 }}>📸</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Pulsa para abrir cámara</span>
                  </>
                )}
              </div>
              <input type="file" id="camera-input" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setAsistenciaFile(e.target.files[0])} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Descripción / Nota (Opcional)</label>
              <textarea 
                placeholder="Escribe algo sobre el inicio/fin de jornada..." 
                style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, height: 80, resize: 'none' }}
                value={asistenciaComment}
                onChange={e => setAsistenciaComment(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button 
                disabled={isUploadingAsistencia}
                onClick={() => setShowAsistenciaModal(false)} 
                style={{ padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
              <button 
                disabled={isUploadingAsistencia || !asistenciaFile}
                onClick={submitAsistencia}
                style={{ padding: 14, borderRadius: 12, border: 'none', background: asistenciaType === 'LLEGADA' ? '#10b981' : '#ef4444', color: 'white', fontWeight: 700, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {isUploadingAsistencia ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reportar Avance (Nueva Experiencia Multimedia) */}
      {showAvanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', maxHeight: '95vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>🚀 Reportar Avance Técnico</h3>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{avanceCurrentProg} / {avanceTotalQty} {avanceUnit} Acumulados</div>
              </div>
              <button onClick={() => setShowAvanceModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 16, color: '#64748b' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 20, border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'block', textAlign: 'center' }}>¿CUÁNTO SE AVANZÓ HOY? ({avanceUnit})</label>
              <input 
                type="number" 
                placeholder={`0.00 ${avanceUnit}`}
                style={{ width: '100%', padding: '12px', borderRadius: 16, border: 'none', fontSize: 32, fontWeight: 800, textAlign: 'center', background: 'transparent' }}
                value={avanceQty}
                onChange={e => setAvanceQty(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Comentario de Campo</label>
              <textarea 
                placeholder="Describe qué se hizo hoy..."
                style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid #e2e8f0', fontSize: 14, minHeight: 80, resize: 'none' }}
                value={avanceComment}
                onChange={e => setAvanceComment(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Evidencia Fotográfica</label>
              <label style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px', 
                border: '2px dashed #cbd5e1', borderRadius: 20, cursor: 'pointer', background: avanceFile ? '#f0fdf4' : '#f8fafc',
                transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden', minHeight: 120
              }}>
                {avanceFile ? (
                  <img src={URL.createObjectURL(avanceFile)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} alt="" />
                ) : null}
                <div style={{ fontSize: 28, position: 'relative' }}>{avanceFile ? '📸' : '📷'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: avanceFile ? '#166534' : '#64748b', position: 'relative' }}>
                  {avanceFile ? 'Imagen capturada' : 'Tomar o subir foto'}
                </div>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setAvanceFile(e.target.files[0])} />
              </label>
            </div>

            <button 
              disabled={isUploadingAvance || !avanceQty}
              onClick={submitAvance}
              style={{ 
                width: '100%', padding: '16px', borderRadius: 16, border: 'none', 
                background: isUploadingAvance || !avanceQty ? '#cbd5e1' : '#3b82f6', 
                color: 'white', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              {isUploadingAvance ? 'Enviando reporte...' : '🚀 Guardar Avance Técnico'}
            </button>
          </div>
        </div>
      )}

      {/* Panel de Supervisión Detallada (Dashboard Estilo Trello) */}
      {supervisionItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          {/* Header Dashboard */}
          <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#3b82f6', color: 'white', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestión Técnica - Activity Hub</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{state.apus.find(a => a.id === supervisionItem.apu_id)?.nombre}</div>
              </div>
            </div>
            <button 
              onClick={() => setSupervisionItem(null)} 
              style={{ background: '#f1f5f9', border: 'none', width: 40, height: 40, borderRadius: 20, fontSize: 20, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc' }}>
            {(() => {
              const itemId = supervisionItem.id;
              const activeScope = supervisionScope;
              const isCuadrilla = activeScope.startsWith('CUAD_');
              const crewIdx = isCuadrilla ? parseInt(activeScope.split('_')[1]) : null;

              // 1. Filtrar Personal Asignado por Canal
              const personalAsignado = state.personalProyecto
                .filter(ap => ap.presupuesto_item_id === itemId && (isCuadrilla ? ap.cuadrilla_idx === crewIdx : true))
                .map(ap => {
                  const p = state.personal.find(pers => pers.id === ap.personal_id);
                  return { ...ap, persona: p };
                });

              const asistencias = state.controlAsistencia?.filter(a => a.presupuesto_item_id === itemId && (isCuadrilla ? a.cuadrilla_id === cuadrillaId : true)) || [];
              const avances = state.avances?.filter(a => a.presupuesto_item_id === itemId && a.meta?.scope === activeScope) || [];

              const isSupervisorModal = (normalizedRole === 'admin' || normalizedRole === 'operativo' || myAssignments.some(ap => ap.proyecto_id === supervisionItem.proyecto_id && ap.unidad_pactada === 'SUPERVISOR'));

              const timeline = [
                ...asistencias.map(a => ({ ...a, eventType: 'ASISTENCIA' })), 
                ...avances.map(a => ({ ...a, eventType: 'AVANCE' })),
                // Solo notas operativas: tech_report, activity (checklist), o notas con checklist_item_id
                // Los mensajes de chat libre NO aparecen aquí
                ...((state.notas || []).filter(n => 
                  n.presupuesto_item_id === itemId && 
                  n.meta?.scope === activeScope && 
                  !n.parent_id && 
                  (n.meta?.type === 'tech_report' || n.meta?.type === 'activity' || n.checklist_item_id)
                ))
              ].sort((a,b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* SECCIÓN 0: GESTIÓN TÉCNICA (Checklist y Docs) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
                    {/* Columna Checklist */}
                    <section style={{ background: 'white', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📝</span>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Checklist Técnico</h4>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: 8 }}>
                          {(() => {
                             const info = progressMap[itemId];
                             const technicalPct = info?.technicalContribution || 0;
                             const totalChecklistWeight = info?.checklistTotalWeight || 0;
                             const displayPct = totalChecklistWeight > 0 ? Math.round((technicalPct / totalChecklistWeight) * 100) : 0;
                             return `Ponderado: ${technicalPct.toFixed(1)}% / ${totalChecklistWeight}% (${displayPct}%)`;
                          })()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Input Nueva Tarea - ACCESIBLE PARA TODOS */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input 
                            type="text" 
                            placeholder="Nueva tarea de control..." 
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                            value={newChecklistItem}
                            onChange={e => setNewChecklistItem(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(itemId)}
                          />
                          <button 
                            onClick={() => handleAddChecklistItem(itemId)}
                            style={{ padding: '0 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 18 }}>+</button>
                        </div>

                        {/* Lista de Ítems */}
                        {(state.itemChecklistItems?.filter(it => it.presupuesto_item_id === itemId && it.estado_aprobacion !== 'RECHAZADO') || []).map(it => {
                          const isApproved = it.estado_aprobacion === 'APROBADO';
                          const isPending = !it.estado_aprobacion || it.estado_aprobacion === 'PENDIENTE';
                          const isSolicitado = it.estado_aprobacion === 'SOLICITADO';
                          const avancePct = Number(it.porcentaje_avance) || 0;
                          const isComplete = avancePct >= 100;
                          
                          return (
                            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isComplete ? '#f0fdf4' : (isApproved ? '#fafffe' : (isSolicitado ? '#fffbeb' : '#f8fafc')), borderRadius: 12, border: `1px solid ${isComplete ? '#bbf7d0' : (isApproved ? '#a7f3d0' : (isSolicitado ? '#fef3c7' : '#e2e8f0'))}`, transition: 'all 0.2s' }}>
                              <div 
                                onClick={() => handleToggleChecklistItem(it)}
                                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isComplete ? '#10b981' : (isApproved ? '#34d399' : '#cbd5e1')}`, background: isComplete ? '#10b981' : (isApproved ? '#ecfdf5' : 'white'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isApproved ? 'pointer' : 'default', flexShrink: 0, opacity: isApproved ? 1 : 0.5 }}>
                                {isComplete && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
                                {isSolicitado && <span style={{ color: '#f59e0b', fontSize: 14 }}>⏳</span>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isComplete ? '#065f46' : '#1e293b', textDecoration: isComplete ? 'line-through' : 'none' }}>{it.texto}</div>
                                {isPending && <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>🔒 PENDIENTE DE APROBACIÓN</div>}
                                {isSolicitado && <div style={{ fontSize: 9, color: '#d97706', fontWeight: 700 }}>⏳ REPORTE PENDIENTE DE REVISIÓN</div>}
                                {isApproved && avancePct > 0 && avancePct < 100 && (
                                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${avancePct}%`, height: '100%', background: '#22c55e', borderRadius: 3, transition: 'width 0.5s' }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#22c55e' }}>{avancePct}%</span>
                                  </div>
                                )}
                                {isApproved && avancePct === 0 && <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>✅ APROBADO — Listo para reportar avance</div>}
                              </div>
                              {/* Botones Aprobar/Rechazar inline para supervisores */}
                              {isSupervisorModal && isPending && (
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: it.id, changes: { estado_aprobacion: 'APROBADO' } } }); }}
                                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                    ✅ Aprobar
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: it.id, changes: { estado_aprobacion: 'RECHAZADO' } } }); }}
                                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                    ❌
                                  </button>
                                </div>
                              )}
                              {/* Input de PESO % para Supervisores */}
                              {isSupervisorModal && isApproved && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input 
                                    type="number" 
                                    value={it.porcentaje_peso || 0}
                                    onChange={(e) => handleUpdateChecklistWeight(it.id, e.target.value)}
                                    style={{ width: 45, padding: '4px', textAlign: 'center', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 800, color: '#3b82f6' }}
                                  />
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>%</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Columna Documentos */}
                    <section style={{ background: 'white', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📎</span>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Documentos</h4>
                        </div>
                        <label style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', cursor: 'pointer' }}>
                          + Subir
                          <input type="file" style={{ display: 'none' }} onChange={e => handleAddDocument(itemId, e.target.files[0])} />
                        </label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(state.itemDocuments?.filter(d => d.presupuesto_item_id === itemId) || []).map(doc => (
                          <a href={doc.file_url} target="_blank" rel="noreferrer" key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f1f5f9', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ width: 32, height: 32, background: '#cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{doc.tipo || 'PDF'}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                          </a>
                        ))}
                      </div>
                    </section>
                  </div>
                  
                  {/* SECCIÓN 1: MI EQUIPO DIRECTO (Según Canal) */}
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>👥</span>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                        {isCuadrilla ? `Equipo: Cuadrilla A-${crewIdx + 1}` : 'Personal Supervisión'}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, paddingLeft: 4 }}>
                      {(() => {
                        // Corrección de filtrado: Buscamos por proyecto y canal, evitando duplicados
                        const uniqueMap = new Map();
                        state.personalProyecto
                          .filter(ap => 
                            ap.proyecto_id === supervisionItem.proyecto_id && 
                            (isCuadrilla ? (ap.cuadrilla_idx === crewIdx && ap.unidad_pactada !== 'SUPERVISOR') : ap.unidad_pactada === 'SUPERVISOR')
                          )
                          .forEach(ap => {
                            if (!uniqueMap.has(ap.personal_id)) {
                              uniqueMap.set(ap.personal_id, {
                                ...ap,
                                persona: state.personal.find(p => p.id === ap.personal_id)
                              });
                            }
                          });

                        const integrantes = Array.from(uniqueMap.values());

                        if (integrantes.length === 0) {
                          return <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic', padding: 12 }}>Sin personal asignado en este canal.</div>;
                        }

                        return integrantes.map((asig, idx) => (
                          <div key={idx} style={{ flexShrink: 0, width: 80, textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#eff6ff', border: '3px solid #e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 6px', overflow: 'hidden' }}>
                              {asig.persona?.foto_url ? <img src={asig.persona.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asig.persona?.nombres || asig.persona?.nombre || 'Miembro'}</div>
                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{state.cargos.find(c => c.id === asig.cargo_id)?.nombre || 'Operario'}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </section>

                  {/* SECCIÓN 2: DASHBOARD DE RENDIMIENTO (EXCLUSIVO SUPERVISORES) */}
                  {isSupervisorModal && (
                    <section style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>📈</span>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Rendimiento del Canal</h4>
                    </div>
                    {(() => {
                      const numCrews = Math.max(Number(supervisionItem.num_cuadrillas) || 1, 1);
                      const targetQty = (Number(supervisionItem.cantidad) || 0) / numCrews;
                      const apuId = supervisionItem.apu_id;
                      const apu = state.apus.find(a => a.id === apuId);
                      
                      const totalBudgetMO = calcularCostoMO(apuId) * (Number(supervisionItem.cantidad) || 0);
                      const targetCost = totalBudgetMO / numCrews;
                      
                      const executedQty = avances
                        .filter(a => a.estado === 'APROBADO')
                        .reduce((acc, a) => acc + (Number(a.cantidad_incremental) || 0), 0);
                      const executedCost = (totalBudgetMO / (Number(supervisionItem.cantidad) || 1)) * executedQty;
                      
                      const qtyPct = Math.min((executedQty / targetQty) * 100, 100) || 0;
                      const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Meta Canal ({apu?.unidad})</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{targetQty.toFixed(2)}</div>
                              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Ejecutado: {executedQty.toFixed(2)}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Presupuesto Canal</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{fmt(targetCost)}</div>
                              <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Ganado: {fmt(executedCost)}</div>
                            </div>
                          </div>
                          
                          <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ height: '100%', width: `${qtyPct}%`, background: '#22c55e', transition: 'width 0.8s' }}></div>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: qtyPct > 50 ? 'white' : '#1e3a8a' }}>
                              CUMPLIMIENTO: {qtyPct.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    </section>
                  )}

                  {/* SECCIÓN 2: HISTORIAL DE ACTIVIDAD (Cronológico) */}
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>📜</span>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Historial Operativo</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {timeline.map((event, idx) => {
                        const isAvance = event.eventType === 'AVANCE';
                        const timeStr = new Date(event.created_at || event.date).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        const status = event.estado || event.status || 'PENDIENTE';
                        
                        return (
                          <div key={idx} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', opacity: (status === 'RECHAZADO' || status === 'Revisado') ? 0.6 : 1 }}>
                            <div style={{ padding: '12px 16px', display: 'flex', gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: isAvance ? '#eff6ff' : (event.meta?.type === 'tech_report' || event.checklist_item_id) ? '#eef2ff' : (event.tipo === 'LLEGADA' ? '#f0fdf4' : (event.tipo === 'SALIDA' ? '#fff1f2' : '#f8fafc')), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                {isAvance ? '🚀' : (event.meta?.type === 'tech_report' || event.checklist_item_id) ? '📋' : (event.tipo === 'LLEGADA' ? '☀️' : (event.tipo === 'SALIDA' ? '🌙' : '💬'))}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                                    {(() => {
                                      const text = (event.texto || event.comentario || '').toUpperCase();
                                      const type = event.tipo?.toUpperCase();
                                      if (isAvance || event.eventType === 'AVANCE') return `🚀 Avance Físico (+${event.cantidad_incremental})`;
                                      if (type === 'LLEGADA' || text.includes('ASISTENCIA') || text.includes('LLEGADA')) return '☀️ Ingreso de Personal';
                                      if (type === 'SALIDA' || text.includes('SALIDA')) return '🌙 Salida de Personal';
                                      if (event.meta?.type === 'tech_report' || event.checklist_item_id) return '📋 Avance de Checklist';
                                      return '💬 Nota de Campo';
                                    })()}
                                    <span style={{ 
                                      marginLeft: 8, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900,
                                      background: (status === 'APROBADO' || status === 'Aprobado' || status === 'APPROVED') ? '#dcfce7' : (status === 'RECHAZADO' || status === 'Rechazado' || status === 'ERROR') ? '#fee2e2' : '#fef9c3',
                                      color: (status === 'APROBADO' || status === 'Aprobado' || status === 'APPROVED') ? '#166534' : (status === 'RECHAZADO' || status === 'Rechazado' || status === 'ERROR') ? '#991b1b' : '#854d0e',
                                      textTransform: 'uppercase'
                                    }}>
                                      {status}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{timeStr}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, whiteSpace: 'pre-wrap' }}>{event.comentario || event.texto || (isAvance ? 'Actividad física realizada' : 'Registro de asistencia')}</div>
                                {event.author_name && <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>✍️ {event.author_name}</div>}
                                
                                {(event.foto_url || event.file_url) && (
                                  <img src={event.foto_url || event.file_url} alt="Evidencia" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, marginTop: 10, border: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => window.open(event.foto_url || event.file_url, '_blank')} />
                                )}

                                {(() => {
                                  const text = (event.texto || event.comentario || '').toUpperCase();
                                  const type = event.tipo?.toUpperCase();
                                  const isOperationalEvent = isAvance || event.eventType === 'AVANCE' || type === 'LLEGADA' || text.includes('ASISTENCIA') || text.includes('LLEGADA') || type === 'SALIDA' || text.includes('SALIDA') || event.meta?.type === 'tech_report' || event.checklist_item_id;
                                  
                                  return isSupervisorModal && (status === 'PENDIENTE' || status === 'SOLICITADO' || status === 'Recibido') && isOperationalEvent && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          if (isAvance) {
                                            await obraAvancesService.update(event.id, { estado: 'RECHAZADO' });
                                            dispatch({ type: 'UPDATE_AVANCE', payload: { id: event.id, changes: { estado: 'RECHAZADO' } } });
                                          } else if (event.eventType === 'ASISTENCIA' || event.tipo === 'LLEGADA' || event.tipo === 'SALIDA') {
                                            await asistenciaService.update(event.id, { estado: 'RECHAZADO' });
                                            dispatch({ type: 'UPDATE_ASISTENCIA', payload: { id: event.id, changes: { estado: 'RECHAZADO' } } });
                                          } else {
                                            dispatch({ type: 'UPDATE_NOTE', payload: { id: event.id, changes: { status: 'Revisado' } } });
                                            // Rechazar un REPORTE no afecta el ítem del checklist.
                                            // El ítem sigue aprobado y se puede enviar otro reporte.
                                          }
                                        } catch (err) { alert(`Error: ${err.message}`); }
                                      }}
                                      style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                      Rechazar
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          if (isAvance) {
                                            await obraAvancesService.update(event.id, { estado: 'APROBADO' });
                                            dispatch({ type: 'UPDATE_AVANCE', payload: { id: event.id, changes: { estado: 'APROBADO' } } });
                                          } else if (event.eventType === 'ASISTENCIA' || event.tipo === 'LLEGADA' || event.tipo === 'SALIDA') {
                                            await asistenciaService.update(event.id, { estado: 'APROBADO' });
                                            dispatch({ type: 'UPDATE_ASISTENCIA', payload: { id: event.id, changes: { estado: 'APROBADO' } } });
                                          } else {
                                            dispatch({ type: 'UPDATE_NOTE', payload: { id: event.id, changes: { status: 'Aprobado' } } });
                                            // Si la nota tiene porcentaje reportado, actualizar el checklist item
                                            if (event.checklist_item_id) {
                                              const reportedPct = Number(event.meta?.porcentaje) || 0;
                                              dispatch({
                                                type: 'UPDATE_CHECKLIST_ITEM',
                                                payload: { id: event.checklist_item_id, changes: { 
                                                  porcentaje_avance: reportedPct,
                                                  completado: reportedPct >= 100
                                                }}
                                              });
                                            }
                                          }
                                        } catch (err) { alert(`Error: ${err.message}`); }
                                      }}
                                      style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#22c55e', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                      Aprobar
                                    </button>
                                    </div>
                                  );
                                })()}

                                {/* HILOS DE CONVERSACIÓN (EXCLUSIVO SUPERVISORES) */}
                                {isSupervisorModal && (() => {
                                  const replies = state.notas?.filter(n => n.parent_id === event.id) || [];
                                  return (
                                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                                      {replies.map(r => (
                                        <div key={r.id} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 10 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>{r.author_name}</span>
                                            <span style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{r.texto}</div>
                                        </div>
                                      ))}
                                      {replyingTo === event.id && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                          <input 
                                            type="text" 
                                            placeholder="Escribe una respuesta técnica..." 
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 11 }}
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && submitReply(event.id)}
                                          />
                                          <button onClick={() => submitReply(event.id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 12_px', borderRadius: 10, fontWeight: 700, fontSize: 11 }}>Enviar</button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {timeline.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20, border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Sin movimientos hoy</div>
                          <div style={{ fontSize: 11 }}>Los reportes de llegada, salida y avance aparecerán aquí.</div>
                        </div>
                      )}
                    </div>
                  </section>

                </div>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Modal de Reporte Técnico (Auditoría con Foto) */}
      {showTechnicalReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Reporte de Avance de Actividad</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{reportingItem?.texto}</p>
              <div style={{ marginTop: 12, display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, border: '1px solid #bfdbfe' }}>
                🎯 Peso en la Actividad: {reportingItem?.porcentaje_peso || 0}%
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Porcentaje de avance */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📊 Porcentaje Ejecutado</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="range" 
                    min="0" max="100" step="5"
                    value={technicalReportPct}
                    onChange={e => setTechnicalReportPct(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input 
                      type="number" 
                      min="0" max="100"
                      value={technicalReportPct}
                      onChange={e => setTechnicalReportPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      style={{ width: 50, padding: '6px', textAlign: 'center', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 16, fontWeight: 800, color: '#3b82f6' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>%</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${technicalReportPct}%`, height: '100%', background: technicalReportPct >= 100 ? '#22c55e' : '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>📸 Foto de Evidencia (Obligatoria)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={e => setTechnicalReportFile(e.target.files[0])}
                  style={{ width: '100%', padding: '12px', border: '2px dashed #cbd5e1', borderRadius: 12, fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>💬 Comentarios adicionales</label>
                <textarea 
                  placeholder="Detalles sobre el avance ejecutado..." 
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13, minHeight: 60 }}
                  value={technicalReportComment}
                  onChange={e => setTechnicalReportComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  onClick={() => setShowTechnicalReportModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button 
                  onClick={submitTechnicalReport}
                  disabled={isSubmittingReport}
                  style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  {isSubmittingReport ? 'Enviando...' : `📋 Reportar ${technicalReportPct}%`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cobro */}
      {showCobroModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zFilter: 1100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Solicitar Pago</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Estás a punto de solicitar el cobro de tus actividades reportadas en este mes.</p>
            </div>
            
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Monto a Solicitar</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#6366f1' }}>
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monthlyStats.totalEarned)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowCobroModal(false)}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#64748b' }}>
                Cancelar
              </button>
              <button 
                onClick={() => {
                  dispatch({ type: 'ADD_NOTE', payload: {
                    presupuesto_item_id: null,
                    texto: `💸 SOLICITUD DE COBRO:\n• Monto: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(monthlyStats.totalEarned)}\n• Beneficiario: ${myProfile?.nombres || myProfile?.nombre}\n• Estado: PENDIENTE_REVISION`,
                    status: 'Recibido',
                    author_id: myProfile?.id,
                    assigned_to: 'admin',
                    created_at: new Date().toISOString()
                  }});
                  alert('✅ Solicitud enviada a Administración. Recibirás una notificación cuando sea procesada.');
                  setShowCobroModal(false);
                }}
                style={{ flex: 1.5, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', fontWeight: 800, boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}
      {showInoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>Registro Rápido</h3>
            <select style={{ width: '100%', padding: 12, marginBottom: 12 }} value={inoutType} onChange={e => {
              setInoutType(e.target.value);
              setDistribuidor('');
            }}>
              <option value="ENTRADA">ENTRADA (Bodega Recibe)</option>
              <option value="SALIDA">SALIDA (Consumo directo)</option>
            </select>
            <select style={{ width: '100%', padding: 12, marginBottom: 12 }} value={selectedInsumoId} onChange={e => setSelectedInsumoId(e.target.value)}>
              <option value="">Buscar Insumo...</option>
              {state.insumos.map(i => <option key={i.id} value={i.id}>{i.codigo} - {i.nombre}</option>)}
            </select>
            <input type="number" placeholder="Cantidad" style={{ width: '100%', padding: 12, marginBottom: 12 }} value={qty} onChange={e => setQty(e.target.value)} />
            
            {inoutType === 'SALIDA' ? (
              <>
                <select style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }} value={distribuidor} onChange={e => setDistribuidor(e.target.value)}>
                  <option value="">Seleccionar Tarea / APU...</option>
                  <optgroup label="APU Básicos">
                    {state.presupuestoItems
                      .filter(pi => !selectedProyectoId || pi.proyecto_id === selectedProyectoId)
                      .map(pi => {
                        const apu = state.apus.find(a => a.id === pi.apu_id);
                        if (!apu || apu.tipo !== 'BASICO') return null;
                        return <option key={pi.id} value={pi.id}>{apu.codigo} — {apu.nombre} ({apu.unidad})</option>;
                      })}
                  </optgroup>
                  <optgroup label="APU Compuestos">
                    {state.presupuestoItems
                      .filter(pi => !selectedProyectoId || pi.proyecto_id === selectedProyectoId)
                      .map(pi => {
                        const apu = state.apus.find(a => a.id === pi.apu_id);
                        if (!apu || apu.tipo !== 'COMPUESTO') return null;
                        return <option key={pi.id} value={pi.id}>{apu.codigo} — {apu.nombre} ({apu.unidad})</option>;
                      })}
                  </optgroup>
                </select>
                <input type="text" placeholder="Motivo / Responsable / Notas extra..." style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }} value={motivo} onChange={e => setMotivo(e.target.value)} />
              </>
            ) : (
              <>
                <input type="text" placeholder="Distribuidor / Reingreso por (Opcional)" style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }} value={distribuidor} onChange={e => setDistribuidor(e.target.value)} />
                <input type="number" placeholder="Costo Unitario Real ($)" style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }} value={costoReal} onChange={e => setCostoReal(e.target.value)} />
                <input type="text" placeholder="Motivo / N° de Remisión / Factura" style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }} value={motivo} onChange={e => setMotivo(e.target.value)} />
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>¿Tienes factura física impresa?</span><br/>
                  <button onClick={() => { setShowInoutModal(false); setShowAIModal(true); }} style={{ background: '#f8fafc', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 8, padding: '8px 16px', marginTop: 8, fontWeight: 600, fontSize: 13 }}>
                    🤖 Lector Automático (IA)
                  </button>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button onClick={() => setShowInoutModal(false)} style={{ flex: 1, padding: 12, border: '1px solid #ccc', background: 'white', borderRadius: 8 }}>Cancelar</button>
              <button onClick={handleInout} style={{ flex: 1, padding: 12, background: '#10b981', color: 'white', border: 'none', borderRadius: 8 }}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal AI */}
      {showAIModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', overflowY:'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, padding: 20, marginTop: 40 }}>
            <h3 style={{ marginTop: 0 }}>🤖 Cargar Factura (Foto)</h3>
            {!aiResult ? (
              <div style={{ textAlign: 'center' }}>
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} style={{ display: 'block', margin: '20px auto' }} />
                <button onClick={handleProcessAI} disabled={isProcessingAI || !selectedFile} style={{ width:'100%', padding: 14, background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none', fontWeight: 700 }}>
                  {isProcessingAI ? 'Procesando con IA...' : 'Analizar Imagen'}
                </button>
              </div>
            ) : (
              <div>
                <p><strong>Proveedor:</strong> {aiResult.distribuidor}</p>
                {aiResult.items.map((it, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: 8, marginBottom: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>IA Leyó: {it.nombre_detectado}</div>
                    <div style={{ fontWeight: 700 }}>Detectado: {state.insumos.find(i => i.id === it.mapped_insumo)?.nombre || 'No emparejado'}</div>
                    <div style={{ fontSize: 12 }}>{it.cantidad} unds | ${it.costo_unitario} c/u</div>
                  </div>
                ))}
                <button onClick={handleImportAI} disabled={isProcessingAI} style={{ width:'100%', padding: 14, background: '#10b981', color: 'white', borderRadius: 8, border: 'none', fontWeight: 700, marginTop: 16 }}>
                  {isProcessingAI ? 'Subiendo...' : 'Ingresar a Inventario de Bodega'}
                </button>
              </div>
            )}
            <button onClick={() => { setShowAIModal(false); setAiResult(null); }} style={{ width:'100%', marginTop: 12, padding: 14, background: 'transparent', color: '#64748b', border: 'none' }}>❌ Cancelar</button>
          </div>
        </div>
      )}
      {/* Modal Mi Perfil */}
      {showProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Perfil de Cargo</h3>
                <button onClick={() => { setShowProfile(false); setProfileEditing(null); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
            {myProfile ? (() => {
              const cargo = state.cargos.find(c => c.id === myProfile.cargo_id);
              const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
              const factorSmlv = myProfile.salario_base ? (myProfile.salario_base / smlv).toFixed(2) : '—';
              const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
              const isEditing = !!profileEditing;
              const hasChange = (field) => isEditing && profileEditing[field] !== undefined && profileEditing[field] !== (myProfile[field] || '');
              const fieldStyle = (field) => ({
                fontSize: 14, fontWeight: 600,
                color: hasChange(field) ? '#6366f1' : '#1e293b',
                opacity: hasChange(field) ? 0.7 : 1,
                fontStyle: hasChange(field) ? 'italic' : 'normal'
              });
              const displayVal = (field, fallback) => isEditing && profileEditing[field] !== undefined ? profileEditing[field] : (myProfile[field] || fallback || '—');

              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Cabecera */}
                <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, overflow: 'hidden', border: '3px solid #e0e7ff' }}>
                    {myProfile.foto_url ? <img src={myProfile.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : '👤'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{myProfile.nombres || myProfile.nombre} {myProfile.apellidos || ''}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{myProfile.email}</div>
                  <div style={{ marginTop: 6, display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#6366f1' }}>
                    {APP_ROLE_LABELS[normalizedRole] || normalizedRole || 'Sin rol'}
                  </div>
                </div>

                {/* Información Básica */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cargo</div>
                    {isEditing ? (
                      <input type="text" value={displayVal('profesion', cargo?.nombre)} onChange={e => setProfileEditing(p => ({...p, profesion: e.target.value}))} style={{ width: '100%', border: '1px solid #e0e7ff', borderRadius: 6, padding: '6px 8px', fontSize: 13, fontWeight: 600, color: hasChange('profesion') ? '#6366f1' : '#1e293b', opacity: hasChange('profesion') ? 0.7 : 1 }} />
                    ) : (
                      <div style={fieldStyle('profesion')}>{myProfile.profesion || cargo?.nombre || '—'}</div>
                    )}
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Rol de Aplicación</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{APP_ROLE_LABELS[normalizedRole] || '—'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cédula</div>
                    {isEditing ? (
                      <input type="text" value={displayVal('cedula')} onChange={e => setProfileEditing(p => ({...p, cedula: e.target.value}))} style={{ width: '100%', border: '1px solid #e0e7ff', borderRadius: 6, padding: '6px 8px', fontSize: 13, fontWeight: 600, color: hasChange('cedula') ? '#6366f1' : '#1e293b', opacity: hasChange('cedula') ? 0.7 : 1 }} />
                    ) : (
                      <div style={fieldStyle('cedula')}>{myProfile.cedula || '—'}</div>
                    )}
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Unidad de Pago</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{myProfile.unidad_pago || 'Mes'}</div>
                  </div>
                </div>

                {/* Salarios */}
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Información Salarial</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'linear-gradient(135deg, #eef2ff 0%, #f0f0ff 100%)', padding: 16, borderRadius: 12, border: '1px solid #e0e7ff' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>SALARIO BASE</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{myProfile.salario_base ? fmt(myProfile.salario_base) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>FACTOR SMLV</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{factorSmlv}x</div>
                    </div>
                  </div>
                </div>

                {/* Proyectos */}
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Proyectos Asignados</div>
                  {(() => {
                    const projectMap = new Map();
                    state.personalProyecto
                      .filter(ap => ap.personal_id === myProfile.id)
                      .forEach(ap => {
                        const existing = projectMap.get(ap.proyecto_id);
                        if (!existing || ap.unidad_pactada === 'SUPERVISOR') {
                          projectMap.set(ap.proyecto_id, ap);
                        }
                      });
                    
                    const uniqueAssignments = Array.from(projectMap.values());
                    
                    if (uniqueAssignments.length === 0) {
                      return <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: 16 }}>Sin proyectos asignados aún</div>;
                    }
                    
                    return uniqueAssignments.map(ap => {
                      const proyecto = state.proyectos.find(p => p.id === ap.proyecto_id);
                      const isSup = ap.unidad_pactada === 'SUPERVISOR';
                      return (
                        <div key={ap.id} style={{ background: isSup ? '#eef2ff' : '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 6, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${isSup ? '#c7d2fe' : '#e2e8f0'}` }}>
                          <span style={{ fontSize: 16 }}>{isSup ? '🔑' : '🏗️'}</span>
                          <span style={{ flex: 1 }}>{proyecto?.nombre || 'Proyecto'}</span>
                          {isSup && <span style={{ fontSize: 9, color: '#6366f1', fontWeight: 700, background: '#eef2ff', padding: '2px 6px', borderRadius: 4 }}>SUPERVISOR</span>}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Documentos y Fotos */}
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Documentos y Fotos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
                        {myProfile.foto_url ? <img src={myProfile.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Foto de Perfil</div>
                        <div style={{ fontSize: 10, color: myProfile.foto_url ? '#10b981' : '#ef4444', fontWeight: 500 }}>{myProfile.foto_url ? '✓ Cargada' : '✕ No cargada'}</div>
                      </div>
                      {myProfile.foto_url && <a href={myProfile.foto_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', background: '#eef2ff', borderRadius: 6 }}>Ver</a>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🪪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Cédula</div>
                        <div style={{ fontSize: 10, color: myProfile.cedula_url ? '#10b981' : '#ef4444', fontWeight: 500 }}>{myProfile.cedula_url ? '✓ Cargado' : '✕ No cargado'}</div>
                      </div>
                      {myProfile.cedula_url && <a href={myProfile.cedula_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', background: '#eef2ff', borderRadius: 6 }}>Ver</a>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Tarjeta Profesional{myProfile.tp_numero ? ` — Nº ${myProfile.tp_numero}` : ''}</div>
                        <div style={{ fontSize: 10, color: myProfile.tp_url ? '#10b981' : '#ef4444', fontWeight: 500 }}>{myProfile.tp_url ? '✓ Cargado' : '✕ No cargado'}</div>
                      </div>
                      {myProfile.tp_url && <a href={myProfile.tp_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', background: '#eef2ff', borderRadius: 6 }}>Ver</a>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Certificaciones / ARL</div>
                        <div style={{ fontSize: 10, color: myProfile.arl_url ? '#10b981' : '#ef4444', fontWeight: 500 }}>{myProfile.arl_url ? '✓ Cargado' : '✕ No cargado'}</div>
                      </div>
                      {myProfile.arl_url && <a href={myProfile.arl_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', background: '#eef2ff', borderRadius: 6 }}>Ver</a>}
                    </div>
                  </div>
                </div>

                {/* Botones editar/enviar */}
                {!isEditing ? (
                  <button onClick={() => setProfileEditing({ profesion: myProfile.profesion || '', cedula: myProfile.cedula || '' })} style={{ width: '100%', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    ✏️ Editar Información
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setProfileEditing(null)} style={{ flex: 1, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={() => {
                      const changes = {};
                      if (profileEditing.profesion !== (myProfile.profesion || '')) changes.profesion = profileEditing.profesion;
                      if (profileEditing.cedula !== (myProfile.cedula || '')) changes.cedula = profileEditing.cedula;
                      if (Object.keys(changes).length === 0) { setProfileEditing(null); return; }
                      dispatch({ type: 'ADD_NOTE', payload: {
                        presupuesto_item_id: null,
                        texto: `📋 SOLICITUD DE CAMBIO DE PERFIL:\n${Object.entries(changes).map(([k,v]) => `• ${k}: "${v}"`).join('\n')}`,
                        status: 'Recibido',
                        author_id: myProfile.id,
                        assigned_to: 'admin',
                        created_at: new Date().toISOString()
                      }});
                      alert('✅ Solicitud enviada. Será revisada por Administración.');
                      setProfileEditing(null);
                    }} style={{ flex: 1, padding: 12, background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      📤 Enviar Solicitud
                    </button>
                  </div>
                )}

                {/* Nota de aprobación */}
                <div style={{ marginTop: 4, padding: 12, background: '#fef3c7', borderRadius: 10, fontSize: 11, color: '#92400e', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>⚠️</span> Los cambios a tu información deben ser aprobados por Administración.
                </div>
              </div>
              );
            })() : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Tu perfil aún no ha sido creado</div>
                <div style={{ fontSize: 12 }}>Contacta al Administrador</div>
                <div style={{ fontSize: 12, marginTop: 8, color: '#94a3b8' }}>Email: {user?.email}</div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Header Mobile */}
      <div style={{ background: '#1e293b', padding: '24px 20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 14, color: '#94a3b8' }}>{myRoleStr || 'Sin rol'}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{myProfile ? `${myProfile.nombres || myProfile.nombre} ${myProfile.apellidos || ''}`.trim() : (user?.user_metadata?.nombre || cuadrillaId)}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowProfile(true)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8 }}>👤 Perfil</button>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8 }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {normalizedRole === 'bodega' ? renderAlmacen() : (activeTab === 'tareas' ? renderTareas() : renderBodega())}
      </div>

      {normalizedRole !== 'bodega' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', display: 'flex', borderTop: '1px solid #e2e8f0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button onClick={() => setActiveTab('tareas')} style={{ flex: 1, padding: 20, background: activeTab==='tareas'?'#f8fafc':'white', border: 'none', fontSize: 16, fontWeight: activeTab==='tareas'?700:500, color: activeTab==='tareas'?'#2563eb':'#64748b' }}>📋 MIS TAREAS</button>
          <button onClick={() => setActiveTab('bodega')} style={{ flex: 1, padding: 20, background: activeTab==='bodega'?'#f8fafc':'white', border: 'none', fontSize: 16, fontWeight: activeTab==='bodega'?700:500, color: activeTab==='bodega'?'#2563eb':'#64748b' }}>📦 MATERIALES</button>
        </div>
      )}
    </div>
  );
}
