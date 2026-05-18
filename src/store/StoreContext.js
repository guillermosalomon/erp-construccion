'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  loadAllData,
  insumosService,
  apuService,
  apuDetalleService,
  proyectosService,
  presupuestoService,
  bimLinksService,
  obraAvancesService,
  notesService,
  bodegaService,
  inventarioService,
  pagosService,
  personalService,
  cargosService,
  configService,
  personalProyectoService,
  checklistService,
  itemDocumentsService,
  usuariosService,
  asistenciaService,
  getUserId,
  mkTiendasService,
  mkPuntosVentaService,
  mkOfertasService,
  mkPedidosService,
  categoriasService,
  cargoDetalleService,
} from '@/lib/services';
import { calcularPrecioMercado } from '@/lib/price-engine';

const StoreContext = createContext(null);

/* ─── Helpers ─── */
const generateId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const db = () => supabase;

export const calculateEndDate = (startDate, durationDays) => {
  if (!startDate || !durationDays || durationDays <= 0 || isNaN(durationDays)) return startDate;
  
  // Limitar duración para evitar bucles infinitos por datos corruptos
  const safeDuration = Math.min(Math.ceil(durationDays), 3650); 
  
  let current = new Date(startDate);
  if (isNaN(current.getTime())) return startDate;

  // normalizar a mediodía para evitar problemas de zona horaria al sumar días
  current.setHours(12, 0, 0, 0); 
  
  let count = 1;
  while (count < safeDuration) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0) { // 0 es Domingo, lo saltamos
      count++;
    }
  }
  return current.toISOString().split('T')[0];
};

/* ─── Auto-Code Generation ─── */
const INSUMO_PREFIXES = { MATERIAL: 'MAT', MANO_OBRA: 'MO', EQUIPO: 'EQ', TRANSPORTE: 'TR' };
const APU_PREFIXES = { BASICO: 'AB', COMPUESTO: 'AC' };

