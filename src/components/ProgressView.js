'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import BIMViewer from './BIMViewer';
import { useAuth } from '@/lib/auth';
import { storageService } from '@/lib/services';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProgressView({ contextProyectoId }) {
  const { state, dispatch, calcularCostoMO, calcularDatosCargo } = useStore();
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMode, setInputMode] = useState('percentage'); // 'percentage' or 'quantity'
  const [timeGranularity, setTimeGranularity] = useState('day'); // 'hour', 'day', 'fortnight', 'month', 'quarter'
  const [moViewMode, setMoViewMode] = useState('total'); // 'total', 'unit', 'day', 'hour'
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [ganttGranularity, setGanttGranularity] = useState('day');
  const [splitX, setSplitX] = useState(20); // Reducido: 20% para Visor BIM
  const [splitY, setSplitY] = useState(35); // 35% para Gantt
  const [splitX2, setSplitX2] = useState(45); // % para Configuración vs Notas
  const [isResizingX, setIsResizingX] = useState(false);
  const [isResizingY, setIsResizingY] = useState(false);
  const [isResizingX2, setIsResizingX2] = useState(false);
  const [viewerTab, setViewerTab] = useState('visor'); // 'visor' | 'docs'
  const [viewMode, setViewMode] = useState('laptop'); // 'tablet', 'laptop', 'monitor'
  const [panelTab, setPanelTab] = useState('resumen'); // 'resumen' or cuadrilla index
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const { user } = useAuth();
  const noteInputRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showTechnicalReportModal, setShowTechnicalReportModal] = useState(false);
  const [reportingItem, setReportingItem] = useState(null);
  const [technicalReportFile, setTechnicalReportFile] = useState(null);
  const [technicalReportComment, setTechnicalReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [technicalReportPct, setTechnicalReportPct] = useState(0);

  // Ajustar proporciones según el modo de vista
  const applyViewMode = (mode) => {
    setViewMode(mode);
    if (mode === 'tablet') {
      setSplitX(30); 
      setSplitY(40); 
    } else if (mode === 'monitor') {
      setSplitX(15); // Visor muy pequeño en monitor grande
      setSplitY(50); 
    } else {
      setSplitX(20); // Laptop balanceado pero con prioridad a datos
      setSplitY(35);
    }
  };

  useEffect(() => {
    const onMove = (e) => {
      if (isResizingX) {
        const container = document.querySelector('.progress-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          if (pct > 5 && pct < 90) setSplitX(pct);
        }
      }
      if (isResizingY) {
        const side = document.querySelector('.progress-side');
        if (side) {
          const rect = side.getBoundingClientRect();
          const pct = ((e.clientY - rect.top) / rect.height) * 100;
          if (pct > 15 && pct < 85) setSplitY(pct);
        }
      }
      if (isResizingX2) {
        const panel = document.querySelector('.detail-flex');
        if (panel) {
          const rect = panel.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          if (pct > 20 && pct < 80) setSplitX2(pct);
        }
      }
    };
    const onUp = () => { setIsResizingX(false); setIsResizingY(false); setIsResizingX2(false); };
    if (isResizingX || isResizingY || isResizingX2) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingX, isResizingY, isResizingX2]);
  

  const effectiveProyectoId = contextProyectoId || selectedProyectoId;

  // Calculations
  const presupuestoItems = state.presupuestoItems.filter(pi => pi.proyecto_id === effectiveProyectoId);
  const bimLinks = state.bimLinks.filter(l => l.proyecto_id === effectiveProyectoId);
  const itemNotes = state.notas.filter(n => n.presupuesto_item_id === selectedItemId);
  
  const elementToItemMap = useMemo(() => {
    const map = {};
    bimLinks.forEach(l => map[l.element_id] = l.presupuesto_item_id);
    return map;
  }, [bimLinks]);

  const handleBimSelect = (elementId) => {
    const itemId = elementToItemMap[elementId];
    if (itemId) setSelectedItemId(itemId);
  };

  const currentItem = presupuestoItems.find(i => i.id === selectedItemId);

  const itemMOBudget = useMemo(() => {
    if (!currentItem) return 0;

    // 1. Prioridad: Costo unitario contratado manualmente
    if (currentItem.mo_unitario_contratado > 0) {
      return Number(currentItem.mo_unitario_contratado) * (Number(currentItem.cantidad) || 0);
    }

    // 2. Fallback: Cálculo teórico desde APU usando la nueva función centralizada
    return calcularCostoMO(currentItem.apu_id) * (Number(currentItem.cantidad) || 0);
  }, [currentItem, state.apuDetalles, state.cargos, calcularCostoMO]);

  const itemLaborNames = useMemo(() => {
    if (!currentItem) return '';
    const getNames = (apuId) => {
      const details = state.apuDetalles.filter(d => d.apu_id === apuId);
      let res = [];
      details.forEach(d => {
        if (d.cargo_id) {
          const cargo = state.cargos.find(c => c.id === d.cargo_id);
          if (cargo) res.push(cargo.nombre);
        } else if (d.insumo_id) {
          const ins = state.insumos.find(i => i.id === d.insumo_id);
          if (!ins) return;
          const cat = (ins.categoria || '').toUpperCase();
          const tipo = (ins.tipo || '').toUpperCase();
          const isMO = cat === 'MANO DE OBRA' || cat === 'MO' || cat === 'LABOR' || tipo === 'MANO_OBRA' || tipo === 'MANO DE OBRA' || tipo === 'MO' || tipo === 'LABOR';
          if (isMO) res.push(ins.nombre);
        } else if (d.apu_hijo_id) {
          res = [...res, ...getNames(d.apu_hijo_id)];
        }
      });
      return res;
    };
    const names = Array.from(new Set(getNames(currentItem.apu_id)));
    return names.length > 0 ? names.join(' + ') : 'Global';
  }, [currentItem, state.apuDetalles, state.insumos, state.cargos]);

  // ─── Dashboard de Gestión Técnica Helpers ───
  const handleAddChecklistItem = (itemId, scope = 'RESUMEN') => {
    if (!newChecklistItem.trim()) return;
    dispatch({
      type: 'ADD_CHECKLIST_ITEM',
      payload: {
        presupuesto_item_id: itemId,
        texto: newChecklistItem.trim(),
        completado: false,
        estado_aprobacion: 'PENDIENTE',
        scope: scope
      }
    });
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: itemId,
        texto: `📝 (Supervisor) se añadió a la lista: "${newChecklistItem}"`,
        author_id: user?.id,
        author_name: user?.user_metadata?.nombre || 'Supervisor',
        meta: { scope: scope === 'RESUMEN' ? 'SUPERVISION_LOG' : scope, type: 'activity' }
      }
    });
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (item) => {
    if (item.estado_aprobacion !== 'APROBADO') {
      alert('⚠️ Este ítem debe ser aprobado por el supervisor antes de reportar avance.');
      return;
    }
    setReportingItem(item);
    setTechnicalReportPct(item.porcentaje_avance || 0);
    setShowTechnicalReportModal(true);
  };

  const submitTechnicalReport = async () => {
    if (!technicalReportFile || !reportingItem) {
      alert("La fotografía de evidencia es obligatoria.");
      return;
    }
    const pct = Math.max(0, Math.min(100, Number(technicalReportPct) || 0));
    setIsSubmittingReport(true);
    try {
      const url = await storageService.uploadImage(technicalReportFile, 'checklists');
      const currentScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;

      dispatch({
        type: 'ADD_NOTE',
        payload: {
          presupuesto_item_id: reportingItem.presupuesto_item_id,
          texto: `📋 AVANCE DE CHECKLIST: "${reportingItem.texto}"\nAvance reportado: ${pct}%\n${technicalReportComment}`,
          file_url: url,
          status: 'Recibido',
          author_id: user?.id,
          author_name: user?.user_metadata?.nombre || 'Supervisor',
          checklist_item_id: reportingItem.id,
          meta: { scope: currentScope, type: 'tech_report', porcentaje: pct }
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

  const handleAddDocument = async (itemId, file, scope = 'RESUMEN') => {
    if (!file) return;
    setIsUploadingDoc(true);
    try {
      const url = await storageService.uploadFile(file, `doc_actividad_${itemId}/${Date.now()}_${file.name}`);
      dispatch({
        type: 'ADD_ITEM_DOCUMENT',
        payload: {
          presupuesto_item_id: itemId,
          nombre: file.name,
          file_url: url,
          tipo: file.name.split('.').pop().toUpperCase(),
          scope: scope
        }
      });
      dispatch({
        type: 'ADD_NOTE',
        payload: {
          presupuesto_item_id: itemId,
          texto: `📎 Documento oficial cargado por Supervisión: ${file.name}`,
          author_id: user?.id,
          author_name: user?.user_metadata?.nombre || 'Supervisor',
          meta: { scope: scope === 'RESUMEN' ? 'SUPERVISION_LOG' : scope, type: 'activity' }
        }
      });
    } catch (err) {
      alert("Error subiendo documento: " + err.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleAddNote = async (photoFile = null) => {
    const text = noteInputRef.current?.value;
    if (!text && !photoFile) return;

    let photoUrl = null;
    if (photoFile) {
      setIsUploading(true);
      try {
        photoUrl = await storageService.uploadPhoto(photoFile);
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        setIsUploading(false);
      }
    }

    const currentScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;
    
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: selectedItemId,
        texto: text || '',
        photo_url: photoUrl,
        status: 'Recibido',
        created_at: new Date().toISOString(),
        meta: { 
          scope: currentScope,
          created_at: new Date().toISOString()
        }
      }
    });

    if (noteInputRef.current) noteInputRef.current.value = '';
  };

  const submitReply = (parentId, currentScope) => {
    if (!replyText.trim()) return;
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        presupuesto_item_id: selectedItemId,
        texto: replyText,
        parent_id: parentId,
        author_id: user?.id,
        author_name: user?.user_metadata?.nombre || user?.email,
        meta: { scope: currentScope, type: 'reply' }
      }
    });
    setReplyText('');
    setReplyingTo(null);
  };

  const updateNoteStatus = (noteId, newStatus) => {
    const note = state.notas.find(n => n.id === noteId);
    dispatch({
      type: 'UPDATE_NOTE',
      payload: { id: noteId, changes: { status: newStatus } }
    });
    // Si la nota está vinculada a un checklist item, actualizarlo también
    if (note?.checklist_item_id && newStatus === 'Aprobado') {
      dispatch({
        type: 'UPDATE_CHECKLIST_ITEM',
        payload: { id: note.checklist_item_id, changes: { completado: true, estado_aprobacion: 'APROBADO' } }
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aprobado': return '#22c55e';
      case 'Revisado': return '#eab308';
      default: return '#3b82f6';
    }
  };

  // Cálculo de progreso para tareas (Ponderado por Checklist + Reporte Físico)
  const progressMap = useMemo(() => {
    const map = {};
    presupuestoItems.forEach(item => {
      const checklistItems = state.itemChecklistItems?.filter(it => it.presupuesto_item_id === item.id) || [];
      const itemAvances = state.avances.filter(a => a.presupuesto_item_id === item.id && a.estado === 'APROBADO');
      const physicalQty = itemAvances.reduce((sum, a) => sum + Number(a.cantidad_incremental || 0), 0);
      
      const checklistTotalWeight = checklistItems.reduce((acc, it) => acc + (Number(it.porcentaje_peso) || 0), 0);
      const physicalWeight = Math.max(0, 100 - checklistTotalWeight);
      
      const physicalPctReal = (physicalQty / (item.cantidad || 1)) * 100;
      const physicalContribution = (physicalPctReal * physicalWeight) / 100;
      
      const checklistContribution = checklistItems
        .filter(it => it.estado_aprobacion === 'APROBADO')
        .reduce((acc, it) => {
          const avPct = Number(it.porcentaje_avance) || 0;
          const peso = Number(it.porcentaje_peso) || 0;
          return acc + (avPct / 100) * peso;
        }, 0);
      
      const totalPct = Math.min(100, physicalContribution + checklistContribution);
      
      map[item.id] = {
        qty: (totalPct / 100) * (item.cantidad || 1),
        physicalContribution,
        technicalContribution: checklistContribution,
        physicalWeight,
        totalPct
      };
    });
    return map;
  }, [presupuestoItems, state.avances, state.itemChecklistItems]);

  const coloredMap = useMemo(() => {
    const map = {};
    bimLinks.forEach(link => {
      const executed = progressMap[link.presupuesto_item_id] || 0;
      const item = presupuestoItems.find(i => i.id === link.presupuesto_item_id);
      if (!item) return;
      const pct = (executed / (item.cantidad || 1)) * 100;
      if (pct >= 100) map[link.element_id] = '#22c55e';
      else if (pct > 0) map[link.element_id] = '#eab308';
      else map[link.element_id] = '#94a3b8';
    });
    return map;
  }, [bimLinks, progressMap, presupuestoItems]);

  const handleAddProgress = (itemId, value) => {
    const item = presupuestoItems.find(i => i.id === itemId);
    if (!item) return;
    
    let increment = 0;
    const val = parseFloat(value) || 0;
    
    if (inputMode === 'percentage') {
      increment = (val / 100) * (item.cantidad || 0);
    } else {
      increment = val;
    }

    if (increment === 0) return;

    dispatch({
      type: 'ADD_AVANCE',
      payload: {
        presupuesto_item_id: itemId,
        cantidad_incremental: increment,
        fecha: new Date().toISOString().split('T')[0],
        comentario: `Registro de avance (${inputMode})`
      }
    });
  };

  const handleUpdateItem = (itemId, changes) => {
    dispatch({ type: 'UPDATE_PRESUPUESTO_ITEM', payload: { id: itemId, ...changes } });
  };

  // Lógica de asignación automática de responsable
  useEffect(() => {
    if (selectedItemId && currentItem && !currentItem.asignado_a_cuadrilla) {
      const apuId = currentItem.apu_id;
      const moDetails = state.apuDetalles.filter(d => d.apu_id === apuId && d.cargo_id);
      
      if (moDetails.length > 0) {
        // Buscamos personal que tenga uno de los cargos del APU
        const matchingPerson = state.personal.find(p => 
          moDetails.some(d => d.cargo_id === p.cargo_id)
        );
        
        if (matchingPerson) {
          handleUpdateItem(selectedItemId, { asignado_a_cuadrilla: matchingPerson.email || matchingPerson.nombre });
        }
      }
    }
  }, [selectedItemId, currentItem?.id, state.personal, state.apuDetalles]);

  const calculateDateEnd = (item) => {
    if (!item.fecha_inicio || !item.num_cuadrillas) return null;
    const apu = state.apus.find(a => a.id === item.apu_id);
    const rendimiento = Number(apu?.rendimiento) || 1; 
    const crews = Number(item.num_cuadrillas) || 1;
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

  const getScheduleStatus = (item, actualPct) => {
    if (!item.fecha_inicio) return { color: '#94a3b8', status: 'Sin Fecha' };
    const start = new Date(item.fecha_inicio).getTime();
    const endStr = calculateDateEnd(item);
    if (!endStr) return { color: '#94a3b8', status: 'Inválido' };
    const end = new Date(endStr).getTime();
    const totalDuration = end - start;
    if (totalDuration <= 0) return { color: '#22c55e', status: 'Finalizado' };
    const now = new Date().getTime();
    let expectedPct = 0;
    if (now > end) expectedPct = 100;
    else if (now > start) expectedPct = ((now - start) / totalDuration) * 100;
    const diff = expectedPct - actualPct;
    if (actualPct >= 100) return { color: '#22c55e', status: 'Terminado' };
    if (diff <= 5) return { color: '#22c55e', status: 'Al día' };
    if (diff <= 15) return { color: '#eab308', status: 'Retraso Leve' };
    return { color: '#ef4444', status: 'Crítico' };
  };

  const GANTT_CONFIG = {
    hour: { unit: 3600000, colWidth: 60, label: 'Hora' },
    day: { unit: 86400000, colWidth: 40, label: 'Día' },
    week: { unit: 86400000 * 7, colWidth: 80, label: 'Semana' },
    fortnight: { unit: 86400000 * 15, colWidth: 100, label: 'Quincena' },
    month: { unit: 86400000 * 30, colWidth: 120, label: 'Mensual' },
    quarter: { unit: 86400000 * 90, colWidth: 150, label: 'Trimestral' },
    half: { unit: 86400000 * 180, colWidth: 200, label: 'Semestral' },
    year: { unit: 86400000 * 365, colWidth: 250, label: 'Anual' },
    general: { unit: null, colWidth: null, label: 'General' }
  };

  const ganttBounds = useMemo(() => {
    if (presupuestoItems.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    presupuestoItems.forEach(it => {
      if (it.fecha_inicio) {
        const s = new Date(it.fecha_inicio).getTime();
        const eStr = calculateDateEnd(it);
        if (s < min) min = s;
        if (eStr) {
          const e = new Date(eStr).getTime();
          if (e > max) max = e;
        }
      }
    });
    if (min === Infinity) return null;
    const now = new Date().getTime();
    min = Math.min(min, now) - 86400000 * 3;
    max = Math.max(max, now) + 86400000 * 7;
    
    // Scale Logic
    let totalUnits = 0;
    let effectiveColWidth = 40;
    const config = GANTT_CONFIG[ganttGranularity];
    
    if (ganttGranularity === 'general') {
      totalUnits = 1;
      effectiveColWidth = 900; // Fixed large width for general view
    } else {
      totalUnits = Math.ceil((max - min) / config.unit);
      effectiveColWidth = config.colWidth;
    }

    return { min, max, totalUnits, effectiveColWidth, totalWidth: totalUnits * effectiveColWidth };
  }, [presupuestoItems, state.apus, ganttGranularity]);

  const getDateBucket = (isoStr, granularity) => {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    
    switch(granularity) {
      case 'hour': return `${yr}-${mo}-${day} ${hr}:00`;
      case 'day': return `${yr}-${mo}-${day}`;
      case 'week': {
        const firstDayOfYear = new Date(yr, 0, 1);
        const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${yr}-W${String(weekNum).padStart(2, '0')}`;
      }
      case 'fortnight': return `${yr}-${mo}-${d.getDate() <= 15 ? 'Q1' : 'Q2'}`;
      case 'month': return `${yr}-${mo}`;
      case 'quarter': return `${yr}-Q${Math.floor(d.getMonth() / 3) + 1}`;
      default: return `${yr}-${mo}-${day}`;
    }
  };

  const renderConsumptionTable = (item) => {
    const executed = progressMap[item.id] || 0;
    
    const projectBodega = state.bodegas.find(b => b.proyecto_id === item.proyecto_id);
    const bodMovs = state.inventario.filter(t => t.bodega_id === projectBodega?.id && t.presupuesto_item_id === item.id);

    const getTheoretical = (apuId, qty, result = {}) => {
      const details = state.apuDetalles.filter(d => d.apu_id === apuId);
      details.forEach(d => {
        const factor = qty * Number(d.cantidad) * (1 + (Number(d.desperdicio_pct) || 0) / 100);
        if (d.insumo_id) {
          result[d.insumo_id] = (result[d.insumo_id] || 0) + factor;
        } else if (d.apu_hijo_id) {
          getTheoretical(d.apu_hijo_id, factor, result);
        }
      });
      return result;
    };

    const theoreticalMap = getTheoretical(item.apu_id, executed);
    const withdrawnMap = {};
    bodMovs.forEach(m => {
      if (m.tipo === 'SALIDAa') withdrawnMap[m.insumo_id] = (withdrawnMap[m.insumo_id] || 0) + Number(m.cantidad);
    });

    return (
      <div className="consumption-table-area">
        <h4>Consumo de Materiales (Teórico vs Bodega)</h4>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Teórico</th>
              <th>Retirado</th>
              <th>Desv.</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(theoreticalMap).map(insId => {
              const insumo = state.insumos.find(i => i.id === insId);
              const theo = theoreticalMap[insId] || 0;
              const real = withdrawnMap[insId] || 0;
              const diff = real - theo;
              return (
                <tr key={insId}>
                  <td>{insumo?.nombre}</td>
                  <td>{theo.toFixed(2)}</td>
                  <td>{real.toFixed(2)}</td>
                  <td style={{ color: diff > 0.05 * theo ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {((diff / theo) * 100 || 0).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEVMChart = (item, scope = 'RESUMEN') => {
    const apu = state.apus.find(a => a.id === item.apu_id);
    if (!apu) return null;

    const projectBodega = state.bodegas.find(b => b.proyecto_id === item.proyecto_id);
    const bodMovs = state.inventario.filter(t => t.bodega_id === projectBodega?.id && t.presupuesto_item_id === item.id && t.tipo === 'SALIDAa');
    const allAvances = state.avances.filter(a => a.presupuesto_item_id === item.id);
    const itemAvances = scope === 'RESUMEN' ? allAvances : allAvances.filter(a => a.meta?.scope === scope);

    // 1. Find dominant material
    const getTheoretical = (apuId, qty, result = {}) => {
      const details = state.apuDetalles.filter(d => d.apu_id === apuId);
      details.forEach(d => {
        const factor = qty * Number(d.cantidad) * (1 + (Number(d.desperdicio_pct) || 0) / 100);
        if (d.insumo_id) { result[d.insumo_id] = (result[d.insumo_id] || 0) + factor; }
        else if (d.apu_hijo_id) { getTheoretical(d.apu_hijo_id, factor, result); }
      });
      return result;
    };
    const theoForOneunit = getTheoretical(item.apu_id, 1);
    
    let domInsumoId = null;
    let maxCost = 0;
    
    Object.keys(theoForOneunit).forEach(insId => {
      const ins = state.insumos.find(i => i.id === insId);
      const cost = theoForOneunit[insId] * (Number(ins?.costo) || 0);
      if (cost > maxCost) {
        maxCost = cost;
        domInsumoId = insId;
      }
    });

    if (!domInsumoId && Object.keys(theoForOneunit).length > 0) domInsumoId = Object.keys(theoForOneunit)[0];
    const theoFactor = theoForOneunit[domInsumoId] || 1;

    // 2. Build Timeline with Granularity
    const buckets = {};
    const addDateToBuckets = (iso) => {
      const b = getDateBucket(iso, timeGranularity);
      if (!buckets[b]) buckets[b] = { avgs: 0, bods: 0 };
    };

    itemAvances.forEach(a => addDateToBuckets(a.fecha));
    bodMovs.forEach(m => addDateToBuckets(m.created_at));
    
    const startIso = item.fecha_inicio || state.proyectos.find(p=>p.id===item.proyecto_id)?.created_at || new Date().toISOString();
    addDateToBuckets(startIso);
    addDateToBuckets(new Date().toISOString());

    const sortedBuckets = Object.keys(buckets).sort();
    
    let cumAvance = 0;
    let cumBodega = 0;
    const unitMORate = itemMOBudget / (item.cantidad || 1);
    
    const chartdata = sortedBuckets.map(b => {
      const avgs = itemAvances.filter(a => getDateBucket(a.fecha, timeGranularity) === b).reduce((acc, a) => acc + Number(a.cantidad_incremental), 0);
      const bods = bodMovs.filter(m => getDateBucket(m.created_at, timeGranularity) === b && m.insumo_id === domInsumoId).reduce((acc, m) => acc + Number(m.cantidad), 0);
      
      cumAvance += avgs;
      cumBodega += bods;
      
      return {
        key: b,
        Avance_Maestro: Number(cumAvance.toFixed(2)),
        Suministro_Material: Number((cumBodega / theoFactor).toFixed(2)),
        Costo_MO_Valor_Ganado: Math.round(cumAvance * unitMORate),
        Presupuesto_Meta: Number(item.cantidad),
        Presupuesto_MO_Meta: Math.round(itemMOBudget)
      };
    });

    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4>Análisis EVM & Rendimiento{scope !== 'RESUMEN' && <span style={{ fontSize: 12, color: '#3b82f6', marginLeft: 8 }}>— Cuadrilla A-{Number(scope.split('_')[1]) + 1}</span>}</h4>
          <div className="granularity-picker">
            <select 
              className="mini-select"
              value={timeGranularity} 
              onChange={(e) => setTimeGranularity(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: 'var(--color-accent)' }}
            >
              <option value="hour">Vista: Hora</option>
              <option value="day">Vista: Día</option>
              <option value="week">Vista: Semanal</option>
              <option value="fortnight">Vista: Quincena</option>
              <option value="month">Vista: Mes</option>
            </select>
          </div>
        </div>
        
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          Eje Izquierdo: unidades ({apu.unidad}) | Eje Derecho: Costo Mano de Obra ($)
        </p>

        <div style={{ height: 350, background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartdata} margin={{ top: 5, right: 30, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="key" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend 
                wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} 
                onClick={(e) => {
                  const { dataKey } = e;
                  setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
                }}
              />
              
              <Line yAxisId="left" type="monotone" dataKey="Avance_Maestro" name={`Avance (${apu.unidad})`} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} hide={hiddenSeries['Avance_Maestro']} />
              <Line yAxisId="left" type="monotone" dataKey="Suministro_Material" name={`Mat. Retirado (${apu.unidad})`} stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} hide={hiddenSeries['Suministro_Material']} />
              <Line yAxisId="left" type="stepAfter" dataKey="Presupuesto_Meta" name="Meta cantidad" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} hide={hiddenSeries['Presupuesto_Meta']} />
              
              <Line yAxisId="right" type="monotone" dataKey="Costo_MO_Valor_Ganado" name="Costo MO (Ganado $)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} hide={hiddenSeries['Costo_MO_Valor_Ganado']} />
              <Line yAxisId="right" type="stepAfter" dataKey="Presupuesto_MO_Meta" name="Meta Presupuesto MO ($)" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} hide={hiddenSeries['Presupuesto_MO_Meta']} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <>
      {!contextProyectoId && (
        <div className="page-header">
          <div>
            <h1>Seguimiento & Cronograma 5D</h1>
            <div className="page-header-subtitle">Control de ejecución, materiales y cuadrillas</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <div className="mode-toggle">
              <button className={`btn-mode ${inputMode === 'percentage' ? 'active' : ''}`} onClick={() => setInputMode('percentage')}>%</button>
              <button className={`btn-mode ${inputMode === 'quantity' ? 'active' : ''}`} onClick={() => setInputMode('quantity')}>Cant</button>
            </div>
            <div className="view-mode-selector" style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
              <button 
                className={`btn-sm ${viewMode === 'tablet' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => applyViewMode('tablet')}
                title="Vista Tablet"
                style={{ padding: '4px 8px' }}
              >📱</button>
              <button 
                className={`btn-sm ${viewMode === 'laptop' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => applyViewMode('laptop')}
                title="Vista Laptop"
                style={{ padding: '4px 8px' }}
              >💻</button>
              <button 
                className={`btn-sm ${viewMode === 'monitor' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => applyViewMode('monitor')}
                title="Monitor Grande"
                style={{ padding: '4px 8px' }}
              >🖥️</button>
            </div>
            <select className="form-select" value={selectedProyectoId} onChange={(e) => setSelectedProyectoId(e.target.value)} style={{ width: 240 }}>
              <option value="">Seleccionar Proyecto...</option>
              {state.proyectos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
            </select>
          </div>
        </div>
      )}
      {contextProyectoId && (
        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
          <div className="mode-toggle">
            <button className={`btn-mode ${inputMode === 'percentage' ? 'active' : ''}`} onClick={() => setInputMode('percentage')}>%</button>
            <button className={`btn-mode ${inputMode === 'quantity' ? 'active' : ''}`} onClick={() => setInputMode('quantity')}>Cant</button>
          </div>
        </div>
      )}

      {!effectiveProyectoId ? (
        <div className="empty-state" style={{ marginTop: 100 }}><h3>Selecciona un proyecto</h3></div>
      ) : (
        <div 
          className="progress-container" 
          style={{ 
            userSelect: (isResizingX || isResizingY || isResizingX2) ? 'none' : 'auto',
            height: 'calc(100vh - 120px)',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden', // CLAVE: Evita scroll general
            display: 'flex',
            margin: '0 20px',
            width: 'calc(100% - 40px)'
          }}
        >
          <div className="viewer-side" style={{ width: `calc(${splitX}% - 4px)`, flex: 'none', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            {/* Pestañas horizontales */}
            <div className="viewer-tabs">
              <button className={`viewer-tab ${viewerTab === 'visor' ? 'active' : ''}`} onClick={() => setViewerTab('visor')}>🧊 Visor BIM 3D</button>
              <button className={`viewer-tab ${viewerTab === 'docs' ? 'active' : ''}`} onClick={() => setViewerTab('docs')}>
                📎 Documentos
                {selectedItemId && currentItem && (
                  <span className="tab-badge">{state.itemDocuments.filter(d => d.presupuesto_item_id === currentItem.id).length}</span>
                )}
              </button>
            </div>

            {/* Tab content: Visor 3D */}
            {viewerTab === 'visor' && (
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <BIMViewer onSelect={handleBimSelect} coloredMap={coloredMap} isStandalone={false} proyectoId={effectiveProyectoId} />
              </div>
            )}

            {/* Tab content: Documentos */}
            {viewerTab === 'docs' && (
              <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#fafbfc' }}>
                {!selectedItemId || !currentItem ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📎</div>
                    Selecciona una actividad para ver sus documentos
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>Documentos de: {currentItem.descripcion || currentItem.codigo}</span>
                      <label style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                        + Subir archivo
                        <input type="file" style={{ display: 'none' }} onChange={e => {
                          const currentScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;
                          handleAddDocument(currentItem.id, e.target.files[0], currentScope);
                        }} />
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(() => {
                        const currentScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;
                        const docs = state.itemDocuments.filter(d => d.presupuesto_item_id === currentItem.id && d.scope === currentScope);
                        if (docs.length === 0) return (
                          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 11, fontStyle: 'italic', background: '#fff', borderRadius: 10, border: '1px dashed #e2e8f0' }}>Sin documentos adjuntos para esta actividad</div>
                        );
                        return docs.map(doc => (
                          <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '10px 14px', background: '#fff', borderRadius: 10, fontSize: 12, color: '#334155', textDecoration: 'none', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f0f7ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                          >
                            <span style={{ fontSize: 20 }}>📄</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{doc.nombre}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>{doc.tipo}</span>
                          </a>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="resizer-x" onMouseDown={() => setIsResizingX(true)}></div>

          <div className="progress-side" style={{ width: `calc(${100 - splitX}% - 4px)`, flex: 'none', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="item-list-container" style={{ height: `${splitY}%`, flex: 'none' }}>
                <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3>Gantt de Ejecución</h3>
                    <select 
                      className="mini-select"
                      value={ganttGranularity} 
                      onChange={(e) => setGanttGranularity(e.target.value)}
                      style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 700, color: 'var(--color-accent)' }}
                    >
                      {Object.keys(GANTT_CONFIG).map(k => <option key={k} value={k}>{GANTT_CONFIG[k].label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, fontWeight: 700 }}>
                    <span style={{ color: '#22c55e' }}>● Al día</span>
                    <span style={{ color: '#eab308' }}>● Retraso</span>
                    <span style={{ color: '#ef4444' }}>● Crítico</span>
                  </div>
                </div>
                <div className="gantt-split-container" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                  {/* Panel fijo izquierdo: # y Pred */}
                  <div className="gantt-fixed-panel" onScroll={(e) => { const right = document.querySelector('.gantt-scroll-area'); if (right) right.scrollTop = e.target.scrollTop; }}>
                    <div className="gantt-fixed-header">
                      <span style={{ width: 36, textAlign: 'center', fontWeight: 800 }}>#</span>
                      <span style={{ width: 100, fontWeight: 800 }}>Actividad</span>
                      <span style={{ width: 44, textAlign: 'center', fontWeight: 800 }}>Pred.</span>
                    </div>
                    {presupuestoItems.map((item, idx) => {
                      const apu = state.apus.find(a => a.id === item.apu_id);
                      const name = item.descripcion || apu?.nombre || 'Item';
                      return (
                        <div
                          key={item.id}
                          className={`gantt-fixed-row ${selectedItemId === item.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedItemId(item.id); setPanelTab('resumen'); }}
                        >
                          <span className="gantt-item-num">{idx + 1}</span>
                          <span className="gantt-item-name" title={name}>{name}</span>
                          <input
                            className="gantt-pred-input"
                            type="text"
                            placeholder="—"
                            value={item.predecesor_item_num || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9,;]/g, '');
                              handleUpdateItem(item.id, { predecesor_item_num: val });
                            }}
                            title="Ej: 1 ó 1,3"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel derecho scrollable: Barras Gantt */}
                  <div className="item-list gantt-scroll-area" onScroll={(e) => { const left = document.querySelector('.gantt-fixed-panel'); if (left) left.scrollTop = e.target.scrollTop; }}>
                  {ganttBounds && (
                    <div className="gantt-timeline-header" style={{ width: ganttBounds.totalWidth }}>
                      {ganttGranularity !== 'general' && Array.from({ length: ganttBounds.totalUnits }).map((_, i) => {
                        const config = GANTT_CONFIG[ganttGranularity];
                        const d = new Date(ganttBounds.min + i * config.unit);
                        let label = d.getDate();
                        if (ganttGranularity === 'hour') label = d.getHours() + 'h';
                        if (ganttGranularity === 'week') label = 'S' + Math.ceil(d.getDate() / 7);
                        if (ganttGranularity === 'month') label = d.toLocaleDateString('es-ES', { month: 'short' });
                        
                        return (
                          <div key={i} className="gantt-day-col" style={{ width: config.colWidth }}>
                            {(d.getDate() === 1 || i === 0) && ganttGranularity === 'day' ? <span className="gantt-month-label">{d.toLocaleDateString('es-ES', { month: 'short' })}</span> : null}
                            <span className="gantt-day-num">{label}</span>
                          </div>
                        );
                      })}
                      {ganttGranularity === 'general' && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 10px', alignItems: 'center', height: '100%' }}>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{new Date(ganttBounds.min).toLocaleDateString()}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-accent)' }}>PROYECTO COMPLETO</span>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{new Date(ganttBounds.max).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="today-marker" style={{ left: ((new Date().getTime() - ganttBounds.min) / (ganttBounds.max - ganttBounds.min)) * ganttBounds.totalWidth }} />
                    </div>
                  )}
                  {/* SVG de flechas de dependencia */}
                  {ganttBounds && (
                    <svg className="gantt-dep-arrows" style={{ position: 'absolute', top: 52, left: 0, width: ganttBounds.totalWidth, height: presupuestoItems.length * 50, pointerEvents: 'none', zIndex: 4 }}>
                      {presupuestoItems.map((item, idx) => {
                        if (!item.predecesor_item_num) return null;
                        const predNums = item.predecesor_item_num.split(/[,;]/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= presupuestoItems.length);
                        return predNums.map(predNum => {
                          const predItem = presupuestoItems[predNum - 1];
                          if (!predItem) return null;
                          const predEndStr = calculateDateEnd(predItem);
                          const predEndTs = predEndStr ? new Date(predEndStr).getTime() : (ganttBounds.min + 86400000);
                          const succStartTs = item.fecha_inicio ? new Date(item.fecha_inicio).getTime() : ganttBounds.min;
                          const totalDuration = ganttBounds.max - ganttBounds.min;
                          const x1 = ((predEndTs - ganttBounds.min) / totalDuration) * ganttBounds.totalWidth;
                          const y1 = (predNum - 1) * 50 + 25;
                          const x2 = ((succStartTs - ganttBounds.min) / totalDuration) * ganttBounds.totalWidth;
                          const y2 = idx * 50 + 25;
                          const mx = x2 - 12;
                          return (
                            <g key={`${predNum}-${idx}`}>
                              <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
                              <polygon points={`${x2},${y2} ${x2-6},${y2-3} ${x2-6},${y2+3}`} fill="#6366f1" opacity="0.7" />
                            </g>
                          );
                        });
                      })}
                    </svg>
                  )}
                  <div className="gantt-rows-container" style={{ width: ganttBounds ? ganttBounds.totalWidth : '100%' }}>
                    {presupuestoItems.map((item, idx) => {
                      const info = progressMap[item.id];
                      const executed = info?.qty || 0;
                      const totalQty = item.cantidad || 1;
                      const pct = info?.totalPct || 0;
                      const status = getScheduleStatus(item, pct);
                      const apu = state.apus.find(a => a.id === item.apu_id);
                      const name = item.descripcion || apu?.nombre || 'Item';
                      const endDateStr = calculateDateEnd(item);
                      
                      let leftOffset = 0;
                      let barWidth = 60;
                      const startTs = item.fecha_inicio ? new Date(item.fecha_inicio).getTime() : (ganttBounds?.min || new Date().getTime());
                      const endTs = endDateStr ? new Date(endDateStr).getTime() : (startTs + 86400000);
                      
                      if (ganttBounds && item.fecha_inicio) {
                        const totalDuration = ganttBounds.max - ganttBounds.min;
                        leftOffset = ((startTs - ganttBounds.min) / totalDuration) * ganttBounds.totalWidth;
                        barWidth = ((endTs - startTs) / totalDuration) * ganttBounds.totalWidth;
                        barWidth = Math.max(barWidth, 10);
                      } else if (ganttBounds) {
                        leftOffset = 0;
                        barWidth = 40;
                      }

                      return (
                        <div 
                          key={item.id} 
                          className={`gantt-row ${selectedItemId === item.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedItemId(item.id); setPanelTab('resumen'); }}
                        >
                          <div className="gantt-bar-container" style={{ left: leftOffset, width: Math.max(barWidth, 200) }}>
                            <div className="bar-label-above">
                              <span className="gantt-row-num" style={{ fontWeight: 900, color: '#6366f1', marginRight: 4, fontSize: 9 }}>{idx + 1}</span>
                              <span className="row-cap">{item.capitulo || 'OBRA'}</span> | <span className="row-name">{name}</span>
                            </div>
                            <div className="gantt-bar-bg" style={{ width: barWidth, display: 'flex' }}>
                              <div className="gantt-bar-fill" style={{ width: `${progressMap[item.id]?.technicalContribution || 0}%`, backgroundColor: '#3b82f6' }} title="Técnico" />
                              <div className="gantt-bar-fill" style={{ width: `${progressMap[item.id]?.physicalContribution || 0}%`, backgroundColor: status.color }} title="Físico" />
                              {pct > 0 && <span className="bar-pct-label">{pct.toFixed(0)}%</span>}
                            </div>
                            <div className="gantt-bar-dates">
                              {item.fecha_inicio && <span>{new Date(item.fecha_inicio).toLocaleDateString()} - {new Date(endDateStr).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              </div>

              <div className="resizer-y" onMouseDown={() => setIsResizingY(true)}></div>

              <div className="collaboration-panel" style={{ height: `${100 - splitY}%`, flex: 'none' }}>
                <div className="panel-header">
                  <h3>Panel Detallado & Colaboración</h3>
                </div>
                {selectedItemId && currentItem ? (
                  <div className="detail-flex" style={{ display: 'flex', height: 'calc(100% - 50px)', overflow: 'hidden' }}>
                    
                    {/* COLUMNA IZQUIERDA: Configuración y Canales */}
                    <div className="detail-config" style={{ width: `${splitX2}%`, flex: 'none', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: 0 }}>
                      {(() => {
                        const moDetails = state.apuDetalles.filter(d => d.apu_id === currentItem?.apu_id && d.cargo_id);
                        const cargoIds = moDetails.map(d => d.cargo_id);
                        const hasMO = cargoIds.length > 0;
                        const mainCargo = hasMO ? state.cargos.find(c => c.id === cargoIds[0]) : null;
                        const cargoLabel = mainCargo?.nombre || 'Cuadrilla';
                        const itemCuad = Number(currentItem?.num_cuadrillas) || 1;
                        let storedCuad = 1;
                        try {
                          const saved = localStorage.getItem(`cuadrillas_${currentItem?.proyecto_id}`);
                          if (saved) {
                            const map = JSON.parse(saved);
                            storedCuad = Math.max(...cargoIds.map(id => map[id] || 1), 1);
                          }
                        } catch {}
                        const nCuad = Math.max(itemCuad, storedCuad);
                        const assignedSignatures = (currentItem?.asignado_a_cuadrilla || '').split(',').filter(Boolean);
                        
                        const tabs = [
                          { key: 'resumen', label: '📋 Resumen' },
                          ...(hasMO ? Array.from({ length: nCuad }).map((_, i) => {
                            const isAssigned = cargoIds.some(cid => assignedSignatures.includes(`${cid}:${i}`));
                            if (!isAssigned) return null;
                            return { key: `cuad-${i}`, label: `${cargoLabel}-${i + 1}`, idx: i };
                          }).filter(Boolean) : [])
                        ];

                        if (panelTab !== 'resumen' && !tabs.find(t => t.key === panelTab)) {
                          setTimeout(() => setPanelTab('resumen'), 0);
                        }
                        return (
                          <>
                            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                              {tabs.map(tab => (
                                <button
                                  key={tab.key}
                                  onClick={() => setPanelTab(tab.key)}
                                  style={{
                                    padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                    background: panelTab === tab.key ? '#fff' : 'transparent',
                                    color: panelTab === tab.key ? '#3b82f6' : '#64748b',
                                    borderBottom: panelTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                                    marginBottom: '-2px', transition: 'all 0.15s', whiteSpace: 'nowrap',
                                  }}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ padding: 16 }}>
                              {panelTab === 'resumen' ? (
                                <div className="config-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                  {/* WIDGET DE AVANCE DESTACADO */}
                                  <div style={{ 
                                    background: '#fff', 
                                    padding: '20px', 
                                    borderRadius: '16px', 
                                    border: '1px solid #e2e8f0', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avance de Actividad</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: getScheduleStatus(currentItem, progressMap[currentItem.id]?.totalPct || 0).color + '20', color: getScheduleStatus(currentItem, progressMap[currentItem.id]?.totalPct || 0).color }}>
                                            {getScheduleStatus(currentItem, progressMap[currentItem.id]?.totalPct || 0).status}
                                          </span>
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{progressMap[currentItem.id]?.totalPct.toFixed(1)}%</div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: 4 }}>EJECUTADO TOTAL</div>
                                      </div>
                                    </div>

                                    <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '7px', overflow: 'hidden', display: 'flex', border: '1px solid #f1f5f9' }}>
                                      <div 
                                        style={{ width: `${progressMap[currentItem.id]?.technicalContribution || 0}%`, background: '#3b82f6', height: '100%', transition: 'width 1s ease-out' }} 
                                        title={`Técnico: ${progressMap[currentItem.id]?.technicalContribution.toFixed(1)}%`} 
                                      />
                                      <div 
                                        style={{ width: `${progressMap[currentItem.id]?.physicalContribution || 0}%`, background: getScheduleStatus(currentItem, progressMap[currentItem.id]?.totalPct || 0).color, height: '100%', transition: 'width 1s ease-out' }} 
                                        title={`Físico: ${progressMap[currentItem.id]?.physicalContribution.toFixed(1)}%`} 
                                      />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                      <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>FÍSICO</span>
                                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{progressMap[currentItem.id]?.physicalContribution.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>TÉCNICO</span>
                                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{progressMap[currentItem.id]?.technicalContribution.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                      
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="mode-toggle" style={{ margin: 0 }}>
                                          <button 
                                            className={`btn-mode ${inputMode === 'percentage' ? 'active' : ''}`} 
                                            onClick={(e) => { e.stopPropagation(); setInputMode('percentage'); }}
                                            style={{ fontSize: '9px', padding: '2px 6px' }}
                                          >%</button>
                                          <button 
                                            className={`btn-mode ${inputMode === 'quantity' ? 'active' : ''}`} 
                                            onClick={(e) => { e.stopPropagation(); setInputMode('quantity'); }}
                                            style={{ fontSize: '9px', padding: '2px 6px' }}
                                          >#</button>
                                        </div>
                                        <input 
                                          type="number" 
                                          placeholder={inputMode === 'percentage' ? '%' : 'Cant'}
                                          className="form-input btn-sm"
                                          style={{ width: '60px', fontSize: '11px', height: '24px', padding: '2px 6px' }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleAddProgress(selectedItemId, e.target.value);
                                              e.target.value = '';
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div className="form-group">
                                    <label className="form-label">Fecha Inicio</label>
                                    <input type="Date" className="form-input btn-sm" value={currentItem?.fecha_inicio || ''} onChange={(e) => handleUpdateItem(selectedItemId, { fecha_inicio: e.target.value })} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Fin Proyectado</label>
                                    <div className="form-static btn-sm" style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 13 }}>
                                      {currentItem?.fecha_fin ? (() => { const [y, m, d] = currentItem.fecha_fin.split('-'); return `${d}/${m}/${y}`; })() : '—'}
                                    </div>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">N° Cuadrillas</label>
                                    <input type="number" className="form-input btn-sm" value={currentItem?.num_cuadrillas || 1} onChange={(e) => handleUpdateItem(selectedItemId, { num_cuadrillas: e.target.value })} min="1" />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">🔑 Supervisor (Administración)</label>
                                    {(() => {
                                      const supervisors = state.personalProyecto.filter(ap => 
                                        ap.proyecto_id === currentItem?.proyecto_id && 
                                        ap.unidad_pactada === 'SUPERVISOR' &&
                                        cargoIds.includes(ap.cargo_id)
                                      );
                                      const supPersons = supervisors.map(ap => {
                                        const p = state.personal.find(pp => pp.id === ap.personal_id);
                                        return p ? { person: p, aId: ap.id } : null;
                                      }).filter(Boolean);
                                      const supIds = supervisors.map(s => s.personal_id);
                                      const available = state.personal.filter(p => !supIds.includes(p.id));
                                      return (
                                        <>
                                          {supPersons.map(({ person: p, aId }) => (
                                            <div key={aId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '4px 8px', marginTop: 4, background: '#eef2ff', borderRadius: 6, border: '1px solid #c7d2fe' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
                                                <span>🔑</span>
                                                <span style={{ fontWeight: 500 }}>{p.nombres || p.nombre} {p.apellidos || ''}</span>
                                                <span style={{ color: '#94a3b8', fontSize: 9 }}>({p.email})</span>
                                              </div>
                                              <button onClick={() => dispatch({ type: 'DELETE_PERSON_PROYECTO', payload: aId })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '0 4px' }}>✕</button>
                                            </div>
                                          ))}
                                          <select className="form-select btn-sm" style={{ fontSize: 11, marginTop: 4, borderColor: '#c7d2fe' }} value="" onChange={(e) => {
                                            const pid = e.target.value;
                                            if (!pid) return;
                                            const person = state.personal.find(p => p.id === pid);
                                            dispatch({ type: 'ADD_PERSON_PROYECTO', payload: {
                                              id: crypto.randomUUID(),
                                              personal_id: pid,
                                              proyecto_id: currentItem?.proyecto_id,
                                              cargo_id: cargoIds[0],
                                              unidades_asignadas: 0,
                                              salario_pactado: person?.salario_base || 0,
                                              unidad_pactada: 'SUPERVISOR',
                                              tareas_asignadas: []
                                            }});
                                          }}>
                                            <option value="">+ Asignar supervisor...</option>
                                            {available.map(p => <option key={p.id} value={p.id}>{p.nombres || p.nombre} {p.apellidos || ''}</option>)}
                                          </select>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <input type="checkbox" checked={currentItem?.is_unlocked || false} onChange={(e) => handleUpdateItem(selectedItemId, { is_unlocked: e.target.checked })} />
                                    <label style={{ fontSize: 10, fontWeight: 700 }}>🔓 Desbloqueo Manual</label>
                                  </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>👥 Equipo de Trabajo</span>
                                    <span style={{ fontSize: 10, background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: 4 }}>
                                      {panelTab.split('-')[1] ? `Canal ${Number(panelTab.split('-')[1]) + 1}` : ''}
                                    </span>
                                  </div>
                                  {(() => {
                                    const cuadIdx = Number(panelTab.split('-')[1]);
                                    const assignments = state.personalProyecto.filter(ap => 
                                      ap.proyecto_id === currentItem?.proyecto_id && 
                                      ap.cuadrilla_idx === cuadIdx &&
                                      ap.unidad_pactada !== 'SUPERVISOR'
                                    );

                                    if (assignments.length === 0) {
                                      return <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '12px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>No hay personal asignado a este canal</div>;
                                    }

                                    return assignments.map(ap => {
                                      const p = state.personal.find(pp => pp.id === ap.personal_id);
                                      const cargo = state.cargos.find(c => c.id === ap.cargo_id);
                                      return (
                                        <div key={ap.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                                            {p?.foto_url ? <img src={p.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '👤'}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {p ? (p.nombres || p.nombre) : 'Desconocido'} {p?.apellidos || ''}
                                            </div>
                                            <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                                              {cargo?.nombre || 'Operativo'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                  
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>MÉTRICAS DE RENDIMIENTO</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: 8, border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: 8, color: '#16a34a', fontWeight: 700 }}>EFICIENCIA</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#166534' }}>94%</div>
                                      </div>
                                      <div style={{ background: '#eff6ff', padding: '8px', borderRadius: 8, border: '1px solid #dbeafe' }}>
                                        <div style={{ fontSize: 8, color: '#2563eb', fontWeight: 700 }}>ASISTENCIA</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>100%</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                      <div style={{ borderTop: '1px solid #f1f5f9', padding: 16 }}>
                        {(() => {
                        const chartScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;
                        return (
                          <>
                            {renderEVMChart(currentItem, chartScope)}
                            {renderConsumptionTable(currentItem)}
                          </>
                        );
                      })()}
                      </div>
                    </div>

                    <div className="resizer-x" onMouseDown={() => setIsResizingX2(true)}></div>

                    {/* COLUMNA DERECHA: Bitácora + Dashboard Técnico Modular */}
                    <div className="notes-section" style={{ width: `${100 - splitX2}%`, flex: 'none', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                      
                      {(() => {
                        const currentScope = panelTab === 'resumen' ? 'RESUMEN' : `CUAD_${panelTab.split('-')[1]}`;
                        
                        return (
                          <>
                            {/* 2 COLUMNAS: Izq (Checklist + Docs) | Der (Mensajes) */}
                            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                              
                              {/* COLUMNA IZQUIERDA: Checklist + Documentos */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {/* Checklist Técnico */}
                                <div style={{ padding: 16, background: '#fff', flex: 1, overflowY: 'auto' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>📝 CHECKLIST TÉCNICO</span>
                                    <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 800 }}>
                                      {state.itemChecklistItems.filter(i => i.presupuesto_item_id === currentItem.id && i.scope === currentScope && i.completado).length}/{state.itemChecklistItems.filter(i => i.presupuesto_item_id === currentItem.id && i.scope === currentScope).length}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                    <input 
                                      type="text"
                                      placeholder="Nuevo control..."
                                      value={newChecklistItem}
                                      onChange={e => setNewChecklistItem(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(currentItem.id, currentScope)}
                                      style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {state.itemChecklistItems.filter(i => i.presupuesto_item_id === currentItem.id && i.scope === currentScope && i.estado_aprobacion !== 'RECHAZADO').map(check => {
                                      const isApproved = check.estado_aprobacion === 'APROBADO';
                                      const isPending = !check.estado_aprobacion || check.estado_aprobacion === 'PENDIENTE';
                                      const isSolicitado = check.estado_aprobacion === 'SOLICITADO';
                                      const avancePct = Number(check.porcentaje_avance) || 0;
                                      const isComplete = avancePct >= 100;
                                      return (
                                        <div 
                                          key={check.id} 
                                          onClick={() => handleToggleChecklistItem(check)}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: isComplete ? '#f0fdf4' : (isApproved ? '#fafffe' : '#f8fafc'), borderRadius: 8, border: `1px solid ${isComplete ? '#bbf7d0' : (isApproved ? '#a7f3d0' : '#e2e8f0')}`, cursor: isApproved ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                                          {/* Candado SVG toggle */}
                                          {(() => {
                                            const lockClosed = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
                                            const lockOpen = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
                                            const checkIcon = <span style={{ fontSize: 12 }}>✅</span>;
                                            const icon = isComplete ? checkIcon : (isApproved ? lockOpen : lockClosed);
                                            return (
                                              <div 
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: check.id, changes: { estado_aprobacion: isApproved ? 'PENDIENTE' : 'APROBADO' } } }); 
                                                }}
                                                style={{ width: 24, height: 24, borderRadius: 6, background: isComplete ? '#dcfce7' : (isApproved ? '#ecfdf5' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}
                                                title={isApproved ? 'Bloquear' : 'Desbloquear'}>
                                                {icon}
                                              </div>
                                            );
                                          })()}
                                          {/* Texto + estado */}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 10, fontWeight: 600, color: isComplete ? '#065f46' : '#1e293b', textDecoration: isComplete ? 'line-through' : 'none' }}>
                                              {check.texto}
                                            </div>
                                            {isApproved && avancePct > 0 && avancePct < 100 && (
                                              <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ flex: 1, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                                  <div style={{ width: `${avancePct}%`, height: '100%', background: '#22c55e', borderRadius: 2 }} />
                                                </div>
                                                <span style={{ fontSize: 8, fontWeight: 800, color: '#22c55e' }}>{avancePct}%</span>
                                              </div>
                                            )}
                                            {isPending && <div style={{ fontSize: 7, color: '#94a3b8', fontWeight: 700 }}>🔒 Pendiente</div>}
                                            {isApproved && avancePct === 0 && <div style={{ fontSize: 7, color: '#10b981', fontWeight: 700 }}>✅ Aprobado</div>}
                                          </div>
                                          {/* Peso % */}
                                          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <input 
                                              type="number" 
                                              value={check.porcentaje_peso || 0}
                                              onChange={(e) => dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: check.id, changes: { porcentaje_peso: Number(e.target.value) } } })}
                                              style={{ width: 32, padding: '2px', textAlign: 'center', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 9, fontWeight: 800, color: '#3b82f6' }}
                                            />
                                            <span style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8' }}>%</span>
                                          </div>
                                          {/* ✕ gris para rechazar */}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: { id: check.id, changes: { estado_aprobacion: 'RECHAZADO' } } }); }}
                                            style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            title="Eliminar ítem">
                                            ✕
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Documentos se muestra ahora en el overlay del Visor BIM */}
                              </div>

                              {/* COLUMNA DERECHA: Mensajes */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <div className="notes-wall" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                              {(() => {
                                const filteredNotes = itemNotes.filter(n => {
                                  const nScope = n.meta?.scope || 'RESUMEN';
                                  const isSupervisionLog = n.meta?.scope === 'SUPERVISION_LOG';
                                  return nScope === currentScope || (currentScope === 'RESUMEN' && isSupervisionLog);
                                });

                                  return filteredNotes.map(note => (
                                    <div key={note.id} className="note-card" style={{ marginBottom: 16, borderLeft: note.meta?.type === 'tech_report' ? '4px solid #3b82f6' : 'none', paddingLeft: note.meta?.type === 'tech_report' ? 12 : 0 }}>
                                      <div className="note-header">
                                        <span className="note-status" style={{ background: getStatusColor(note.status) }}>{note.status || 'Recibido'}</span>
                                        {note.meta?.type === 'tech_report' && <span style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6', marginLeft: 8 }}>📑 REPORTE TÉCNICO</span>}
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginLeft: 8 }}>{note.author_name}</span>
                                        <span className="note-date">{new Date(note.created_at).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <div className="note-text" style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{note.texto}</div>
                                      {(note.photo_url || note.file_url) && (
                                        <div className="note-photo" style={{ marginTop: 8 }}>
                                          <img src={note.photo_url || note.file_url} alt="Evidencia" style={{ borderRadius: 12, maxWidth: '100%', border: '1px solid #e2e8f0' }} />
                                        </div>
                                      )}
                                      <div className="note-actions" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                        <button 
                                          onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)} 
                                          style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', padding: '4px 8px', borderRadius: 6, background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                          💬 {replyingTo === note.id ? 'Cancelar' : 'Comentar'}
                                        </button>
                                        <button onClick={() => updateNoteStatus(note.id, 'Revisado')} style={{ fontSize: 10, fontWeight: 800, color: '#eab308', padding: '4px 8px', borderRadius: 6, background: '#fefce8', border: 'none', cursor: 'pointer' }}>Revisar</button>
                                        <button onClick={() => updateNoteStatus(note.id, 'Aprobado')} style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', padding: '4px 8px', borderRadius: 6, background: '#f0fdf4', border: 'none', cursor: 'pointer' }}>Aprobar</button>
                                      </div>

                                      {/* HILOS EN ADMIN */}
                                      {(() => {
                                        const replies = state.notas?.filter(r => r.parent_id === note.id) || [];
                                        return (
                                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, borderLeft: '2px solid #f1f5f9' }}>
                                            {replies.map(r => (
                                              <div key={r.id} style={{ background: '#fff', padding: '10px 14px', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                                                  <span style={{ fontWeight: 800, color: '#1e293b' }}>{r.author_name}</span>
                                                  <span style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{r.texto}</div>
                                              </div>
                                            ))}
                                            {replyingTo === note.id && (
                                              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                <input 
                                                  type="text" 
                                                  placeholder="Responder a este reporte..." 
                                                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                                                  value={replyText}
                                                  onChange={e => setReplyText(e.target.value)}
                                                  onKeyDown={e => e.key === 'Enter' && submitReply(note.id, currentScope)}
                                                />
                                                <button onClick={() => submitReply(note.id, currentScope)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 12px', borderRadius: 10, fontWeight: 700, fontSize: 11 }}>Enviar</button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ));
                              })()}
                            </div>

                            <div className="note-input-area" style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
                              <textarea ref={noteInputRef} placeholder="Escribe un comentario o reporte técnico..." style={{ minHeight: 60 }} />
                              <div className="input-bar">
                                <select id="delegate-select" className="mini-select">
                                  <option value="">Delegar a...</option>
                                  <option value="Ing. Residente">Ing. Residente</option>
                                  <option value="Arq. Residente">Arq. Residente</option>
                                  <option value="Practicante">Practicante</option>
                                  <option value="Interventor">Interventor</option>
                                  <option value="Gerencia">Gerencia</option>
                                  <option value="Director de Proyectos">Director de Proyectos</option>
                                </select>
                                <label className="btn-file">📸 Foto<input type="file" accept="image/*" onChange={(e) => handleAddNote(e.target.files[0])} style={{ display: 'none' }} /></label>
                                <button className="btn btn-primary btn-sm" onClick={() => handleAddNote()}>Enviar</button>
                              </div>
                            </div>
                            </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="empty-notes">Selecciona un elemento para ver detalles y notas.</div>
                )}
              </div>
            </div>
          </div>
          {(isResizingX || isResizingY || isResizingX2) && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, cursor: (isResizingX || isResizingX2) ? 'col-resize' : 'row-resize', background: 'transparent' }} />
          )}
        </div>
      )}

      {showTechnicalReportModal && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
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
                 <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>💬 Comentarios</label>
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

      <style jsx>{`
        .progress-container { flex: 1; display: flex; overflow: hidden; background: #f8fafc; border-top: 1px solid var(--color-border); position: relative; }
        .viewer-side { position: relative; background: #fff; min-width: 100px; display: flex; flex-direction: column; }
        
        .resizer-x { width: 8px; cursor: col-resize; background: #f1f5f9; position: relative; z-index: 100; border-left: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .resizer-x:hover, .resizer-x:active { background: var(--color-accent); transform: scaleX(1.5); }

        .progress-side { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-width: 0; }
        
        .resizer-y { height: 8px; cursor: row-resize; background: #f1f5f9; position: relative; z-index: 100; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .resizer-y:hover, .resizer-y:active { background: var(--color-accent); transform: scaleY(1.5); }
        
        .item-list-container { background: #fff; border-radius: 0; border: none; display: flex; flex-direction: column; overflow: hidden; border-bottom: 1px solid var(--color-border); }
        .list-header { padding: 12px; border-bottom: 1px solid var(--color-border); background: #f8fafc; }
        .item-list { flex: 1; overflow-y: auto; overflow-x: auto; padding: 12px; display: flex; flex-direction: column; width: 100%; }
        .gantt-scroll-area { position: relative; }

        .gantt-split-container { display: flex; flex: 1; overflow: hidden; }
        .gantt-fixed-panel { width: 200px; flex-shrink: 0; overflow-y: auto; overflow-x: hidden; border-right: 2px solid #e2e8f0; background: #fff; scrollbar-width: none; }
        .gantt-fixed-panel::-webkit-scrollbar { display: none; }
        .gantt-fixed-header { height: 40px; display: flex; align-items: center; gap: 0; padding: 0 4px; border-bottom: 1px solid #e2e8f0; background: #f1f5f9; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; position: sticky; top: 0; z-index: 10; }
        .gantt-fixed-row { height: 50px; display: flex; align-items: center; gap: 0; padding: 0 4px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; }
        .gantt-fixed-row:hover { background: #f8fafc; }
        .gantt-fixed-row.selected { background: #eff6ff; border-left: 3px solid #6366f1; }
        .gantt-item-num { width: 36px; text-align: center; font-size: 11px; font-weight: 900; color: #6366f1; flex-shrink: 0; }
        .gantt-item-name { width: 100px; font-size: 9px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; padding: 0 4px; }
        .gantt-pred-input { width: 44px; flex-shrink: 0; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 4px; font-size: 10px; text-align: center; color: #6366f1; font-weight: 700; background: #fafaff; outline: none; transition: border 0.2s; }
        .gantt-pred-input:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
        .gantt-pred-input::placeholder { color: #cbd5e1; font-weight: 400; }
        .gantt-timeline-header { height: 40px; display: flex; border-bottom: 1px solid #eee; position: sticky; top: 0; background: #fff; z-index: 10; margin-bottom: 12px; }
        .gantt-day-col { width: 40px; border-right: 1px solid #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
        .gantt-month-label { position: absolute; top: -15px; left: 4px; font-size: 8px; font-weight: 800; color: var(--color-accent); text-transform: uppercase; }
        .gantt-day-num { font-size: 10px; color: #64748b; font-weight: 600; }
        .today-marker { position: absolute; top: 0; bottom: -10000px; width: 2px; background: #ef4444; z-index: 5; box-shadow: 0 0 5px rgba(239, 68, 68, 0.4); pointer-events: none; }
        .today-marker::after { content: 'HOY'; position: absolute; top: 0; left: 4px; font-size: 7px; color: #ef4444; font-weight: 900; }

        .gantt-rows-container { position: relative; }
        .gantt-row { height: 50px; position: relative; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; }
        .gantt-row:hover { background: #fdfdfd; }
        .gantt-row.selected { background: #f1f5f9; border-left: 3px solid var(--color-accent); }
        
        .gantt-bar-container { position: absolute; top: 8px; z-index: 3; display: flex; flex-direction: column; }
        .bar-label-above { font-size: 8px; margin-bottom: 4px; white-space: nowrap; }
        .row-cap { font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .row-name { font-weight: 700; color: #1e293b; }

        .gantt-bar-bg { height: 14px; background: #eaedf1; border-radius: 20px; overflow: hidden; position: relative; border: 1px solid #e2e8f0; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        .gantt-bar-fill { height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); min-width: 4px; }
        .bar-pct-label { position: absolute; left: 8px; top: 1px; font-size: 8px; font-weight: 800; color: #fff; }
        .gantt-bar-dates { font-size: 7px; color: #94a3b8; margin-top: 4px; font-weight: 600; white-space: nowrap; }

        .collaboration-panel { flex: 1; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 12px; border-bottom: 1px solid var(--color-border); background: #f1f5f9; }
        .detail-flex { display: flex; flex: 1; overflow: hidden; }
        .detail-config { flex: 1; border-right: 1px solid var(--color-border); padding: 12px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
        .notes-section { flex: 1.2; display: flex; flex-direction: column; overflow: hidden; }
        
        .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-static { padding: 4px 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 11px; min-height: 28px; display: flex; align-items: center; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
        .mini-table th { text-align: left; padding: 4px; border-bottom: 1px solid #eee; color: #64748b; }
        .mini-table td { padding: 4px; border-bottom: 1px solid #f8fafc; }
        .consumption-table-area h4 { font-size: 11px; font-weight: 700; margin-bottom: 4px; color: #1e293b; }

        .notes-wall { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; background: #fafafa; }
        .note-card { background: white; border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .note-header { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
        .note-status { font-size: 9px; padding: 2px 6px; border-radius: 10px; color: white; font-weight: 700; }
        .note-assigned { font-size: 8px; font-weight: 600; color: #6366f1; background: #eef2ff; padding: 2px 4px; border-radius: 4px; }
        .note-date { font-size: 9px; color: #94a3b8; flex: 1; text-align: right; }
        .note-text { font-size: 11px; line-height: 1.4; }
        .note-photo img { margin-top: 8px; width: 100%; border-radius: 6px; border: 1px solid #eee; }
        .note-actions { margin-top: 8px; display: flex; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 6px; }
        .note-actions button { border: none; background: none; cursor: pointer; font-size: 10px; font-weight: 600; }

        .note-input-area { padding: 12px; border-top: 1px solid var(--color-border); background: white; }
        .note-input-area textarea { width: 100%; height: 50px; border: 1px solid var(--color-border); border-radius: 6px; padding: 8px; font-size: 11px; resize: none; margin-bottom: 8px; }
        .input-bar { display: flex; justify-content: space-between; align-items: center; }
        .mini-select { font-size: 10px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; background: white; }
        .btn-file { font-size: 11px; color: var(--color-text-secondary); cursor: pointer; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
        .empty-notes { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; padding: 20px; text-align: center; }

        .progress-bar-container { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .progress-bar-bg { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .progress-bar-fill { height: 100%; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .progress-pct { font-size: 10px; font-weight: 800; color: var(--color-text); width: 45px; }
        .legend-panel { position: absolute; bottom: 12px; left: 12px; background: white; padding: 8px; border-radius: 8px; font-size: 10px; border: 1px solid var(--color-border); z-index: 3; }
        .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }

        .viewer-tabs { display: flex; border-bottom: 2px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; }
        .viewer-tab { flex: 1; padding: 10px 16px; border: none; background: none; cursor: pointer; font-size: 11px; font-weight: 700; color: #94a3b8; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; position: relative; }
        .viewer-tab:hover { color: #475569; background: #f1f5f9; }
        .viewer-tab.active { color: #2563eb; }
        .viewer-tab.active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: #2563eb; border-radius: 2px 2px 0 0; }
        .tab-badge { font-size: 9px; background: #3b82f6; color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 800; min-width: 16px; text-align: center; }

        .mode-toggle { display: flex; background: #e2e8f0; padding: 2px; border-radius: 6px; margin-right: 12px; }
        .btn-mode { border: none; background: none; padding: 4px 10px; font-size: 10px; font-weight: 600; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
        .btn-mode.active { background: white; color: var(--color-accent); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      `}</style>
    </>
  );
}
