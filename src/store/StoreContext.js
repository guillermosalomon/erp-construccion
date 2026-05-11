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
};

/* ─── Reducer ─── */
function storeReducer(state, action) {
  try {
    switch (action.type) {
      // ── Hydration (load from Supabase) ──
      case 'LOAD_ALL': {
      // Deduplicar datos entrantes para evitar "Duplicate Key" en React
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

      // Recalcular precios de cargos basados en SMLV para asegurar consistencia
      const config = deduplicated.config || [];
      const smlv = parseFloat(config.find(c => c.clave === 'SMLV')?.valor) || 2200000;
      const h_mes = parseFloat(config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;

      const cargosRecalculados = (deduplicated.cargos || []).map(cargo => {
        const factor = parseFloat(cargo.factor_smlv) || 1.0;
        let precio = smlv * factor;
        const unitNorm = cargo.unidad?.toLowerCase();
        if (unitNorm === 'hora' || unitNorm === 'hr') precio = precio / h_mes;
        else if (unitNorm === 'día' || unitNorm === 'dia') precio = (precio / h_mes) * h_dia;
        
        return { ...cargo, precio_unitario: Math.round(precio) };
      });

      // Recalcular fechas de fin ausentes durante la hidratación
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

      // --- Reconstrucción de Perfiles de Personal (Legacy -> Estructurado) ---
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

      // Cargar bimModels desde localStorage
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

        // 2. Recalcular Personal vinculado (Efecto Reflejo)
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
        proyectos: [...state.proyectos, {
          ...action.payload,
          id,
          created_at: now(),
          updated_at: now(),
        }],
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
      
      // Forzar tipos numéricos
      const cantidad = parseFloat(updated.cantidad) || 0;
      const numCuadrillas = parseInt(updated.num_cuadrillas) || 1;
      
      const apu = state.apus.find(a => a.id === updated.apu_id);
      const rendimiento = parseFloat(apu?.rendimiento) || 1;
      
      // Recalcular fecha de fin SOLO si cambian campos que afectan la duración
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
      return {
        ...state,
        presupuestoItems: state.presupuestoItems.filter((pi) => pi.id !== action.payload),
      };
    case 'CLEAR_PRESUPUESTO_ITEMS':
      return {
        ...state,
        presupuestoItems: state.presupuestoItems.filter((pi) => pi.proyecto_id !== action.payload),
      };

    // ── BIM Links ──
    case 'ADD_BIM_LINK':
      return {
        ...state,
        bimLinks: [...state.bimLinks, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }],
      };
    case 'DELETE_BIM_LINK':
      return {
        ...state,
        bimLinks: state.bimLinks.filter((l) => l.id !== action.payload),
      };

    // ── Obra Avances ──
    case 'ADD_AVANCE':
      return {
        ...state,
        avances: [{ estado: 'PENDIENTE', ...action.payload, id: action.payload.id || generateId(), created_at: now() }, ...state.avances],
      };
    case 'UPDATE_AVANCE':
      return {
        ...state,
        avances: state.avances.map((a) => (a.id === action.payload.id ? { ...a, ...action.payload.changes } : a)),
      };
    case 'DELETE_AVANCE':
      return {
        ...state,
        avances: state.avances.filter((a) => a.id !== action.payload),
      };

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
      return {
        ...state,
        bodegas: [...state.bodegas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }],
      };
    case 'DELETE_BODEGA':
      return {
        ...state,
        bodegas: state.bodegas.filter((b) => b.id !== action.payload),
      };

    // ── Inventario Movimientos ──
    case 'ADD_INVENTARIO_MOV':
      return {
        ...state,
        inventario: [...state.inventario, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }],
      };
    case 'UPDATE_INVENTARIO_MOV':
      return {
        ...state,
        inventario: state.inventario.map((i) => (i.id === action.payload.id ? { ...i, ...action.payload.changes } : i)),
      };

    // ── Marketplace: Tiendas ──
    case 'ADD_MK_TIENDA':
      return { ...state, mkTiendas: [...state.mkTiendas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_TIENDA':
      return { ...state, mkTiendas: state.mkTiendas.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'DELETE_MK_TIENDA':
      return { ...state, mkTiendas: state.mkTiendas.filter(t => t.id !== action.payload) };
    case 'DELETE_MK_TIENDA_COMPLETA':
      return {
        ...state,
        mkTiendas: state.mkTiendas.filter(t => t.id !== action.payload),
        mkPuntosVenta: state.mkPuntosVenta.filter(pv => pv.tienda_id !== action.payload),
        mkOfertas: state.mkOfertas.filter(o => o.tienda_id !== action.payload),
        mkPedidos: state.mkPedidos.filter(p => p.tienda_id !== action.payload),
        personalProyecto: state.personalProyecto.filter(pp => pp.tienda_id !== action.payload)
      };

    // ── Marketplace: Puntos de Venta ──
    case 'ADD_MK_PUNTO_VENTA':
      return { ...state, mkPuntosVenta: [...state.mkPuntosVenta, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_PUNTO_VENTA':
      return { ...state, mkPuntosVenta: state.mkPuntosVenta.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_PUNTO_VENTA':
      return { ...state, mkPuntosVenta: state.mkPuntosVenta.filter(p => p.id !== action.payload) };
    case 'DELETE_MK_PUNTO_VENTA_COMPLETA':
      return {
        ...state,
        mkPuntosVenta: state.mkPuntosVenta.filter(p => p.id !== action.payload),
        mkOfertas: state.mkOfertas.filter(o => o.punto_venta_id !== action.payload),
        mkPedidos: state.mkPedidos.filter(p => p.punto_venta_id !== action.payload),
        personalProyecto: state.personalProyecto.filter(pp => pp.punto_venta_id !== action.payload)
      };

    // ── Marketplace: Ofertas (Insumo + Punto de Venta + Precio) ──
    case 'ADD_MK_OFERTA':
      return { ...state, mkOfertas: [...state.mkOfertas, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_OFERTA':
      return { ...state, mkOfertas: state.mkOfertas.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_OFERTA':
      return { ...state, mkOfertas: state.mkOfertas.filter(p => p.id !== action.payload) };
    // ── Marketplace: Pedidos ──
    case 'ADD_MK_PEDIDO':
      return { ...state, mkPedidos: [...state.mkPedidos, { ...action.payload, id: action.payload.id || crypto.randomUUID(), created_at: new Date().toISOString() }] };
    case 'UPDATE_MK_PEDIDO':
      return { ...state, mkPedidos: state.mkPedidos.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_MK_PEDIDO':
      return { ...state, mkPedidos: state.mkPedidos.filter(p => p.id !== action.payload) };
    case 'ADD_MK_PEDIDO_ITEM':
      return { ...state, mkPedidoItems: [...state.mkPedidoItems, { ...action.payload, id: action.payload.id || generateId() }] };

    // ── Marketplace: Traspasos ──
    case 'ADD_MK_TRASPASO':
      return { ...state, mkTraspasos: [...state.mkTraspasos, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'UPDATE_MK_TRASPASO':
      return { ...state, mkTraspasos: state.mkTraspasos.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
    case 'ADD_MK_TRASPASO_ITEM':
      return { ...state, mkTraspasoItems: [...state.mkTraspasoItems, { ...action.payload, id: action.payload.id || generateId() }] };

    // ── Pagos Cliente ──
    case 'ADD_PAGO':
      return {
        ...state,
        pagos: [...state.pagos, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }],
      };
    case 'DELETE_PAGO':
      return {
        ...state,
        pagos: state.pagos.filter((p) => p.id !== action.payload),
      };

    // ── Personal (Mano de Obra) ──
    case 'ADD_PERSON': {
      const id = action.payload.id || generateId();
      return {
        ...state,
        personal: [...state.personal, { ...action.payload, id, created_at: now(), updated_at: now() }],
      };
    }
    case 'UPDATE_PERSON':
      return {
        ...state,
        personal: state.personal.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload, updated_at: now() } : p
        ),
      };
    case 'DELETE_PERSON':
      return {
        ...state,
        personal: state.personal.filter((p) => p.id !== action.payload),
      };

    case 'ADD_CARGO': {
      const codigo = action.payload.codigo || generateNextCode(state.cargos, 'CAR');
      const id = action.payload.id || generateId();

      // Cálculo de precio basado en SMLV
      const smlv = parseFloat(state.config.find(c => c.clave === 'SMLV')?.valor) || 2200000;
      const h_mes = parseFloat(state.config.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
      const h_dia = parseFloat(state.config.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
      const factor = parseFloat(action.payload.factor_smlv) || 1.0;
      const fMult = parseFloat(action.payload.factor_multiplicador) || 1.0;
      let precio = smlv * factor * fMult;
      if (action.payload.unidad === 'Hora') precio = precio / h_mes;
      if (action.payload.unidad === 'Día') precio = (precio / h_mes) * h_dia;

      // Evitar duplicados si el ID ya existe
      if (state.cargos.some(c => c.id === id)) {
        return state;
      }

      return {
        ...state,
        cargos: [...state.cargos, { 
          ...action.payload, 
          codigo, 
          id, 
          precio_unitario: Math.round(precio),
          created_at: now(), 
          updated_at: now() 
        }],
      };
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

      const newCargos = state.cargos.map((c) =>
        c.id === action.payload.id ? { ...c, ...updatedCargo, updated_at: now() } : c
      );

      const targetCargo = newCargos.find(c => c.id === action.payload.id);
      
      const newPersonal = state.personal.map(p => {
        if (p.cargo_id === action.payload.id && targetCargo) {
          return { ...p, salario_base: targetCargo.precio_unitario, unidad_pago: targetCargo.unidad, updated_at: now() };
        }
        return p;
      });

      return {
        ...state,
        cargos: newCargos,
        personal: newPersonal,
      };
    }
    case 'DELETE_CARGO':
      return {
        ...state,
        cargos: state.cargos.filter((c) => c.id !== action.payload),
      };
    case 'ADD_CARGO_DETALLE': {
      const detalleId = action.payload.id || generateId();
      return { ...state, cargoDetalles: [{ ...action.payload, id: detalleId }, ...state.cargoDetalles] };
    }
    case 'DELETE_CARGO_DETALLE':
      return { ...state, cargoDetalles: state.cargoDetalles.filter(d => d.id !== action.payload) };
    case 'UPDATE_CARGO_DETALLE':
      return { 
        ...state, 
        cargoDetalles: state.cargoDetalles.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) 
      };

    // --- Personal x Proyecto ---
    case 'ADD_PERSON_PROYECTO': {
      const id = action.payload.id || generateId();
      return { ...state, personalProyecto: [{ ...action.payload, id }, ...state.personalProyecto] };
    }
    case 'UPDATE_PERSON_PROYECTO':
      return { 
        ...state, 
        personalProyecto: state.personalProyecto.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) 
      };
    case 'DELETE_PERSON_PROYECTO':
      return { ...state, personalProyecto: state.personalProyecto.filter(p => p.id !== action.payload) };

    // --- Checklist de Actividades ---
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

    // --- Documentos de Actividad ---
    case 'ADD_ITEM_DOCUMENT':
      return { ...state, itemDocuments: [...state.itemDocuments, { ...action.payload, id: action.payload.id || generateId(), created_at: now() }] };
    case 'DELETE_ITEM_DOCUMENT':
      return { ...state, itemDocuments: state.itemDocuments.filter(d => d.id !== action.payload) };

    // --- Modelos BIM ---
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
  } catch (e) {
    const errorMsg = `🔴 [StoreReducer] Error crítico en "${action.type}": ${e.message}`;
    console.error(errorMsg);
    return state;
  }
}

/* ─── Sync Engine (Sequential Queue to avoid Race Conditions) ─── */
let syncQueue = Promise.resolve();

async function syncToSupabase(action, state) {
  if (!isSupabaseConfigured()) return;

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

        // APU Detalle
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
          try {
            const { arl_numero: _a1, arl_url: _a2, ...createPayload } = action.payload;
            await personalService.create(createPayload);
          } catch (err) {
            const errMsg = err?.message || String(err);
            if (errMsg.includes('column') || errMsg.includes('schema cache')) {
              try {
                const { nombres, apellidos, rol_proyecto, tareas_asignadas, arl_numero, arl_url, ...clean } = action.payload;
                const fullName = [nombres, apellidos].filter(Boolean).join(' ');
                await personalService.create({ 
                  ...clean, 
                  nombre: fullName || 'Sin Nombre' 
                });
              } catch (err2) {
                const { id, email, cargo_id, user_id, telefono, whatsapp, telegram_id } = action.payload;
                const fullName = [action.payload.nombres, action.payload.apellidos].filter(Boolean).join(' ');
                await personalService.create({ 
                  id, email, cargo_id, user_id, telefono, whatsapp, telegram_id,
                  nombre: fullName || 'Sin Nombre' 
                });
              }
            } else throw err;
          }
          break;
        }
        case 'UPDATE_PERSON': {
          try {
            const { factor_smlv: _f1, nombres: _n1, apellidos: _a1, rol_proyecto: _rp1, tareas_asignadas: _t1, arl_numero: _arl1, arl_url: _arl2, ...cleanPayload } = action.payload;
            const fullName = [action.payload.nombres, action.payload.apellidos].filter(Boolean).join(' ');
            await personalService.update(action.payload.id, { 
              ...cleanPayload, 
              nombre: fullName || cleanPayload.nombre || 'Sin Nombre' 
            });
          } catch (err) {
            const errMsg = err?.message || String(err);
            if (errMsg.includes('column') || errMsg.includes('schema cache')) {
              try {
                const { id, email, cargo_id, user_id, salario_base, profesion, unidad_pago, cedula, app_role, telefono, whatsapp, telegram_id } = action.payload;
                const fullName = [action.payload.nombres, action.payload.apellidos].filter(Boolean).join(' ');
                await personalService.update(id, { 
                  id, email, cargo_id, user_id, telefono, whatsapp, telegram_id,
                  nombre: fullName || 'Sin Nombre',
                  salario_base: salario_base || 0,
                  profesion: profesion || '',
                  unidad_pago: unidad_pago || 'Mes',
                  cedula: cedula || '',
                  app_role: app_role || 'cuadrilla'
                });
              } catch (err2) {
                console.error("⚠️ Final fallback error UPDATE_PERSON:", err2.message);
              }
            } else throw err;
          }
          break;
        }
        case 'DELETE_PERSON':
          await personalService.remove(action.payload);
          break;

        // Cargos
        case 'ADD_CARGO': {
          // Generar codigo aquí (el state en este closure es pre-dispatch, así que no podemos leerlo del state)
          const codigo = action.payload.codigo || `CAR-${Date.now()}`;
          const smlvVal = parseFloat(state.config?.find(c => c.clave === 'SMLV')?.valor) || 2200000;
          const hMes = parseFloat(state.config?.find(c => c.clave === 'HORAS_MES')?.valor) || 192;
          const hDia = parseFloat(state.config?.find(c => c.clave === 'HORAS_DIA')?.valor) || 8;
          const factorVal = parseFloat(action.payload.factor_smlv) || 1.0;
          let precioCalc = smlvVal * factorVal;
          if (action.payload.unidad === 'Hora') precioCalc = precioCalc / hMes;
          if (action.payload.unidad === 'Día') precioCalc = (precioCalc / hMes) * hDia;

          const cargoToSync = { 
            ...action.payload, 
            codigo,
            precio_unitario: Math.round(precioCalc)
          };
          try {
            await cargosService.create(cargoToSync);
          } catch (err) {
            if (err.message?.includes('column') || err.message?.includes('cache')) {
              const { recargo_cop, recargo_pct, factor_multiplicador, ...clean } = cargoToSync;
              await cargosService.create(clean);
            } else throw err;
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

        case 'ADD_CARGO_DETALLE':
          try {
            const detallePayload = { ...action.payload, id: action.payload.id || `det-${Date.now()}-${Math.random().toString(36).substr(2,5)}` };
            await cargoDetalleService.create(detallePayload);
          } catch (err) {
            if (err.message?.includes('table') || err.message?.includes('cache') || err.message?.includes('violates foreign key')) {
              console.warn("⚠️ Cargo Detalle sync:", err.message);
            } else throw err;
          }
          break;
        case 'DELETE_CARGO_DETALLE':
          try {
            await cargoDetalleService.remove(action.payload);
          } catch (err) {
            if (err.message?.includes('table') || err.message?.includes('cache')) {
              console.warn("⚠️ Cargo Detalle table not found.");
            } else throw err;
          }
          break;
        case 'UPDATE_CARGO_DETALLE':
          try {
            const uid = await getUserId();
            if (db()) {
              await db().from('cargo_detalle').upsert({ ...action.payload, user_id: uid });
            }
          } catch (err) {
            console.warn("⚠️ Error updating cargo_detalle:", err.message);
          }
          break;

        case 'ADD_PERSON_PROYECTO':
        case 'UPDATE_PERSON_PROYECTO':
          try {
            // Limpieza de campos que pueden causar conflictos de tipo en Supabase
            const { tareas_asignadas, equipo_padre_id, ...sanitized } = action.payload;
            await personalProyectoService.create(sanitized);
          } catch (err) {
            console.error("⚠️ Error sync personal_proyecto:", err.message);
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
      console.warn('[Sync] Error en', action.type);
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
            { codigo: 'CEO-001', nombre: 'Administrador (CEO)', categoria: 'Oficina (Escritorio)', factor_smlv: 12.0, unidad: 'Mes' },
            { codigo: 'PM-001', nombre: 'Project Manager', categoria: 'Oficina (Escritorio)', factor_smlv: 10.0, unidad: 'Mes' },
            { codigo: 'ING-001', nombre: 'Ingeniero Civil', categoria: 'Campo (Móvil)', factor_smlv: 6.0, unidad: 'Mes' },
            { codigo: 'ARQ-001', nombre: 'Arquitecto', categoria: 'Campo (Móvil)', factor_smlv: 6.0, unidad: 'Mes' },
            { codigo: 'MAES-001', nombre: 'Maestro de Obra', categoria: 'Mano de Obra Directa', factor_smlv: 3.5, unidad: 'Mes' },
            { codigo: 'OFIC-001', nombre: 'Oficial', categoria: 'Mano de Obra Directa', factor_smlv: 2.0, unidad: 'Mes' },
            { codigo: 'SOF-001', nombre: 'Sub-Oficial', categoria: 'Mano de Obra Directa', factor_smlv: 1.5, unidad: 'Mes' },
            { codigo: 'AYU-001', nombre: 'Ayudante', categoria: 'Mano de Obra Directa', factor_smlv: 1.2, unidad: 'Mes' },
          ];

          const existingNames = new Set(data.cargos?.map(c => c.nombre) || []);
          const toInsert = seedRoles.filter(r => !existingNames.has(r.nombre));
          
          if (toInsert.length > 0) {
            console.log(`[Seed] Sincronizando ${toInsert.length} roles unificados...`);
            // Insertar uno por uno mediante dispatches para asegurar sincronización con Supabase si el servicio lo soporta
            // O mejor, cargar los nuevos en el payload que se carga en el Reducer
            toInsert.forEach(role => {
              const id = crypto.randomUUID();
              data.cargos.push({ ...role, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              // Despachar a Supabase en segundo plano
              cargosService.create({ ...role, id }).catch(e => console.warn(`[Seed] Nota: No se pudo sincronizar el rol base "${role.nombre}" en la nube (RLS). Esto es normal en modo restringido.`));
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