function generateNextCode(existingItems, prefix) {
  const existing = existingItems
    .filter((item) => item.codigo && item.codigo.startsWith(prefix + '-'))
    .map((item) => {
      const num = parseInt(item.codigo.split('-').pop(), 10);
      return isNaN(num) ? 0 : num;
    });
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/* ─── Initial State ─── */
const initialState = {
  insumos: [],
  apus: [],
  apuDetalles: [],
  categorias: [],
  proyectos: [],
  presupuestoItems: [],
  bimLinks: [],
  agenda: [],
  avances: [],
  notas: [],
  bodegas: [],
  inventario: [],
  pagos: [],
  controlAsistencia: [],
  usuarios: [],
  personal: [],
  personalProyecto: [],
  cargos: [],
  cargoDetalles: [],
  config: [],
  itemChecklistItems: [],
  itemDocuments: [],
  bimModels: [],
  // Marketplace (Fase 14)
  mkOfertas: [],
  mkPedidos: [],
  mkPedidoItems: [],
  mkTiendas: [],
  mkPuntosVenta: [],
  mkTraspasos: [],
  mkTraspasoItems: [],
  chatCotizaciones: [],
  inmuebles: [],
  // History (Undo/Redo)
  history: [],
  historyIndex: -1,
};

/* ─── Base Reducer (Business Logic) ─── */
function baseStoreReducer(state, action) {
  switch (action.type) {
    // ── Hydration (load from Supabase) ──
    case 'LOAD_ALL': {
      const payload = action.payload || {};
      const deduplicated = {};
      
      Object.keys(payload).forEach(key => {
        if (Array.isArray(payload[key])) {
          const seen = new Set();
          deduplicated[key] = payload[key].filter(item => {
            if (!item?.id) return true;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        } else {
          deduplicated[key] = payload[key];
        }
      });

      const config = deduplicated.config || [];
      const smlv = parseFloat(config.find(c => c.clave === 'SMLV')?.valor) || 2200000;
      const h_mes = parseFloat(config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;

      // Normalize legacy category names to new role values
      const LEGACY_CAT_MAP = {
        'oficina (escritorio)': 'admin',
        'campo (móvil)': 'operativo',
        'campo (movil)': 'operativo',
        'mano de obra directa': 'cuadrilla',
        'mano de obra': 'cuadrilla',
        'comercio (ventas)': 'tienda',
        'equipo / cuadrilla': 'cuadrilla',
      };
      const VALID_ROLES = ['admin', 'oficina', 'operativo', 'cuadrilla', 'supervisor', 'bodega', 'tienda', 'cliente'];

      const cargosRecalculados = (deduplicated.cargos || []).map(cargo => {
        const factor = parseFloat(cargo.factor_smlv) || 1.0;
        let precio = smlv * factor;
        const unitNorm = cargo.unidad?.toLowerCase();
        if (unitNorm === 'hora' || unitNorm === 'hr') precio = precio / h_mes;
        else if (unitNorm === 'día' || unitNorm === 'dia') precio = (precio / h_mes) * h_dia;
        
        // Normalize categoria to role
        let cat = cargo.categoria || 'cuadrilla';
        if (!VALID_ROLES.includes(cat.toLowerCase())) {
          cat = LEGACY_CAT_MAP[cat.toLowerCase()] || 'cuadrilla';
        } else {
          cat = cat.toLowerCase();
        }
        
        return { ...cargo, categoria: cat, precio_unitario: Math.round(precio) };
      });

      const items = (deduplicated.presupuestoItems || []).map(item => {
        if (item.fecha_inicio && !item.fecha_fin) {
          const apu = (deduplicated.apus || []).find(a => a.id === item.apu_id);
          const rendimiento = parseFloat(apu?.rendimiento) || 1;
          const numCuadrillas = parseInt(item.num_cuadrillas) || 1;
          const factor = rendimiento * Math.max(1, numCuadrillas);
          const days = factor > 0 ? Math.ceil(item.cantidad / factor) : 1;
          return { ...item, fecha_fin: calculateEndDate(item.fecha_inicio, days) };
        }
        return item;
      });

      const personalReconstruido = (deduplicated.personal || []).map(p => {
        const needsSplit = (!p.nombres || p.nombres.trim() === '') && (p.nombre && p.nombre.trim() !== '');
        if (needsSplit) {
          const names = p.nombre.split(' ');
          return {
            ...p,
            nombres: names[0] || '',
            apellidos: names.slice(1).join(' ') || ''
          };
        }
        return p;
      });

      let savedBimModels = [];
      try {
        const raw = typeof window !== 'undefined' && localStorage.getItem('erp_bim_models');
        if (raw) savedBimModels = JSON.parse(raw);
      } catch (e) { /* ignore */ }

      return {
        ...state,
        ...deduplicated,
        cargos: cargosRecalculados,
        presupuestoItems: items,
        personal: personalReconstruido,
        bimModels: savedBimModels,
      };
    }
    case 'UPDATE_CONFIG': {
      const { clave, valor } = action.payload;
      const newConfig = state.config.filter(c => c.clave !== clave);
      newConfig.push({ clave, valor });

      if (clave === 'SMLV' || clave === 'HORAS_MES' || clave === 'HORAS_DIA') {
        const h_mes = parseFloat(newConfig.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
        const h_dia = parseFloat(newConfig.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
        const smlv = parseFloat(newConfig.find(c => c.clave === 'SMLV')?.valor) || 2200000;

        const updatedCargos = state.cargos.map(cargo => {
          const factor = parseFloat(cargo.factor_smlv) || 1.0;
          const fMult = parseFloat(cargo.factor_multiplicador) || 1.0;
          let precio = smlv * factor * fMult;
          const u = cargo.unidad?.toLowerCase() || '';
          if (u === 'hora' || u === 'hr') precio = precio / h_mes;
          else if (u === 'día' || u === 'dia') precio = (precio / h_mes) * h_dia;
          return { ...cargo, precio_unitario: Math.round(precio), updated_at: now() };
        });

        const updatedPersonal = state.personal.map(p => {
          const matchingCargo = updatedCargos.find(c => c.id === p.cargo_id);
          if (matchingCargo) {
            return { ...p, salario_base: matchingCargo.precio_unitario, unidad_pago: matchingCargo.unidad, updated_at: now() };
          }
          return p;
        });

        return { ...state, config: newConfig, cargos: updatedCargos, personal: updatedPersonal };
      }
      return { ...state, config: newConfig };
    }

    // ── Insumos ──
    case 'ADD_INSUMO':
      return {
        ...state,
        insumos: [...state.insumos, { ...action.payload, created_at: now(), updated_at: now() }],
      };
    case 'UPDATE_INSUMO':
      return {
        ...state,
        insumos: state.insumos.map((i) =>
          i.id === action.payload.id ? { ...i, ...action.payload, updated_at: now() } : i
        ),
      };
    case 'DELETE_INSUMO':
      return {
        ...state,
        insumos: state.insumos.filter((i) => i.id !== action.payload),
        apuDetalles: state.apuDetalles.filter((d) => d.insumo_id !== action.payload),
      };
    case 'ADD_INSUMOS_BATCH': {
      const batchItems = Array.isArray(action.payload) ? action.payload : [];
      if (batchItems.length === 0) return state;
      return {
        ...state,
        insumos: [
          ...state.insumos,
          ...batchItems.map((i) => ({
            ...i,
            created_at: now(),
            updated_at: now()
          }))
        ]
      };
    }

    // ── APU ──
    case 'ADD_APU': {
      const id = action.payload.id || generateId();
      return {
        ...state,
        apus: [...state.apus, { ...action.payload, id, created_at: now(), updated_at: now() }],
      };
    }
    case 'DUPLICATE_APU': {
      const { originalId, newId, newNombre, newCodigo, detailIds } = action.payload;
      const originalApu = state.apus.find(a => a.id === originalId);
      if (!originalApu) return state;

      const duplicatedApu = {
        ...originalApu,
        id: newId,
        nombre: newNombre,
        codigo: newCodigo,
        created_at: now(),
        updated_at: now()
      };

      const originalDetalles = state.apuDetalles.filter(d => d.apu_id === originalId);
      const duplicatedDetalles = originalDetalles.map((d, i) => ({
        ...d,
        id: detailIds[i] || `${newId}_${i}`,
        apu_id: newId,
        created_at: now()
      }));

      return {
        ...state,
        apus: [...state.apus, duplicatedApu],
        apuDetalles: [...state.apuDetalles, ...duplicatedDetalles]
      };
    }
    case 'DUPLICATE_CARGO': {
      const { originalId, newId, newNombre, newCodigo, detailIds } = action.payload;
      const original = state.cargos.find(c => c.id === originalId);
      if (!original) return state;

      const duplicated = {
        ...original,
        id: newId,
        nombre: newNombre,
        codigo: newCodigo,
        created_at: now(),
        updated_at: now()
      };

      const originalDetalles = state.cargoDetalles.filter(d => d.cargo_padre_id === originalId);
      const duplicatedDetalles = originalDetalles.map((d, i) => ({
        ...d,
        id: detailIds[i] || `${newId}_${i}`,
        cargo_padre_id: newId,
        created_at: now()
      }));

      return {
        ...state,
        cargos: [...state.cargos, duplicated],
        cargoDetalles: [...state.cargoDetalles, ...duplicatedDetalles]
      };
    }
    case 'UPDATE_APU':
      return {
        ...state,
        apus: state.apus.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload, updated_at: now() } : a
        ),
      };
    case 'DELETE_APU':
      return {
        ...state,
        apus: state.apus.filter((a) => a.id !== action.payload),
        apuDetalles: state.apuDetalles.filter(
          (d) => d.apu_id !== action.payload && d.apu_hijo_id !== action.payload
        ),
      };

    // ── APU Detalle ──
    case 'ADD_APU_DETALLE': {
      const id = action.payload.id || generateId();
      return {
        ...state,
        apuDetalles: [...state.apuDetalles, { ...action.payload, id, created_at: now() }],
      };
    }
    case 'ADD_APU_DETALLE_BATCH': {
      const items = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        apuDetalles: [
          ...state.apuDetalles,
          ...items.map(d => ({ ...d, id: d.id || generateId(), created_at: now() }))
        ]
      };
    }
    case 'UPDATE_APU_DETALLE':
      return {
        ...state,
        apuDetalles: state.apuDetalles.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload } : d
        ),
      };
    case 'DELETE_APU_DETALLE':
      return {
        ...state,
        apuDetalles: state.apuDetalles.filter((d) => d.id !== action.payload),
      };

    // ── Categorías ──
    case 'ADD_CATEGORIA':
      return {
        ...state,
        categorias: [...state.categorias, { ...action.payload, id: generateId(), created_at: now() }],
      };

    // ── Proyectos ──
    case 'ADD_PROYECTO': {
      const id = action.payload.id || generateId();
      return {
        ...state,
        proyectos: [...state.proyectos, { ...action.payload, id, created_at: now(), updated_at: now() }],
      };
    }
    case 'UPDATE_PROYECTO':
      return {
        ...state,
        proyectos: state.proyectos.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload, updated_at: now() } : p
        ),
      };
    case 'DELETE_PROYECTO':
      return {
        ...state,
        proyectos: state.proyectos.filter((p) => p.id !== action.payload),
        presupuestoItems: state.presupuestoItems.filter((pi) => pi.proyecto_id !== action.payload),
      };

    // ── Presupuesto Items ──
    case 'ADD_PRESUPUESTO_ITEM': {
      const id = action.payload.id || generateId();
      const apu = state.apus.find(a => a.id === action.payload.apu_id);
      const rendimiento = Number(apu?.rendimiento) || 1;
      const numCuadrillas = Number(action.payload.num_cuadrillas) || 1;
      const days = Math.ceil(Number(action.payload.cantidad || 0) / (rendimiento * numCuadrillas));
      const fechaFin = action.payload.fecha_inicio 
        ? calculateEndDate(action.payload.fecha_inicio, days) 
        : action.payload.fecha_fin;
      return {
        ...state,
        presupuestoItems: [...state.presupuestoItems, { ...action.payload, id, fecha_fin: fechaFin, created_at: now() }],
      };
    }
    case 'ADD_PRESUPUESTO_ITEMS_BATCH':
      return {
        ...state,
        presupuestoItems: [
          ...state.presupuestoItems,
          ...action.payload.map((item) => ({ ...item, id: item.id || generateId(), created_at: now() })),
        ],
      };
    case 'UPDATE_PRESUPUESTO_ITEM': {
      const current = state.presupuestoItems.find(i => i.id === action.payload.id);
      if (!current) return state;
      const updated = { ...current, ...action.payload };
      const cantidad = parseFloat(updated.cantidad) || 0;
      const numCuadrillas = parseInt(updated.num_cuadrillas) || 1;
      const apu = state.apus.find(a => a.id === updated.apu_id);
      const rendimiento = parseFloat(apu?.rendimiento) || 1;
      const schemaChanged = 'cantidad' in action.payload || 'num_cuadrillas' in action.payload || 'fecha_inicio' in action.payload || 'apu_id' in action.payload;
      if (schemaChanged && updated.fecha_inicio) {
        const factorComun = rendimiento * Math.max(1, numCuadrillas);
        const days = factorComun > 0 ? Math.ceil(cantidad / factorComun) : 1;
        updated.fecha_fin = calculateEndDate(updated.fecha_inicio, days);
      }
      return {
        ...state,
        presupuestoItems: state.presupuestoItems.map((pi) =>
          pi.id === action.payload.id ? { ...updated, cantidad, num_cuadrillas: numCuadrillas } : pi
        ),
      };
    }
    case 'DELETE_PRESUPUESTO_ITEM':
      return { ...state, presupuestoItems: state.presupuestoItems.filter((pi) => pi.id !== action.payload) };
    case 'CLEAR_PRESUPUESTO_ITEMS':
      return { ...state, presupuestoItems: state.presupuestoItems.filter((pi) => pi.proyecto_id !== action.payload) };

    // ── BIM Links ──
    case 'ADD_BIM_LINK':
      return { ...state, bimLinks: [...state.bimLinks, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'DELETE_BIM_LINK':
      return { ...state, bimLinks: state.bimLinks.filter((l) => l.id !== action.payload) };

    // ── Obra Avances ──
    case 'ADD_AVANCE':
      return { ...state, avances: [{ estado: 'PENDIENTE', ...action.payload, id: action.payload.id || generateId(), created_at: now() }, ...state.avances] };
    case 'UPDATE_AVANCE':
      return { ...state, avances: state.avances.map((a) => (a.id === action.payload.id ? { ...a, ...action.payload.changes } : a)) };
    case 'DELETE_AVANCE':
      return { ...state, avances: state.avances.filter((a) => a.id !== action.payload) };

    // ── Item Notes ──
    case 'ADD_NOTE': {
      const id = action.payload.id || generateId();
      return {
        ...state,
        notas: [{ ...action.payload, id, created_at: now() }, ...state.notas],
      };
    }
    case 'UPDATE_NOTE':
      return {
        ...state,
        notas: state.notas.map((n) => (n.id === action.payload.id ? { ...n, ...action.payload.changes } : n)),
      };
    case 'DELETE_NOTE':
      return {
        ...state,
        notas: state.notas.filter((n) => n.id !== action.payload),
      };

    // ── Control Asistencia (Cuadrillas) ──
    case 'ADD_ASISTENCIA':
      return {
        ...state,
        controlAsistencia: [...state.controlAsistencia, { estado: 'PENDIENTE', ...action.payload, id: action.payload.id || generateId(), created_at: now() }],
      };
    case 'UPDATE_ASISTENCIA':
      return {
        ...state,
        controlAsistencia: state.controlAsistencia.map((a) => (a.id === action.payload.id ? { ...a, ...action.payload.changes } : a)),
      };

    // ── Bodegas ──
    case 'ADD_BODEGA':
      return { ...state, bodegas: [...state.bodegas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'DELETE_BODEGA':
      return { ...state, bodegas: state.bodegas.filter((b) => b.id !== action.payload) };

    // ── Inventario Movimientos ──
    case 'ADD_INVENTARIO_MOV':
      return { ...state, inventario: [...state.inventario, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_INVENTARIO_MOV':
      return { ...state, inventario: state.inventario.map((i) => (i.id === action.payload.id ? { ...i, ...action.payload.changes } : i)) };

    // ── Marketplace ──
    case 'ADD_MK_TIENDA':
      return { ...state, mkTiendas: [...state.mkTiendas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_TIENDA':
      return { ...state, mkTiendas: state.mkTiendas.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'DELETE_MK_TIENDA_COMPLETA':
      return {
        ...state,
        mkTiendas: state.mkTiendas.filter(t => t.id !== action.payload),
        mkPuntosVenta: state.mkPuntosVenta.filter(pv => pv.tienda_id !== action.payload),
        mkOfertas: state.mkOfertas.filter(o => o.tienda_id !== action.payload),
        mkPedidos: state.mkPedidos.filter(p => p.tienda_id !== action.payload),
        personalProyecto: state.personalProyecto.filter(pp => pp.tienda_id !== action.payload)
      };

    case 'ADD_MK_PUNTO_VENTA':
      return { ...state, mkPuntosVenta: [...state.mkPuntosVenta, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_PUNTO_VENTA':
      return { ...state, mkPuntosVenta: state.mkPuntosVenta.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_PUNTO_VENTA_COMPLETA':
      return {
        ...state,
        mkPuntosVenta: state.mkPuntosVenta.filter(p => p.id !== action.payload),
        mkOfertas: state.mkOfertas.filter(o => o.punto_venta_id !== action.payload),
        mkPedidos: state.mkPedidos.filter(p => p.punto_venta_id !== action.payload),
        personalProyecto: state.personalProyecto.filter(pp => pp.punto_venta_id !== action.payload)
      };

    case 'ADD_MK_OFERTA':
      return { ...state, mkOfertas: [...state.mkOfertas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_OFERTA':
      return { ...state, mkOfertas: state.mkOfertas.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_OFERTA':
      return { ...state, mkOfertas: state.mkOfertas.filter(p => p.id !== action.payload) };

    case 'ADD_MK_PEDIDO':
      return { ...state, mkPedidos: [...state.mkPedidos, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_PEDIDO':
      return { ...state, mkPedidos: state.mkPedidos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_PEDIDO':
      return { ...state, mkPedidos: state.mkPedidos.filter(p => p.id !== action.payload) };
    case 'ADD_MK_PEDIDO_ITEM':
      return { ...state, mkPedidoItems: [...state.mkPedidoItems, { ...action.payload, id: action.payload.id || generateId() }] };

    case 'ADD_MK_TRASPASO':
      return { ...state, mkTraspasos: [...state.mkTraspasos, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_TRASPASO':
      return { ...state, mkTraspasos: state.mkTraspasos.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'ADD_MK_TRASPASO_ITEM':
      return { ...state, mkTraspasoItems: [...state.mkTraspasoItems, { ...action.payload, id: action.payload.id || generateId() }] };

    // ── Inmuebles ──
    case 'SET_INMUEBLES':
      return { ...state, inmuebles: action.payload };
    case 'ADD_INMUEBLE':
      return { ...state, inmuebles: [{ ...action.payload, id: action.payload.id || generateId(), created_at: now() }, ...state.inmuebles] };
    case 'UPDATE_INMUEBLE':
      return { ...state, inmuebles: state.inmuebles.map(i => i.id === action.payload.id ? { ...i, ...action.payload } : i) };
    case 'DELETE_INMUEBLE':
      return { ...state, inmuebles: state.inmuebles.filter(i => i.id !== action.payload) };

    // ── Pagos Cliente ──
    case 'ADD_PAGO':
      return { ...state, pagos: [...state.pagos, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'DELETE_PAGO':
      return { ...state, pagos: state.pagos.filter((p) => p.id !== action.payload) };

    // ── Agenda de Proyecto ──
    case 'ADD_AGENDA_ITEM':
      return { ...state, agenda: [{ ...action.payload, id: action.payload.id || generateId(), created_at: now(), estado: action.payload.estado || 'pendiente' }, ...state.agenda] };
    case 'UPDATE_AGENDA_ITEM':
      return { ...state, agenda: state.agenda.map((a) => (a.id === action.payload.id ? { ...a, ...action.payload.changes } : a)) };
    case 'DELETE_AGENDA_ITEM':
      return { ...state, agenda: state.agenda.filter((a) => a.id !== action.payload) };

    // ── Personal ──
    case 'ADD_PERSON':
      return { ...state, personal: [...state.personal, { ...action.payload, id: action.payload.id || generateId(), created_at: now(), updated_at: now() }] };
    case 'UPDATE_PERSON':
      return { ...state, personal: state.personal.map((p) => p.id === action.payload.id ? { ...p, ...action.payload, updated_at: now() } : p) };
    case 'DELETE_PERSON':
      return { ...state, personal: state.personal.filter((p) => p.id !== action.payload) };

    case 'ADD_CARGO': {
      const codigo = action.payload.codigo || generateNextCode(state.cargos, 'CAR');
      const id = action.payload.id || generateId();
      const smlv = parseFloat(state.config.find(c => c.clave === 'SMLV')?.valor) || 2200000;
      const h_mes = parseFloat(state.config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(state.config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
      const factor = parseFloat(action.payload.factor_smlv) || 1.0;
      const fMult = parseFloat(action.payload.factor_multiplicador) || 1.0;
      let precio = smlv * factor * fMult;
      if (action.payload.unidad === 'Hora') precio = precio / h_mes;
      if (action.payload.unidad === 'Día') precio = (precio / h_mes) * h_dia;
      return { ...state, cargos: [...state.cargos, { ...action.payload, codigo, id, precio_unitario: Math.round(precio), created_at: now(), updated_at: now() }] };
    }
    case 'UPDATE_CARGO': {
      const smlv = parseFloat(state.config.find(c => c.clave === 'SMLV')?.valor) || 2200000;
      const h_mes = parseFloat(state.config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(state.config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
      const updatedCargo = { ...action.payload };
      if (updatedCargo.factor_smlv !== undefined || updatedCargo.unidad !== undefined || updatedCargo.factor_multiplicador !== undefined) {
        const factor = parseFloat(updatedCargo.factor_smlv ?? state.cargos.find(c => c.id === action.payload.id)?.factor_smlv) || 1.0;
        const fMult = parseFloat(updatedCargo.factor_multiplicador ?? state.cargos.find(c => c.id === action.payload.id)?.factor_multiplicador) || 1.0;
        const unidad = updatedCargo.unidad ?? state.cargos.find(c => c.id === action.payload.id)?.unidad;
        let precio = smlv * factor * fMult;
        const u = unidad?.toLowerCase() || '';
        if (u === 'hora' || u === 'hr') precio = precio / h_mes;
        if (u === 'día' || u === 'dia') precio = (precio / h_mes) * h_dia;
        updatedCargo.precio_unitario = Math.round(precio);
      }
      return {
        ...state,
        cargos: state.cargos.map((c) => c.id === action.payload.id ? { ...c, ...updatedCargo, updated_at: now() } : c),
        personal: state.personal.map(p => p.cargo_id === action.payload.id ? { ...p, salario_base: updatedCargo.precio_unitario, updated_at: now() } : p)
      };
    }
    case 'DELETE_CARGO':
      return { ...state, cargos: state.cargos.filter((c) => c.id !== action.payload) };
    case 'ADD_CARGO_DETALLE':
      return { ...state, cargoDetalles: [{ ...action.payload, id: action.payload.id || generateId() }, ...state.cargoDetalles] };
    case 'UPDATE_CARGO_DETALLE':
      return { ...state, cargoDetalles: state.cargoDetalles.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };
    case 'DELETE_CARGO_DETALLE':
      return { ...state, cargoDetalles: state.cargoDetalles.filter(d => d.id !== action.payload) };

    case 'ADD_PERSON_PROYECTO':
      return { ...state, personalProyecto: [{ ...action.payload, id: action.payload.id || generateId() }, ...state.personalProyecto] };
    case 'UPDATE_PERSON_PROYECTO':
      return { ...state, personalProyecto: state.personalProyecto.map(pp => pp.id === action.payload.id ? { ...pp, ...action.payload } : pp) };
    case 'DELETE_PERSON_PROYECTO':
      return { ...state, personalProyecto: state.personalProyecto.filter(pp => pp.id !== action.payload) };
    case 'ADD_CHECKLIST_ITEM':
      return { ...state, itemChecklistItems: [...state.itemChecklistItems, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_CHECKLIST_ITEM':
      return { 
        ...state, 
        itemChecklistItems: state.itemChecklistItems.map(it => {
          if (it.id !== action.payload.id) return it;
          const { id, changes, ...rest } = action.payload;
          return { ...it, ...(changes || rest) };
        }) 
      };
    case 'DELETE_CHECKLIST_ITEM':
      return { ...state, itemChecklistItems: state.itemChecklistItems.filter(it => it.id !== action.payload) };
    case 'ADD_ITEM_DOCUMENT':
      return { ...state, itemDocuments: [...state.itemDocuments, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'DELETE_ITEM_DOCUMENT':
      return { ...state, itemDocuments: state.itemDocuments.filter(d => d.id !== action.payload) };
    case 'ADD_BIM_MODEL': {
      const newModels = [...state.bimModels, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }];
      try { localStorage.setItem('erp_bim_models', JSON.stringify(newModels)); } catch(e) {}
      return { ...state, bimModels: newModels };
    }
    case 'UPDATE_BIM_MODEL': {
      const newModels = state.bimModels.map(m => m.id === action.payload.id ? { ...m, ...action.payload, updated_at: now() } : m);
      try { localStorage.setItem('erp_bim_models', JSON.stringify(newModels)); } catch(e) {}
      return { ...state, bimModels: newModels };
    }
    case 'DELETE_BIM_MODEL': {
      const newModels = state.bimModels.filter(m => m.id !== action.payload);
      try { localStorage.setItem('erp_bim_models', JSON.stringify(newModels)); } catch(e) {}
      return { ...state, bimModels: newModels };
    }

    default:
      return state;
  }
}

/* ─── Wrapper Reducer (History + Exceptions) ─── */
function storeReducer(state, action) {
  try {
    if (action.type === 'UNDO') {
      if (!state.history || state.history.length === 0) return state;
      const newHistory = [...state.history];
      const prevState = newHistory.pop();
      const { history: _h, future: _f, ...currentState } = state;
      return { ...prevState, history: newHistory, future: [currentState, ...(state.future || [])] };
    }
    if (action.type === 'REDO') {
      if (!state.future || state.future.length === 0) return state;
      const newFuture = [...state.future];
      const nextState = newFuture.shift();
      const { history: _h, future: _f, ...currentState } = state;
      return { ...nextState, history: [...(state.history || []), currentState], future: newFuture };
    }

    const nextState = baseStoreReducer(state, action);

    const shouldSaveToHistory = !['LOAD_ALL', 'UPDATE_CONFIG'].includes(action.type) && nextState !== state;
    if (shouldSaveToHistory) {
      const { history, future, ...stateToSave } = state;
      return {
        ...nextState,
        history: [...(state.history || []), stateToSave].slice(-20),
        future: []
      };
    }
    return nextState;
  } catch (e) {
    console.error(`🔴 [StoreReducer] Error en "${action.type}": ${e.message}`);
    return state;
  }
}

/* ─── Sync Engine (Sequential Queue to avoid Race Conditions) ─── */
let syncQueue = Promise.resolve();

async function syncToSupabase(action, state) {
  if (!isSupabaseConfigured()) return;

  console.log(`[Sync Engine] Processing ${action.type}...`);
  syncQueue = syncQueue.then(async () => {
    try {
      switch (action.type) {
        // Categorías
        case 'ADD_CATEGORIA':
          await categoriasService.create(action.payload);
          break;

        // Insumos
        case 'ADD_INSUMO':
          await insumosService.create(action.payload);
          break;
        case 'UPDATE_INSUMO':
          await insumosService.update(action.payload.id, action.payload);
          break;
        case 'DELETE_INSUMO':
          await insumosService.remove(action.payload);
          break;
        case 'ADD_INSUMOS_BATCH':
          if (Array.isArray(action.payload)) {
            await insumosService.createBatch(action.payload);
          }
          break;

        // APU
        case 'ADD_APU': {
          const { v_presupuesto, costo_total, ...apuClean } = action.payload;
          try {
            await apuService.create(apuClean);
          } catch (e) {
            if (e?.code === 'PGRST204' || e?.message?.includes('schema cache')) {
              // Campo desconocido — reintenta sin campos problemáticos
              const { categoria_apu, ...saferPayload } = apuClean;
              console.warn('[Sync] Reintentando ADD_APU sin campos desconocidos');
              try { await apuService.create(saferPayload); } catch(e2) { console.warn('[Sync] ADD_APU fallback:', e2.message); }
            } else throw e;
          }
          break;
        }
        case 'UPDATE_APU': {
          const { v_presupuesto: _vp, costo_total: _ct, ...apuUpdateClean } = action.payload;
          try {
            await apuService.update(apuUpdateClean.id, apuUpdateClean);
          } catch (e) {
            if (e?.code === 'PGRST204' || e?.message?.includes('schema cache')) {
              const { categoria_apu, ...saferPayload } = apuUpdateClean;
              console.warn('[Sync] Reintentando UPDATE_APU sin campos desconocidos');
              try { await apuService.update(saferPayload.id, saferPayload); } catch(e2) { console.warn('[Sync] UPDATE_APU fallback:', e2.message); }
            } else throw e;
          }
          break;
        }
        case 'DELETE_APU':
          await apuService.remove(action.payload);
          break;

        case 'DUPLICATE_APU': {
          const { newId } = action.payload;
          const apu = state.apus.find(a => a.id === newId);
          const detalles = state.apuDetalles.filter(d => d.apu_id === newId);
          if (apu) {
            const { v_presupuesto, costo_total, ...apuClean } = apu;
            await apuService.create(apuClean);
            if (detalles.length > 0) {
              await apuDetalleService.createBatch(detalles);
            }
          }
          break;
        }

        // APU Detalle
        case 'ADD_APU_DETALLE_BATCH':
          if (Array.isArray(action.payload)) {
            await apuDetalleService.createBatch(action.payload);
          }
          break;
        case 'ADD_APU_DETALLE': {
          await apuDetalleService.create({ 
            id: action.payload.id, 
            apu_id: action.payload.apu_id, 
            insumo_id: action.payload.insumo_id, 
            cargo_id: action.payload.cargo_id, 
            apu_hijo_id: action.payload.apu_hijo_id, 
            cantidad: action.payload.cantidad, 
            desperdicio_pct: action.payload.desperdicio_pct,
            unidad_detalle: action.payload.unidad_detalle,
            rendimiento: action.payload.rendimiento,
            herramienta_menor_pct: action.payload.herramienta_menor_pct || 0
          });
          break;
        }
        case 'UPDATE_APU_DETALLE': {
          // Solo enviar campos que existen en la tabla de Supabase
          const { id, apu_id, insumo_id, cargo_id, apu_hijo_id, cantidad, desperdicio_pct, unidad_detalle, rendimiento, herramienta_menor_pct } = action.payload;
          const cleanDetalle = { apu_id, insumo_id, cargo_id, apu_hijo_id, cantidad, desperdicio_pct, unidad_detalle, rendimiento, herramienta_menor_pct: herramienta_menor_pct || 0 };
          // Limpiar undefineds
          Object.keys(cleanDetalle).forEach(k => cleanDetalle[k] === undefined && delete cleanDetalle[k]);
          await apuDetalleService.update(id, cleanDetalle);
          break;
        }
        case 'DELETE_APU_DETALLE':
          await apuDetalleService.remove(action.payload);
          break;

        // Proyectos
        case 'ADD_PROYECTO': {
          const sanitized = { 
            ...action.payload, 
            fecha_inicio: action.payload.fecha_inicio || null,
            fecha_fin: action.payload.fecha_fin || null
          };
          await proyectosService.create(sanitized);
          break;
        }
        case 'UPDATE_PROYECTO': {
          const sanitized = { 
            ...action.payload, 
            fecha_inicio: action.payload.fecha_inicio || null,
            fecha_fin: action.payload.fecha_fin || null
          };
          await proyectosService.update(action.payload.id, sanitized);
          break;
        }
        case 'DELETE_PROYECTO':
          await proyectosService.remove(action.payload);
          break;

        // Presupuesto
        case 'ADD_PRESUPUESTO_ITEM': {
          const uid = await getUserId();
          await presupuestoService.create({ ...action.payload, user_id: uid });
          break;
        }
        case 'ADD_PRESUPUESTO_ITEMS_BATCH': {
          await presupuestoService.createBatch(action.payload);
          break;
        }
        case 'UPDATE_PRESUPUESTO_ITEM': {
          await presupuestoService.update(action.payload.id, action.payload);
          break;
        }
        case 'DELETE_PRESUPUESTO_ITEM':
          await presupuestoService.remove(action.payload);
          break;
        case 'CLEAR_PRESUPUESTO_ITEMS':
          await presupuestoService.removeByProyecto(action.payload);
          break;

        // BIM Links
        case 'ADD_BIM_MODEL':
          // LocalStorage solo por ahora
          break;
        case 'UPDATE_BIM_MODEL':
          break;
        case 'DELETE_BIM_MODEL':
          break;

        case 'ADD_INMUEBLE':
          await supabase.from('inmuebles').insert([action.payload]);
          break;
        case 'UPDATE_INMUEBLE':
          await supabase.from('inmuebles').update(action.payload).eq('id', action.payload.id);
          break;
        case 'DELETE_INMUEBLE':
          await supabase.from('inmuebles').delete().eq('id', action.payload);
          break;

        case 'ADD_BIM_LINK':
          await bimLinksService.create(action.payload);
          break;
        case 'DELETE_BIM_LINK':
          await bimLinksService.remove(action.payload);
          break;

        // Obra Avances
        case 'ADD_AVANCE':
          await obraAvancesService.create(action.payload);
          break;
        case 'DELETE_AVANCE':
          await obraAvancesService.remove(action.payload);
          break;

        // Item Notes
        case 'ADD_NOTE': {
          try {
            await notesService.create(action.payload);
          } catch (err) {
            const msg = err.message || '';
            if (msg.includes('column') || msg.includes('cache')) {
              // Fallback: Quitar campos nuevos si el esquema aún no se ha actualizado en la caché
              const { author_id, author_name, file_url, meta, ...clean } = action.payload;
              await notesService.create(clean);
            } else throw err;
          }
          break;
        }
        case 'UPDATE_NOTE': {
          const { id, changes, ...rest } = action.payload;
          const finalChanges = changes || rest;
          if (id && Object.keys(finalChanges).length > 0) {
            await notesService.update(id, finalChanges);
          }
          break;
        }
        case 'DELETE_NOTE':
          await notesService.remove(action.payload);
          break;

        // Bodegas
        case 'ADD_BODEGA':
          await bodegaService.create(action.payload);
          break;
        case 'DELETE_BODEGA':
          await bodegaService.remove(action.payload);
          break;

        // Inventario
        case 'ADD_INVENTARIO_MOV': {
          try {
            await inventarioService.create(action.payload);
          } catch (err) {
            if (err.message?.includes('column') || err.message?.includes('cache')) {
              // Si falla por columnas nuevas, intentamos con lo mínimo indispensable (Fase 1)
              const { user_id, costo_real, distribuidor, comprobante_url, presupuesto_item_id, ...clean } = action.payload;
              await inventarioService.create(clean);
            } else throw err;
          }
          break;
        }
        case 'UPDATE_INVENTARIO_MOV': {
          const { id, changes, ...rest } = action.payload;
          const finalChanges = changes || rest;
          if (id && Object.keys(finalChanges).length > 0) {
            await inventarioService.update(id, finalChanges);
          }
          break;
        }

        // Pagos
        case 'ADD_PAGO': {
          try {
            await pagosService.create(action.payload);
          } catch (err) {
            if (err.message?.includes('column') || err.message?.includes('cache')) {
              // Intentar salvar lo esencial si el esquema es viejo
              const { user_id, iva, retencion_garantia, valor_neto, ...clean } = action.payload;
              await pagosService.create({ 
                ...clean, 
                valor_neto: action.payload.valor_neto || action.payload.valor_bruto 
              });
            } else throw err;
          }
          break;
        }
        case 'DELETE_PAGO':
          await pagosService.remove(action.payload);
          break;

        // Personal
        case 'ADD_PERSON': {
          const addPersonSanitized = {
            id: action.payload.id,
            nombre: [action.payload.nombres, action.payload.apellidos].filter(Boolean).join(' ') || action.payload.nombre || 'Sin Nombre',
            email: action.payload.email || null,
            cargo_id: (action.payload.cargo_id && action.payload.cargo_id.length === 36) ? action.payload.cargo_id : null,
            cargos_ids: Array.isArray(action.payload.cargos_ids) ? action.payload.cargos_ids : [],
            telefono: action.payload.telefono || null,
            whatsapp: action.payload.whatsapp || null,
            telegram_id: action.payload.telegram_id || null,
            salario_base: action.payload.salario_base || 0,
            profesion: action.payload.profesion || '',
            unidad_pago: action.payload.unidad_pago || 'Mes',
            factor_smlv: parseFloat(action.payload.factor_smlv) || null,
            tipo_documento: action.payload.tipo_documento || 'CC',
            cedula: action.payload.cedula || null,
            foto_url: action.payload.foto_url || null,
            cedula_url: action.payload.cedula_url || null,
            tp_numero: action.payload.tp_numero || null,
            tp_url: action.payload.tp_url || null,
            arl_numero: action.payload.arl_numero || null,
            arl_url: action.payload.arl_url || null,
            portafolio_url: action.payload.portafolio_url || null,
            portafolio_nombre: action.payload.portafolio_nombre || null,
            hoja_vida_url: action.payload.hoja_vida_url || null,
            hoja_vida_nombre: action.payload.hoja_vida_nombre || null,
            diplomas_url: action.payload.diplomas_url || null,
            diplomas_nombre: action.payload.diplomas_nombre || null,
            ciudad: action.payload.ciudad || null,
            direccion_residencia: action.payload.direccion_residencia || null,
            pais: action.payload.pais || 'Colombia',
            app_role: action.payload.app_role || 'cuadrilla',
            posgrados: Array.isArray(action.payload.posgrados) ? action.payload.posgrados : [],
            salarios_por_cargo: action.payload.salarios_por_cargo || {},
          };
          Object.keys(addPersonSanitized).forEach(k => addPersonSanitized[k] === undefined && delete addPersonSanitized[k]);

          // Si tiene cargo_id, verificar que el cargo exista en Supabase primero
          if (addPersonSanitized.cargo_id) {
            const cargoLocal = state.cargos.find(c => c.id === addPersonSanitized.cargo_id);
            if (cargoLocal) {
              try {
                await cargosService.create({
                  id: cargoLocal.id, codigo: cargoLocal.codigo, nombre: cargoLocal.nombre,
                  categoria: cargoLocal.categoria || 'Mano de Obra Directa', factor_smlv: cargoLocal.factor_smlv || 1.0,
                  unidad: cargoLocal.unidad || 'Mes', precio_unitario: cargoLocal.precio_unitario || 0,
                });
              } catch (e) { console.warn('[Sync] Pre-sync cargo:', e.message); }
            }
          }

          // Recursive save: strip offending columns on schema errors
          const savePersonCreate = async (payload, attempt = 0) => {
            if (attempt > 10) { console.error('🔴 [Sync] ADD_PERSON: Too many retries'); return; }
            try {
              await personalService.create(payload);
              console.log("[Sync] ADD_PERSON Success:", payload.id);
            } catch (err) {
              const msg = err.message || '';
              // Extract column name from "Could not find the 'xxx' column"
              const colMatch = msg.match(/Could not find the '(\w+)'/);
              if (colMatch) {
                console.warn(`[Sync] ADD_PERSON: Stripping column '${colMatch[1]}' and retrying...`);
                delete payload[colMatch[1]];
                return savePersonCreate(payload, attempt + 1);
              }
              if (msg.includes('foreign key') || msg.includes('cargo_id')) {
                payload.cargo_id = null;
                return savePersonCreate(payload, attempt + 1);
              }
              console.error('🔴 [Sync Error] ADD_PERSON:', msg);
            }
          };
          await savePersonCreate(addPersonSanitized);
          break;
        }
        case 'UPDATE_PERSON': {
          const fullName = [action.payload.nombres, action.payload.apellidos].filter(Boolean).join(' ');
          const updPersonSanitized = {
            nombre: fullName || action.payload.nombre || 'Sin Nombre',
            email: action.payload.email || null,
            cargo_id: (action.payload.cargo_id && action.payload.cargo_id.length === 36) ? action.payload.cargo_id : null,
            cargos_ids: Array.isArray(action.payload.cargos_ids) ? action.payload.cargos_ids : [],
            telefono: action.payload.telefono || null,
            whatsapp: action.payload.whatsapp || null,
            telegram_id: action.payload.telegram_id || null,
            salario_base: action.payload.salario_base || 0,
            profesion: action.payload.profesion || '',
            unidad_pago: action.payload.unidad_pago || 'Mes',
            factor_smlv: parseFloat(action.payload.factor_smlv) || null,
            tipo_documento: action.payload.tipo_documento || 'CC',
            cedula: action.payload.cedula || null,
            foto_url: action.payload.foto_url || null,
            cedula_url: action.payload.cedula_url || null,
            tp_numero: action.payload.tp_numero || null,
            tp_url: action.payload.tp_url || null,
            arl_numero: action.payload.arl_numero || null,
            arl_url: action.payload.arl_url || null,
            portafolio_url: action.payload.portafolio_url || null,
            portafolio_nombre: action.payload.portafolio_nombre || null,
            hoja_vida_url: action.payload.hoja_vida_url || null,
            hoja_vida_nombre: action.payload.hoja_vida_nombre || null,
            diplomas_url: action.payload.diplomas_url || null,
            diplomas_nombre: action.payload.diplomas_nombre || null,
            ciudad: action.payload.ciudad || null,
            direccion_residencia: action.payload.direccion_residencia || null,
            pais: action.payload.pais || 'Colombia',
            app_role: action.payload.app_role || 'cuadrilla',
            posgrados: Array.isArray(action.payload.posgrados) ? action.payload.posgrados : [],
            salarios_por_cargo: action.payload.salarios_por_cargo || {},
          };
          Object.keys(updPersonSanitized).forEach(k => updPersonSanitized[k] === undefined && delete updPersonSanitized[k]);

          // Pre-sync cargo si existe
          if (updPersonSanitized.cargo_id) {
            const cargoLocal = state.cargos.find(c => c.id === updPersonSanitized.cargo_id);
            if (cargoLocal) {
              try {
                await cargosService.create({
                  id: cargoLocal.id, codigo: cargoLocal.codigo, nombre: cargoLocal.nombre,
                  categoria: cargoLocal.categoria || 'Mano de Obra Directa', factor_smlv: cargoLocal.factor_smlv || 1.0,
                  unidad: cargoLocal.unidad || 'Mes', precio_unitario: cargoLocal.precio_unitario || 0,
                });
              } catch (e) { console.warn('[Sync] Pre-sync cargo:', e.message); }
            }
          }

          // Recursive save: strip offending columns on schema errors
          const savePersonUpdate = async (id, payload, attempt = 0) => {
            if (attempt > 10) { console.error('🔴 [Sync] UPDATE_PERSON: Too many retries'); return; }
            try {
              await personalService.update(id, payload);
              console.log("[Sync] UPDATE_PERSON Success");
            } catch (err) {
              const msg = err.message || '';
              const colMatch = msg.match(/Could not find the '(\w+)'/);
              if (colMatch) {
                console.warn(`[Sync] UPDATE_PERSON: Stripping column '${colMatch[1]}' and retrying...`);
                delete payload[colMatch[1]];
                return savePersonUpdate(id, payload, attempt + 1);
              }
              if (msg.includes('foreign key') || msg.includes('cargo_id')) {
                payload.cargo_id = null;
                return savePersonUpdate(id, payload, attempt + 1);
              }
              console.error('🔴 [Sync Error] UPDATE_PERSON:', msg);
            }
          };
          await savePersonUpdate(action.payload.id, updPersonSanitized);
          // Cross-sync dirección → Cliente CRM
          if (action.payload.email && (action.payload.direccion_residencia || action.payload.ciudad)) {
            try {
              const linkedClient = state.clientes.find(c => c.email === action.payload.email || c.telegram_id === action.payload.telegram_id);
              if (linkedClient) {
                const crmUpdates = {};
                if (action.payload.direccion_residencia) crmUpdates.direccion = action.payload.direccion_residencia;
                if (action.payload.ciudad) crmUpdates.ciudad = action.payload.ciudad;
                if (Object.keys(crmUpdates).length > 0) {
                  await clientesService.update(linkedClient.id, crmUpdates);
                  console.log('[Sync] Cross-sync dirección Personal → CRM:', linkedClient.nombre);
                }
              }
            } catch (e) { console.warn('[Sync] Cross-sync dirección error:', e.message); }
          }
          break;
        }
        case 'DELETE_PERSON':
          await personalService.remove(action.payload);
          break;

        // Cargos
        case 'ADD_CARGO': {
          const codigo = action.payload.codigo || `CAR-${Date.now()}`;
          const smlvVal = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
          const hMes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
          const hDia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
          const factorVal = parseFloat(action.payload.factor_smlv) || 1.0;
          let precioCalc = smlvVal * factorVal;
          if (action.payload.unidad === 'Hora') precioCalc = precioCalc / hMes;
          if (action.payload.unidad === 'Día') precioCalc = (precioCalc / hMes) * hDia;

          // Solo campos conocidos de la tabla 'cargos'
          const cargoToSync = {
            id: action.payload.id,
            codigo,
            nombre: action.payload.nombre,
            categoria: action.payload.categoria || 'Mano de Obra Directa',
            factor_smlv: factorVal,
            unidad: action.payload.unidad || 'Mes',
            precio_unitario: Math.round(precioCalc),
            tipo: action.payload.tipo || 'individual',
          };

          try {
            await cargosService.create(cargoToSync);
            console.log("[Sync] ADD_CARGO Success:", cargoToSync.nombre, "(tipo:", cargoToSync.tipo, ")");
          } catch (err) {
            // Si falla por columna 'tipo' que no existe, reintentar sin ella
            if (err.message?.includes('column') || err.message?.includes('tipo')) {
              try {
                const { tipo, ...withoutTipo } = cargoToSync;
                await cargosService.create(withoutTipo);
                console.log("[Sync] ADD_CARGO Success (sin tipo):", cargoToSync.nombre);
              } catch (err2) {
                console.error("🔴 [Sync Error] ADD_CARGO:", err2.message);
              }
            } else {
              console.error("🔴 [Sync Error] ADD_CARGO:", err.message);
            }
          }
          break;
        }
        case 'UPDATE_CARGO':
          try {
            await cargosService.update(action.payload.id, action.payload);
          } catch (err) {
            if (err.message?.includes('column') || err.message?.includes('cache')) {
              const { recargo_cop, recargo_pct, factor_multiplicador, ...clean } = action.payload;
              await cargosService.update(action.payload.id, clean);
            } else throw err;
          }
          break;
        case 'DELETE_CARGO':
          await cargosService.remove(action.payload);
          break;

        case 'DUPLICATE_CARGO': {
          const { newId } = action.payload;
          const cargo = state.cargos.find(c => c.id === newId);
          const detalles = state.cargoDetalles.filter(d => d.cargo_padre_id === newId);
          if (cargo) {
            await cargosService.create(cargo);
            if (detalles.length > 0) {
              await cargoDetalleService.createBatch(detalles);
            }
          }
          break;
        }

        case 'ADD_CARGO_DETALLE':
        case 'UPDATE_CARGO_DETALLE': {
          try {
            const detallePayload = { 
              id: action.payload.id || crypto.randomUUID(),
              cargo_padre_id: action.payload.cargo_padre_id,
              cargo_hijo_id: action.payload.cargo_hijo_id,
              cantidad: action.payload.cantidad || 1,
              factor_smlv: action.payload.factor_smlv || null,
            };

            // Pre-sync: asegurar que AMBOS cargos (padre e hijo) existen en Supabase
            const ensureCargoExists = async (cargoId) => {
              if (!cargoId) return;
              const cargoLocal = state.cargos.find(c => c.id === cargoId);
              if (!cargoLocal) return;
              try {
                // Usar cargosService.create que agrega user_id (requerido por RLS)
                await cargosService.create({
                  id: cargoLocal.id,
                  codigo: cargoLocal.codigo,
                  nombre: cargoLocal.nombre,
                  categoria: cargoLocal.categoria || 'Mano de Obra Directa',
                  factor_smlv: cargoLocal.factor_smlv || 1.0,
                  unidad: cargoLocal.unidad || 'Mes',
                  precio_unitario: cargoLocal.precio_unitario || 0,
                });
                console.log(`[Sync] Pre-synced cargo: ${cargoLocal.nombre}`);
              } catch (e) { console.warn(`[Sync] Pre-sync cargo ${cargoLocal.nombre}:`, e.message); }
            };

            await ensureCargoExists(detallePayload.cargo_padre_id);
            await ensureCargoExists(detallePayload.cargo_hijo_id);

            // Usar cargoDetalleService que agrega user_id (requerido por RLS)
            try {
              await cargoDetalleService.create(detallePayload);
              console.log(`[Sync] ${action.type} Success:`, detallePayload.id);
            } catch (insertErr) {
              // Si falla insert por duplicado, intentar con upsert directo
              if (insertErr.message?.includes('duplicate') || insertErr.message?.includes('unique')) {
                const uid = await getUserId();
                const { error: upErr } = await db().from('cargo_detalle').upsert({ ...detallePayload, user_id: uid }, { onConflict: 'id' });
                if (upErr) console.warn(`⚠️ ${action.type} upsert:`, upErr.message);
                else console.log(`[Sync] ${action.type} Success (upsert)`);
              } else {
                // Quitar campos opcionales e intentar de nuevo
                console.warn(`[Sync] ${action.type} insert failed: ${insertErr.message}. Retrying with minimal...`);
                const minPayload = { id: detallePayload.id, cargo_padre_id: detallePayload.cargo_padre_id, cargo_hijo_id: detallePayload.cargo_hijo_id, cantidad: detallePayload.cantidad || 1 };
                try {
                  await cargoDetalleService.create(minPayload);
                  console.log(`[Sync] ${action.type} Success (minimal)`);
                } catch (minErr) {
                  console.error(`🔴 [Sync Error] ${action.type}:`, minErr.message);
                }
              }
            }
          } catch (err) {
            console.warn(`⚠️ ${action.type}:`, err.message);
          }
          break;
        }
        case 'DELETE_CARGO_DETALLE':
          try {
            await cargoDetalleService.remove(action.payload);
          } catch (err) {
            if (err.message?.includes('table') || err.message?.includes('cache')) {
              console.warn("⚠️ Cargo Detalle table not found.");
            } else throw err;
          }
          break;

        case 'ADD_PERSON_PROYECTO':
        case 'UPDATE_PERSON_PROYECTO':
          try {
            console.log(`[Sync] ${action.type} payload:`, action.payload);
            // Intentar con todos los campos primero
            let ppSanitized = {
              id: action.payload.id,
              personal_id: action.payload.personal_id,
              proyecto_id: action.payload.proyecto_id,
              cargo_id: action.payload.cargo_id || null,
              equipo_padre_id: action.payload.equipo_padre_id || null,
              unidades_asignadas: action.payload.unidades_asignadas || 0,
              salario_pactado: action.payload.salario_pactado || 0,
              unidad_pactada: action.payload.unidad_pactada || 'Mes',
            };
            // Intentar con campos opcionales
            try {
              ppSanitized.tareas_asignadas = action.payload.tareas_asignadas || [];
              ppSanitized.cuadrilla_idx = action.payload.cuadrilla_idx || 0;
              await personalProyectoService.create(ppSanitized);
              console.log(`[Sync] ${action.type} Success (full)`);
            } catch (fullErr) {
              // Si falla por columnas, reintentar solo con las básicas
              console.warn(`[Sync] ${action.type} full failed: ${fullErr.message}. Retrying with core columns...`);
              const corePayload = {
                id: action.payload.id,
                personal_id: action.payload.personal_id,
                proyecto_id: action.payload.proyecto_id,
                cargo_id: action.payload.cargo_id || null,
                unidades_asignadas: action.payload.unidades_asignadas || 0,
                salario_pactado: action.payload.salario_pactado || 0,
                unidad_pactada: action.payload.unidad_pactada || 'Mes',
              };
              await personalProyectoService.create(corePayload);
              console.log(`[Sync] ${action.type} Success (core)`);
            }
          } catch (err) {
            console.error(`🔴 [Sync Error] ${action.type}:`, err.message);
          }
          break;
        case 'DELETE_PERSON_PROYECTO':
          try {
            if (db()) {
              await db().from('personal_proyecto').delete().eq('id', action.payload);
            }
          } catch (err) {
            console.error("⚠️ Error delete personal_proyecto:", err.message);
          }
          break;

        // Configuración Global
        case 'UPDATE_CONFIG': {
          await configService.upsert(action.payload.clave, action.payload.valor);
          // Si cambia el SMLV, forzar actualización masiva en DB para personal vinculado
          if (action.payload.clave === 'SMLV') {
            const smlv = parseFloat(action.payload.valor) || 2200000;
            const h_mes = parseFloat(state.config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
            const h_dia = parseFloat(state.config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
            for (const cargo of state.cargos) {
              const factor = parseFloat(cargo.factor_smlv) || 1.0;
              let precio = smlv * factor;
              const u = cargo.unidad?.toLowerCase() || '';
              if (u === 'hora' || u === 'hr') precio = precio / h_mes;
              else if (u === 'día' || u === 'dia') precio = (precio / h_mes) * h_dia;
              const newPrecio = Math.round(precio);

              await personalService.updateByCargoId(cargo.id, { 
                salario_base: newPrecio,
                unidad_pago: cargo.unidad 
              });
            }
          }
          break;
        }

        // --- Gestión Técnica (Checklist & Documentos) ---
        case 'ADD_CHECKLIST_ITEM':
          await checklistService.create(action.payload);
          break;
        case 'UPDATE_CHECKLIST_ITEM': {
          const { id, changes, ...rest } = action.payload;
          const finalChanges = changes || rest;
          if (id && Object.keys(finalChanges).length > 0) {
            await checklistService.update(id, finalChanges);
          }
          break;
        }
        case 'DELETE_CHECKLIST_ITEM':
          await checklistService.remove(action.payload);
          break;
        case 'ADD_ITEM_DOCUMENT':
          try {
            await itemDocumentsService.create(action.payload);
          } catch (docErr) {
            // Si la tabla no tiene columna 'meta', reintentar sin ella
            const { meta, ...basicPayload } = action.payload;
            await itemDocumentsService.create(basicPayload);
          }
          break;
        case 'DELETE_ITEM_DOCUMENT':
          await itemDocumentsService.remove(action.payload);
          break;
        case 'ADD_ASISTENCIA':
          await asistenciaService.create(action.payload);
          break;
        case 'UPDATE_ASISTENCIA':
          await asistenciaService.update(action.payload.id, action.payload.changes);
          break;
        case 'ADD_AVANCE':
          try {
            await obraAvancesService.create(action.payload);
          } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('column') || msg.includes('schema cache')) {
              console.warn("⚠️ Base de datos desactualizada. Reintentando solo con campos básicos.");
              const { foto_url, comentario, meta, ...basic } = action.payload;
              await obraAvancesService.create(basic);
            } else throw err;
          }
          break;
        case 'ADD_NOTE':
          try {
            await notesService.create(action.payload);
          } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('column') || msg.includes('schema cache')) {
              console.warn("⚠️ Tabla de notas desactualizada. Reintentando con campos básicos.");
              const { texto, presupuesto_item_id, meta, author_id } = action.payload;
              await notesService.create({ texto, presupuesto_item_id, meta, author_id });
            } else throw err;
          }
          break;

        // ── Marketplace Sync ──
        case 'ADD_MK_TIENDA':
          try { await mkTiendasService.create(action.payload); } catch(e) { console.warn('⚠️ mk_tiendas sync:', e.message); }
          break;
        case 'UPDATE_MK_TIENDA':
          try { await mkTiendasService.update(action.payload.id, action.payload); } catch(e) { console.warn('⚠️ mk_tiendas sync:', e.message); }
          break;
        case 'DELETE_MK_TIENDA':
        case 'DELETE_MK_TIENDA_COMPLETA':
          try { await mkTiendasService.remove(action.payload); } catch(e) { console.warn('⚠️ mk_tiendas sync:', e.message); }
          break;
        case 'ADD_MK_PUNTO_VENTA':
          try { await mkPuntosVentaService.create(action.payload); } catch(e) { console.warn('⚠️ mk_puntos_venta sync:', e.message); }
          break;
        case 'UPDATE_MK_PUNTO_VENTA':
          try { await mkPuntosVentaService.update(action.payload.id, action.payload); } catch(e) { console.warn('⚠️ mk_puntos_venta sync:', e.message); }
          break;
        case 'DELETE_MK_PUNTO_VENTA':
        case 'DELETE_MK_PUNTO_VENTA_COMPLETA':
          try { await mkPuntosVentaService.remove(action.payload); } catch(e) { console.warn('⚠️ mk_puntos_venta sync:', e.message); }
          break;
        case 'ADD_MK_OFERTA':
          try { await mkOfertasService.create(action.payload); } catch(e) { console.warn('⚠️ mk_ofertas sync:', e.message); }
          break;
        case 'UPDATE_MK_OFERTA':
          try { await mkOfertasService.update(action.payload.id, action.payload); } catch(e) { console.warn('⚠️ mk_ofertas sync:', e.message); }
          break;
        case 'DELETE_MK_OFERTA':
          try { await mkOfertasService.remove(action.payload); } catch(e) { console.warn('⚠️ mk_ofertas sync:', e.message); }
          break;
        case 'ADD_MK_PEDIDO':
          try { await mkPedidosService.create(action.payload); } catch(e) { console.warn('⚠️ mk_pedidos sync:', e.message); }
          break;
        case 'UPDATE_MK_PEDIDO':
          try { await mkPedidosService.update(action.payload.id, action.payload); } catch(e) { console.warn('⚠️ mk_pedidos sync:', e.message); }
          break;
        case 'DELETE_MK_PEDIDO':
          try { await mkPedidosService.remove(action.payload); } catch(e) { console.warn('⚠️ mk_pedidos sync:', e.message); }
          break;
      }
    } catch (err) {
      console.error(`🔴 [Sync Error] ${action.type}:`, err.message || err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-error', { 
          detail: `Fallo al sincronizar ${action.type}: ${err.message || 'Error desconocido'}` 
        }));
      }
    }
  });
}

/* ─── Provider ─── */
export function StoreProvider({ children }) {
  const [state, baseDispatch] = useReducer(storeReducer, initialState);
  const [dataLoading, setDataLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  const calcularDatosCargo = useCallback((cargoId, visited = new Set()) => {
    const cargo = state.cargos.find(c => c.id === cargoId);
    if (visited.has(cargoId)) return { precio: 0, factor: 1, precioHora: 0, factorMultiplicador: 1 };
    visited.add(cargoId);

    const smlv = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
    const h_mes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
    const h_dia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
    const integrantes = state.cargoDetalles.filter(d => d.cargo_padre_id === cargoId);
    
    const factorMult = Number(cargo?.factor_multiplicador) || 1.0;

    // Si no tiene integrantes y no existe el cargo, devolver defaults
    if (integrantes.length === 0) {
      if (!cargo) return { precio: 0, factor: 1, precioHora: 0, factorMultiplicador: 1 };
      const baseFactor = Number(cargo.factor_smlv) || 1;
      const totalFactor = baseFactor * factorMult;
      return { 
        precio: Math.round((smlv * totalFactor)), 
        factor: totalFactor,
        precioHora: (smlv * totalFactor) / h_mes,
        factorMultiplicador: factorMult
      };
    }

    // Es una cuadrilla: Sumar costos horarios de integrantes
    let totalCostoHora = 0;
    let sumaFactores = 0;
    
    integrantes.forEach(det => {
      const subRes = calcularDatosCargo(det.cargo_hijo_id, new Set(visited));
      const factorEfectivo = det.factor_smlv ? Number(det.factor_smlv) : subRes.factor;
      
      const costoHoraEfectivo = (smlv * factorEfectivo) / h_mes;
      totalCostoHora += costoHoraEfectivo * (Number(det.cantidad) || 0);
      sumaFactores += factorEfectivo;
    });

    // El factor de la cuadrilla es la suma de los factores de sus integrantes * multiplicador del padre
    const totalFactor = sumaFactores * factorMult;
    
    // Aplicar recargos sobre la base sumada (usar valores del cargo si existe, o 0)
    const recargoCop = Number(cargo?.recargo_cop) || 0;
    const recargoPct = Number(cargo?.recargo_pct) || 0;
    
    // El costo base ya incluye los multiplicadores de los hijos. 
    // Aplicamos el multiplicador del padre al costo total sumado.
    let baseCostoHora = totalCostoHora * factorMult;
    let finalPrecioHora = baseCostoHora + recargoCop / h_mes;
    
    if (recargoPct > 0) {
      finalPrecioHora += baseCostoHora * (recargoPct / 100);
    }

    // Escalar precio según unidad del padre
    let finalPrecio = finalPrecioHora;
    const u = (cargo?.unidad || 'Mes').toLowerCase();
    if (u === 'día' || u === 'dia') finalPrecio = finalPrecioHora * h_dia;
    if (u === 'mes') finalPrecio = finalPrecioHora * h_mes;

    return { 
      precio: Math.round(finalPrecio), 
      factor: totalFactor, 
      precioHora: finalPrecioHora,
      factorMultiplicador: factorMult
    };
  }, [state.cargos, state.cargoDetalles, state.config]);

  const getApuLaborRequirements = useCallback((apuId, multiplier = 1, requirements = {}) => {
    const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
    
    detalles.forEach(det => {
      const cantEfectiva = (Number(det.cantidad) || 0) * multiplier;
      
      if (det.cargo_id) {
        // Mostramos el cargo/cuadrilla tal cual aparece en el presupuesto
        requirements[det.cargo_id] = (requirements[det.cargo_id] || 0) + cantEfectiva;
      } else if (det.apu_hijo_id) {
        getApuLaborRequirements(det.apu_hijo_id, cantEfectiva, requirements);
      }
    });
    
    return requirements;
  }, [state.apuDetalles, state.cargoDetalles]);

  const getCargoProjectItems = useCallback((proyectoId, cargoId) => {
    if (!proyectoId || !cargoId) return [];
    const items = state.presupuestoItems.filter(i => i.proyecto_id === proyectoId);
    
    // Función local para verificar si un APU contiene un cargo (recursiva)
    const apuContainsCargo = (apuId, targetCargoId, visited = new Set()) => {
      if (visited.has(apuId)) return false;
      visited.add(apuId);
      const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
      return detalles.some(d => 
        d.cargo_id === targetCargoId || 
        (d.apu_hijo_id && apuContainsCargo(d.apu_hijo_id, targetCargoId, visited))
      );
    };

    return items.filter(item => apuContainsCargo(item.apu_id, cargoId));
  }, [state.presupuestoItems, state.apuDetalles]);

  const getProjectLaborNeeds = useCallback((proyectoId) => {
    if (!proyectoId) return {};
    const items = state.presupuestoItems.filter(i => i.proyecto_id === proyectoId);
    let metrics = {};

    items.forEach(item => {
      const apuLabor = {};
      getApuLaborRequirements(item.apu_id, Number(item.cantidad) || 0, apuLabor);
      
      Object.entries(apuLabor).forEach(([cargoId, cantidad]) => {
        if (!metrics[cargoId]) {
          metrics[cargoId] = {
            cantidadTotal: 0,
            costoTotal: 0,
            horasTotal: 0,
            startDate: item.fecha_inicio || null,
            endDate: item.fecha_fin || null
          };
        }
        
        const cargo = state.cargos.find(c => c.id === cargoId);
        const data = calcularDatosCargo(cargoId);
        
        metrics[cargoId].cantidadTotal += cantidad;
        metrics[cargoId].costoTotal += cantidad * (data.precio || 0);
        
        // Conversión a horas según unidad del cargo
        let horas = cantidad;
        const u = cargo?.unidad?.toLowerCase() || '';
        if (u === 'mes') horas = cantidad * 192;
        else if (u === 'día' || u === 'dia') horas = cantidad * 8;
        
        metrics[cargoId].horasTotal += horas;
        
        // Rango de fechas dinámico por cargo
        if (item.fecha_inicio && (!metrics[cargoId].startDate || item.fecha_inicio < metrics[cargoId].startDate)) {
          metrics[cargoId].startDate = item.fecha_inicio;
        }
        if (item.fecha_fin && (!metrics[cargoId].endDate || item.fecha_fin > metrics[cargoId].endDate)) {
          metrics[cargoId].endDate = item.fecha_fin;
        }
      });
    });

    return metrics;
  }, [state.presupuestoItems, state.cargos, getApuLaborRequirements, calcularDatosCargo]);

  const calcularCostoAPU = useCallback(
    (apuId, visited = new Set()) => {
      if (visited.has(apuId)) return 0;
      visited.add(apuId);

      const detalles = state.apuDetalles.filter((d) => d.apu_id === apuId);
      let total = 0;

      for (const det of detalles) {
        const cant = Number(det.cantidad) || 0;
        const desp = Number(det.desperdicio_pct) || 0;
        const hmPct = Number(det.herramienta_menor_pct) || 0;
        const factor = cant * (1 + desp / 100);
        const hmFactor = 1 + hmPct / 100; // Herramienta menor applies to labor

        if (det.insumo_id) {
          const insumo = state.insumos.find((i) => i.id === det.insumo_id);
          let precioIns = Number(insumo?.precio_unitario) || 0;
          if (precioIns === 0) {
            precioIns = calcularPrecioMercado(det.insumo_id, state.mkOfertas, '')?.precio_mercado || 0;
          }
          total += factor * precioIns;
        } else if (det.cargo_id) {
          const { precio: precioConsolidado } = calcularDatosCargo(det.cargo_id);
          let precio = precioConsolidado;
          const cargo = state.cargos.find(c => c.id === det.cargo_id);
          
          // Lógica de conversión y cálculo por rendimiento
          if (det.unidad_detalle && cargo) {
            const uCargo = cargo.unidad?.toLowerCase();
            const uDet = det.unidad_detalle?.toLowerCase();

            // Obtener precio base por hora para cualquier cargo (independientemente de su unidad original)
            let p_hr = precio;
            if (uCargo === 'mes') p_hr = precio / 192;
            else if (uCargo === 'día' || uCargo === 'dia') p_hr = precio / 8;

            // Precio según la unidad del detalle (Hora o Día)
            if (uDet === 'hora' || uDet === 'hr') precio = p_hr;
            else if (uDet === 'día' || uDet === 'dia') precio = p_hr * 8;
            
            // Consolidado: Usamos cantidad directa para todo por petición del usuario
            total += factor * precio * hmFactor;
          } else {
            // Caso por defecto (respaldo)
            total += factor * precio * hmFactor;
          }
        } else if (det.apu_hijo_id) {
          total += factor * calcularCostoAPU(det.apu_hijo_id, new Set(visited));
        }
      }
      return total;
    },
    [state.apuDetalles, state.insumos, state.cargos, state.mkOfertas]
  );

  const calcularCostoMO = useCallback(
    (apuId, visited = new Set()) => {
      if (visited.has(apuId)) return 0;
      visited.add(apuId);

      const detalles = state.apuDetalles.filter((d) => d.apu_id === apuId);
      let total = 0;

      for (const det of detalles) {
        const factor = (Number(det.cantidad) || 0) * (1 + (Number(det.desperdicio_pct) || 0) / 100);

        if (det.cargo_id) {
          const { precio: precioConsolidado } = calcularDatosCargo(det.cargo_id);
          let precio = precioConsolidado;
          const cargo = state.cargos.find(c => c.id === det.cargo_id);
          
          if (det.unidad_detalle && cargo) {
            const uCargo = cargo.unidad?.toLowerCase();
            const uDet = det.unidad_detalle?.toLowerCase();
            let p_hr = precio;
            if (uCargo === 'mes') p_hr = precio / 192;
            else if (uCargo === 'día' || uCargo === 'dia') p_hr = precio / 8;

            if (uDet === 'hora' || uDet === 'hr') precio = p_hr;
            else if (uDet === 'día' || uDet === 'dia') precio = p_hr * 8;
          }
          total += factor * precio;
        } else if (det.apu_hijo_id) {
          total += factor * calcularCostoMO(det.apu_hijo_id, new Set(visited));
        }
      }
      return total;
    },
    [state.apuDetalles, state.cargos]
  );

  const calcularPresupuesto = useCallback(
    (proyectoId) => {
      const proyecto = state.proyectos.find((p) => p.id === proyectoId);
      if (!proyecto) return { costoDirecto: 0, admin: 0, imprevistos: 0, utilidad: 0, iva: 0, retefuente: 0, totalAIU: 0, gran_total: 0 };

      const items = state.presupuestoItems.filter((pi) => pi.proyecto_id === proyectoId);
      const costoDirecto = items.reduce((sum, item) => {
        const costoAPU = calcularCostoAPU(item.apu_id);
        return sum + costoAPU * (item.cantidad || 0);
      }, 0);

      const adminVal = (costoDirecto * (proyecto.aiu_admin || 0)) / 100;
      const imprevVal = (costoDirecto * (proyecto.aiu_imprev || 0)) / 100;
      const utilVal = (costoDirecto * (proyecto.aiu_utilidad || 0)) / 100;
      const totalAIU = adminVal + imprevVal + utilVal;
      const subtotalConAIU = costoDirecto + totalAIU;
      const ivaVal = (subtotalConAIU * (proyecto.aiu_iva || 0)) / 100;
      const reteVal = (subtotalConAIU * (proyecto.aiu_retefuente || 0)) / 100;

      return {
        costoDirecto,
        admin: adminVal,
        imprevistos: imprevVal,
        utilidad: utilVal,
        iva: ivaVal,
        retefuente: reteVal,
        totalAIU,
        gran_total: subtotalConAIU + ivaVal - reteVal,
        pctAdmin: proyecto.aiu_admin || 0,
        pctImprev: proyecto.aiu_imprev || 0,
        pctUtil: proyecto.aiu_utilidad || 0,
        pctIva: proyecto.aiu_iva || 0,
        pctRete: proyecto.aiu_retefuente || 0,
      };
    },
    [state.proyectos, state.presupuestoItems, calcularCostoAPU]
  );

  const calcularExplosionInsumos = useCallback(
    (proyectoId) => {
      const items = state.presupuestoItems.filter(pi => pi.proyecto_id === proyectoId);
      const explosion = {}; // insumoId -> { insumo, cantidad_total }

      const processAPU = (apuId, multiplier) => {
        const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
        for (const det of detalles) {
          const cantFact = multiplier * Number(det.cantidad) * (1 + (Number(det.desperdicio_pct) || 0) / 100);
          
          if (det.insumo_id) {
            if (!explosion[det.insumo_id]) {
              const insumo = state.insumos.find(i => i.id === det.insumo_id);
              if (insumo) explosion[det.insumo_id] = { ...insumo, cantidad_total: 0 };
            }
            if (explosion[det.insumo_id]) {
              explosion[det.insumo_id].cantidad_total += cantFact;
            }
          } else if (det.apu_hijo_id) {
            processAPU(det.apu_hijo_id, cantFact);
          }
        }
      };

      items.forEach(item => {
        processAPU(item.apu_id, Number(item.cantidad) || 0);
      });

      return Object.values(explosion).map(e => ({
        ...e,
        total_costo: e.cantidad_total * (Number(e.precio_unitario) || 0)
      }));
    },
    [state.presupuestoItems, state.apuDetalles, state.insumos]
  );

  const calculateExecutionValue = useCallback((proyectoId) => {
    const items = state.presupuestoItems.filter(pi => pi.proyecto_id === proyectoId);
    return items.reduce((total, item) => {
      const executed = state.avances
        .filter(a => a.presupuesto_item_id === item.id)
        .reduce((sum, a) => sum + Number(a.cantidad_incremental), 0);
      const unitCost = calcularCostoAPU(item.apu_id);
      return total + (executed * unitCost);
    }, 0);
  }, [state.presupuestoItems, state.avances, calcularCostoAPU]);

  const calculateTotalPayments = useCallback((proyectoId) => {
    return state.pagos
      .filter(p => p.proyecto_id === proyectoId)
      .reduce((sum, p) => sum + Number(p.valor_neto), 0);
  }, [state.pagos]);

  const dispatchWithSync = useCallback((action) => {
    // ── Normalización de IDs y Códigos (Garantizar consistencia Cliente-Servidor) ──
    const normalizedAction = { ...action };
    
    if (action.type?.startsWith('ADD_')) {
      const payload = { ...action.payload };
      
      // Asegurar ID
      if (!payload.id) payload.id = crypto.randomUUID();
      
      // Asegurar Códigos únicos según entidad
      if (!payload.codigo) {
        if (action.type === 'ADD_PROYECTO') payload.codigo = generateNextCode(state.proyectos, 'PRY');
        else if (action.type === 'ADD_INSUMO') payload.codigo = generateNextCode(state.insumos, INSUMO_PREFIXES[payload.tipo] || 'INS');
        else if (action.type === 'ADD_APU') payload.codigo = generateNextCode(state.apus, APU_PREFIXES[payload.tipo] || 'APU');
        else if (action.type === 'ADD_CARGO') payload.codigo = generateNextCode(state.cargos, 'CAR');
      }

      // Saneamiento de apu_id para evitar errores de UUID en Postgres
      if (action.type === 'ADD_PRESUPUESTO_ITEM' && payload.apu_id === '') {
        payload.apu_id = null;
      }

      // Valores por defecto específicos
      if (action.type === 'ADD_PROYECTO') {
        payload.aiu_admin = payload.aiu_admin ?? 10;
        payload.aiu_imprev = payload.aiu_imprev ?? 5;
        payload.aiu_utilidad = payload.aiu_utilidad ?? 5;
      }
      
      normalizedAction.payload = payload;
    }

    if (action.type === 'ADD_PRESUPUESTO_ITEMS_BATCH' && Array.isArray(action.payload)) {
      normalizedAction.payload = action.payload.map(item => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        apu_id: item.apu_id === '' ? null : item.apu_id
      }));
    }

    // Usar la acción normalizada de aquí en adelante
    const finalAction = normalizedAction;

    // ── Pre-Dispatch Logic (Guards & Auto-Automation) ──
    if (finalAction.type === 'ADD_AVANCE') {
      const item = state.presupuestoItems.find(i => i.id === action.payload.presupuesto_item_id);
      if (!item) return;

      const unitCost = calcularCostoAPU(item.apu_id);
      const newVal = action.payload.cantidad_incremental * unitCost;
      const totalExec = calculateExecutionValue(item.proyecto_id);
      const totalPay = calculateTotalPayments(item.proyecto_id);

      if (totalExec + newVal > totalPay && !item.is_unlocked) {
        alert('🚫 BLOQUEO FINANCIERO: La ejecución acumulada supera el recaudo recibido del cliente. Por favor registre un nuevo pago o solicite un desbloqueo manual.');
        return;
      }

      // ── Auto-Inventory Deduction ──
      const projectBodega = state.bodegas.find(b => b.proyecto_id === item.proyecto_id);
      if (projectBodega) {
        const processWithdrawal = (apuId, qty) => {
          const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
          detalles.forEach(det => {
            const factor = qty * Number(det.cantidad) * (1 + (Number(det.desperdicio_pct) || 0) / 100);
            if (det.insumo_id) {
              baseDispatch({
                type: 'ADD_INVENTARIO_MOV',
                payload: {
                  bodega_id: projectBodega.id,
                  insumo_id: det.insumo_id,
                  presupuesto_item_id: item.id,
                  tipo: 'SALIDA',
                  cantidad: factor,
                  motivo: `Consumo automático por avance: ${item.descripcion || 'Ítem'}`
                }
              });
            } else if (det.apu_hijo_id) {
              processWithdrawal(det.apu_hijo_id, factor);
            }
          });
        };
        processWithdrawal(item.apu_id, action.payload.cantidad_incremental);
      }
    }

    // --- Fin de Normalización ---

    baseDispatch(finalAction);
    if (isSupabaseConfigured() && finalAction.type !== 'LOAD_ALL') {
      Promise.resolve().then(() => {
        syncToSupabase(finalAction, storeReducer(state, finalAction));
      });
    }
  }, [state, calcularCostoAPU, calculateExecutionValue, calculateTotalPayments]);

  // Hydration: load data from Supabase on mount
  useEffect(() => {
    const hydrate = async () => {
      if (!isSupabaseConfigured()) {
        setDataLoading(false);
        setIsOnline(false);
        return;
      }

      try {
        const data = await loadAllData();
        if (data) {
          // --- Saneamiento Preventivo de Datos ---
          if (data.personal && data.cargos) {
            const validCargoIds = new Set(data.cargos.map(c => c.id));
            data.personal = data.personal.map(p => {
              if (p.cargo_id && !validCargoIds.has(p.cargo_id)) {
                return { ...p, cargo_id: null };
              }
              return p;
            });
          }

          // --- Auto-Seed de Profesiones de Construcción (Colombia) ---
          const seedRoles = [
            { codigo: 'CEO-001', nombre: 'Administrador (CEO)', categoria: 'admin', factor_smlv: 12.0, unidad: 'Mes' },
            { codigo: 'PM-001', nombre: 'Project Manager', categoria: 'admin', factor_smlv: 10.0, unidad: 'Mes' },
            { codigo: 'ING-001', nombre: 'Ingeniero Civil', categoria: 'operativo', factor_smlv: 6.0, unidad: 'Mes' },
            { codigo: 'ARQ-001', nombre: 'Arquitecto', categoria: 'operativo', factor_smlv: 6.0, unidad: 'Mes' },
            { codigo: 'MAES-001', nombre: 'Maestro de Obra', categoria: 'cuadrilla', factor_smlv: 3.5, unidad: 'Mes' },
            { codigo: 'OFIC-001', nombre: 'Oficial', categoria: 'cuadrilla', factor_smlv: 2.0, unidad: 'Mes' },
            { codigo: 'SOF-001', nombre: 'Sub-Oficial', categoria: 'cuadrilla', factor_smlv: 1.5, unidad: 'Mes' },
            { codigo: 'AYU-001', nombre: 'Ayudante', categoria: 'cuadrilla', factor_smlv: 1.2, unidad: 'Mes' },
            { codigo: 'CLI-001', nombre: 'Cliente', categoria: 'cliente', factor_smlv: 0, unidad: 'Mes' },
          ];

          const existingNames = new Set(data.cargos?.map(c => c.nombre) || []);
          const toInsert = seedRoles.filter(r => !existingNames.has(r.nombre));
          
          if (toInsert.length > 0) {
            console.log(`[Seed] Sincronizando ${toInsert.length} roles unificados...`);
            toInsert.forEach(role => {
              const id = crypto.randomUUID();
              data.cargos.push({ ...role, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              // Despachar a Supabase en segundo plano
              cargosService.create({ ...role, id }).catch(e => console.warn(`[Seed] Nota: No se pudo sincronizar el rol base "${role.nombre}" en la nube (RLS). Esto es normal en modo restringido.`));
            });
          }

          // --- Auto-Asignar cargo "Cliente" a personas del CRM sin cargo ---
          const clienteCargo = data.cargos.find(c => c.nombre === 'Cliente');
          if (clienteCargo && data.personal) {
            data.personal = data.personal.map(p => {
              const isClientProfile = (
                (!p.cargo_id && !p.cargos_ids?.length) && 
                (p.profesion?.toLowerCase() === 'cliente' || p.app_role === 'cliente' || p.plataforma === 'telegram')
              );
              if (isClientProfile) {
                return { 
                  ...p, 
                  cargo_id: clienteCargo.id, 
                  cargos_ids: [clienteCargo.id],
                  profesion: p.profesion || 'Cliente'
                };
              }
              return p;
            });
          }

          // --- Auto-Crear Perfil si el usuario logueado no tiene registro en 'personal' ---
          try {
            const { data: { user: authUser } } = await db().auth.getUser();
            if (authUser?.email) {
              const existsInPersonal = data.personal?.some(p => p.email?.toLowerCase() === authUser.email.toLowerCase());
              if (!existsInPersonal) {
                const meta = authUser.user_metadata || {};
                const nombreParts = (meta.nombre || authUser.email.split('@')[0]).split(' ');
                const newProfile = {
                  id: crypto.randomUUID(),
                  email: authUser.email,
                  nombres: nombreParts[0] || '',
                  apellidos: nombreParts.slice(1).join(' ') || '',
                  nombre: meta.nombre || authUser.email.split('@')[0],
                  profesion: meta.role || '',
                  app_role: (meta.role || 'cuadrilla').toLowerCase(),
                  cargo_id: null,
                  salario_base: 0,
                  unidad_pago: 'Mes',
                  user_id: authUser.id,
                };
                data.personal = [...(data.personal || []), newProfile];
                // Persistir en Supabase con fallback progresivo
                (async () => {
                  try {
                    await personalService.create(newProfile);
                  } catch (e1) {
                    try {
                      // Fallback: sin campos nuevos
                      const { app_role, profesion, ...safe } = newProfile;
                      await personalService.create(safe);
                    } catch (e2) {
                      // Ultra-minimal
                      try {
                        await personalService.create({ id: newProfile.id, email: newProfile.email, nombre: newProfile.nombre, user_id: newProfile.user_id });
                      } catch (e3) { console.warn('[AutoProfile] No se pudo persistir: ' + (e3?.message || String(e3))); }
                    }
                  }
                })();
                console.log('[AutoProfile] Perfil creado automáticamente para:', authUser.email);
              }
            }
          } catch (profileErr) {
            console.warn('[AutoProfile] No se pudo auto-crear perfil: ' + (profileErr?.message || String(profileErr)));
          }

          baseDispatch({ 
            type: 'LOAD_ALL', 
            payload: {
              ...data,
              controlAsistencia: data.controlAsistencia || []
            } 
          });
          setIsOnline(true);
        }
      } catch (err) {
        console.error(`🔴 [Hydration] Fallo fatal: ${err.message || String(err)}`);
        setIsOnline(false);
      } finally {
        setDataLoading(false);
      }
    };

    hydrate();
  }, []);

  const clearDatabase = async () => {
    if (!db()) return;
    try {
      // 1. Nivel 3 (Dependencias finales)
      const { data: inv } = await db().from('inventario_transacciones').select('id');
      const { data: ava } = await db().from('obra_avances').select('id');
      const { data: nts } = await db().from('item_notes').select('id');
      const { data: bim } = await db().from('bim_links').select('id');
      const { data: ppg } = await db().from('personal_proyecto').select('id');
      const { data: chk } = await db().from('item_checklist_items').select('id');
      const { data: doc } = await db().from('item_documents').select('id');
      const { data: asi } = await db().from('control_asistencia').select('id');
      const { data: pag } = await db().from('pagos_cliente').select('id');
      
      await Promise.all([
        ...(inv || []).map(x => inventarioService.remove(x.id)),
        ...(ava || []).map(x => obraAvancesService.remove(x.id)),
        ...(nts || []).map(x => notesService.remove(x.id)),
        ...(bim || []).map(x => bimLinksService.remove(x.id)),
        ...(ppg || []).map(x => personalProyectoService.remove(x.id)),
        ...(chk || []).map(x => checklistService.remove(x.id)),
        ...(doc || []).map(x => itemDocumentsService.remove(x.id)),
        ...(asi || []).map(x => asistenciaService.remove(x.id)),
        ...(pag || []).map(x => pagosService.remove(x.id))
      ]);

      // 2. Nivel 2 (Presupuesto y Detalles)
      const { data: pre } = await db().from('presupuesto_items').select('id');
      const { data: det } = await db().from('apu_detalle').select('id');
      const { data: bod } = await db().from('bodegas').select('id');
      const { data: cdt } = await db().from('cargo_detalle').select('id');
      
      await Promise.all([
        ...(pre || []).map(x => presupuestoService.remove(x.id)),
        ...(det || []).map(x => apuDetalleService.remove(x.id)),
        ...(bod || []).map(x => bodegaService.remove(x.id)),
        ...(cdt || []).map(x => cargoDetalleService.remove(x.id))
      ]);

      // 3. Nivel 1 (Entidades base)
      const { data: pers } = await db().from('personal').select('id');
      const { data: apus } = await db().from('apu').select('id');
      const { data: insu } = await db().from('insumos').select('id');
      const { data: carg } = await db().from('cargos').select('id');
      const { data: proy } = await db().from('proyectos').select('id');
      
      await Promise.all([
        ...(pers || []).map(x => personalService.remove(x.id)),
        ...(apus || []).map(x => apuService.remove(x.id)),
        ...(insu || []).map(x => insumosService.remove(x.id)),
        ...(carg || []).map(x => cargosService.remove(x.id)),
        ...(proy || []).map(x => proyectosService.remove(x.id))
      ]);

      return true;
    } catch (e) {
      console.error(`Error clearing database: ${e.message || String(e)}`);
      throw e;
    }
  };

  const getInsumoProjectUsage = useCallback((insumoId) => {
    if (!insumoId) return [];
    const apuIdsUsingInsumo = new Set(state.apuDetalles.filter(d => d.insumo_id === insumoId).map(d => d.apu_id));
    return state.proyectos.filter(p => 
      state.presupuestoItems.some(item => item.proyecto_id === p.id && apuIdsUsingInsumo.has(item.apu_id))
    );
  }, [state.apuDetalles, state.presupuestoItems, state.proyectos]);

  const getCargoProjectUsage = useCallback((cargoId) => {
    if (!cargoId) return [];
    const apuContainsCargo = (apuId, targetCargoId, visited = new Set()) => {
      if (visited.has(apuId)) return false;
      visited.add(apuId);
      const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
      return detalles.some(d => 
        d.cargo_id === targetCargoId || 
        (d.apu_hijo_id && apuContainsCargo(d.apu_hijo_id, targetCargoId, visited))
      );
    };
    return state.proyectos.filter(p => 
      state.presupuestoItems.some(item => item.proyecto_id === p.id && apuContainsCargo(item.apu_id, cargoId))
    );
  }, [state.apuDetalles, state.presupuestoItems, state.proyectos]);

  const getInsumoApuUsage = useCallback((insumoId) => {
    if (!insumoId) return [];
    const apuIds = new Set(state.apuDetalles.filter(d => d.insumo_id === insumoId).map(d => d.apu_id));
    return state.apus.filter(a => apuIds.has(a.id));
  }, [state.apuDetalles, state.apus]);

  const getCargoApuUsage = useCallback((cargoId) => {
    if (!cargoId) return [];
    const apuContainsCargo = (apuId, targetCargoId, visited = new Set()) => {
      if (visited.has(apuId)) return false;
      visited.add(apuId);
      const detalles = state.apuDetalles.filter(d => d.apu_id === apuId);
      return detalles.some(d => 
        d.cargo_id === targetCargoId || 
        (d.apu_hijo_id && apuContainsCargo(d.apu_hijo_id, targetCargoId, visited))
      );
    };
    return state.apus.filter(a => apuContainsCargo(a.id, cargoId));
  }, [state.apuDetalles, state.apus]);


  return (
    <StoreContext.Provider value={{
      state,
      dispatch: dispatchWithSync,
      calcularCostoAPU,
      calcularCostoMO,
      calcularPresupuesto,
      calcularExplosionInsumos,
      calculateExecutionValue,
      calculateTotalPayments,
      calcularDatosCargo,
      getProjectLaborNeeds,
      getCargoProjectItems,
      getInsumoProjectUsage,
      getCargoProjectUsage,
      getInsumoApuUsage,
      getCargoApuUsage,
      clearDatabase,
      dataLoading,
      isOnline,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
