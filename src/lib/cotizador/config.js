/**
 * Configuración del Cotizador Público Kalarti.
 * Archivo puro (sin dependencias de React) usable en cliente y servidor.
 */

/* ─── Marca / textos ─── */
export const APU_COUNT_LABEL = '+400';
export const KALARTI_WHATSAPP = '573177725056';

/* ─── AIU fijo Kalarti (no editable por el usuario: base si decide contratar) ─── */
export const AIU = {
  admin: 10,      // %
  imprev: 5,      // %
  utilidad: 5,    // %
  ivaSobreUtilidad: 19, // % IVA aplicado sobre la Utilidad (régimen AIU Colombia)
};

/* ─── Moneda ─── */
export const TRM_COP_USD = Number(process.env.NEXT_PUBLIC_TRM_COP_USD) || 4000;

export function detectCurrency() {
  if (typeof window === 'undefined') return 'COP';
  try {
    const saved = window.localStorage.getItem('kalarti_cot_currency');
    if (saved === 'COP' || saved === 'USD') return saved;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();
    if (tz === 'America/Bogota' || lang.endsWith('-co')) return 'COP';
    return 'USD';
  } catch {
    return 'COP';
  }
}

export function saveCurrency(cur) {
  try { window.localStorage.setItem('kalarti_cot_currency', cur); } catch { /* noop */ }
}

/** Convierte un valor en COP a la moneda indicada y lo formatea */
export function formatMoney(valueCop, currency = 'COP', { compact = false } = {}) {
  const v = Number(valueCop) || 0;
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      maximumFractionDigits: compact ? 0 : 2,
      notation: compact ? 'compact' : 'standard',
    }).format(v / TRM_COP_USD);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(v);
}

/* ─── Planes y productos de pago ─── */
export const PRODUCTOS = {
  export: {
    id: 'export',
    nombre: 'Exportar a Excel',
    precio: { COP: 19900, USD: 4.99 },
    periodo: 'pago único por proyecto',
    meses: 0,
  },
  mensual: {
    id: 'mensual',
    nombre: 'Plan Mensual',
    precio: { COP: 39900, USD: 9.99 },
    periodo: '/mes',
    meses: 1,
    max_proyectos: 1,
    max_usuarios: 2,
    puede_editar_apu: false,
  },
  semestral: {
    id: 'semestral',
    nombre: 'Plan Semestral',
    precio: { COP: 99900, USD: 24.99 },
    periodo: '/6 meses',
    meses: 6,
    max_proyectos: 3,
    max_usuarios: 4,
    puede_editar_apu: false,
  },
  anual: {
    id: 'anual',
    nombre: 'Plan Anual',
    precio: { COP: 179900, USD: 44.99 },
    periodo: '/año',
    meses: 12,
    max_proyectos: 6,
    max_usuarios: 10,
    puede_editar_apu: true,
    destacado: true,
  },
};

export const PLAN_FEATURES = {
  mensual: [
    `Acceso a base de datos con ${APU_COUNT_LABEL} APUs verificados para todo tipo de obra civil`,
    '1 proyecto · 2 usuarios',
    'Seguimiento de obra: avances, bitácora y Gantt real vs. planeado',
    'Exportaciones a Excel incluidas',
  ],
  semestral: [
    `Acceso a base de datos con ${APU_COUNT_LABEL} APUs verificados para todo tipo de obra civil`,
    'Hasta 3 proyectos · 4 usuarios',
    'Todo lo del plan Mensual',
    'Ahorra 58 % frente al mensual',
  ],
  anual: [
    `Acceso a base de datos con ${APU_COUNT_LABEL} APUs verificados para todo tipo de obra civil`,
    'Hasta 6 proyectos · 10 usuarios',
    'Creación y edición de APUs, insumos y materiales propios',
    'Soporte técnico',
    'Todo lo del plan Semestral',
  ],
  empresa: [
    `Acceso a base de datos con ${APU_COUNT_LABEL} APUs verificados para todo tipo de obra civil`,
    'Proyectos y usuarios a la medida',
    'Personalización de software a la medida',
    'Integraciones, capacitación y soporte dedicado',
  ],
};

/* ─── Cuadrillas predefinidas Kalarti ─── */
/**
 * orden: fase constructiva. Fases con el mismo orden corren en paralelo;
 * una fase empieza cuando terminan todas las de orden menor.
 */
export const CUADRILLAS_DEFAULT = [
  {
    codigo: 'CQ-01', nombre: 'Preliminares y Movimiento de Tierra', orden: 1, color: '#64748b',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 2 }],
    categorias: ['PRELIMINARES', 'MOVIMIENTO DE TIERRA'],
  },
  {
    codigo: 'CQ-02', nombre: 'Estructura y Concretos', orden: 2, color: '#3b82f6',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 3 }],
    categorias: ['CIMENTACIONES', 'ESTRUCTURAS CONCRETO', 'FUNDICION DE PISO', 'BASICOS', 'VIAS'],
  },
  {
    codigo: 'CQ-08', nombre: 'Bioconstrucción en Guadua', orden: 2, color: '#16a34a',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 2 }],
    categorias: ['CONSTRUCCION EN GUADUA', 'CONSTRUCCION EN ROLLIZA', 'ESTRUCTURAS MADERA'],
  },
  {
    codigo: 'CQ-03', nombre: 'Mampostería y Revoques', orden: 3, color: '#f97316',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
    categorias: ['MUROS', 'REVOQUES'],
  },
  {
    codigo: 'CQ-04', nombre: 'Hidrosanitaria', orden: 3, color: '#06b6d4',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
    categorias: ['INSTALACIONES HIDRAULICAS', 'PUNTOS SANITARIOS', 'CANALES Y BAJANTES', 'ALCANTARILLADOS'],
  },
  {
    codigo: 'CQ-05', nombre: 'Eléctrica', orden: 3, color: '#eab308',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
    categorias: ['INSTALACIONES ELECTRICAS'],
  },
  {
    codigo: 'CQ-06', nombre: 'Cubiertas y Carpintería', orden: 4, color: '#a855f7',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
    categorias: ['CUBIERTAS', 'CARPINTERIA MADERA', 'CARPINTERIA METALICA', 'VENTANERIA'],
  },
  {
    codigo: 'CQ-07', nombre: 'Acabados', orden: 5, color: '#ec4899',
    composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
    categorias: ['ENCHAPES', 'ENCHAPES CERAMICOS', 'ACCESORIOS PARA ENCHAPES', 'ACABADOS', 'PINTURAS DETALLADAS', 'ESTUCO Y PINTURA', 'ESTUCOS', 'OBRA EXTERIORES'],
  },
];

export const CUADRILLA_GENERAL = {
  codigo: 'CQ-00', nombre: 'Cuadrilla General', orden: 3, color: '#94a3b8',
  composicion: [{ cargo: 'Oficial', cantidad: 1 }, { cargo: 'Ayudante', cantidad: 1 }],
  categorias: [],
};

export function cuadrillaParaCategoria(categoria, cuadrillas = CUADRILLAS_DEFAULT) {
  const cat = String(categoria || '').toUpperCase().trim();
  return cuadrillas.find(c => (c.categorias || []).includes(cat)) || CUADRILLA_GENERAL;
}

/* ─── Rendimientos por defecto (unidades por día por cuadrilla) ─── */
const REND_POR_UNIDAD = { M3: 2.5, M2: 12, ML: 15, M: 15, UN: 4, KG: 120, GL: 1, LB: 120, DIA: 1 };
const REND_POR_CUADRILLA = {
  'CQ-01': { M2: 40, M3: 6, ML: 30 },
  'CQ-03': { M2: 10 },
  'CQ-07': { M2: 15, ML: 25 },
  'CQ-06': { M2: 14 },
  'CQ-08': { ML: 12, M2: 8, UN: 3 },
};

export function rendimientoSugerido(unidad, cuadrillaCodigo, rendimientoApu) {
  const r = Number(rendimientoApu);
  if (r && r !== 1) return r; // el APU tiene un rendimiento real definido
  const u = String(unidad || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return REND_POR_CUADRILLA[cuadrillaCodigo]?.[u] || REND_POR_UNIDAD[u] || 5;
}

/* ─── Ubicaciones y Factores de Transporte / Fletes ─── */
export const UBICACIONES_COTIZADOR = [
  { id: 'pasto', nombre: 'Pasto (Nariño) - Sede Principal', distanciaKm: 0, factorFlete: 1.0, fleteUrbanoKg: 500 },
  { id: 'ipiales', nombre: 'Ipiales (Nariño)', distanciaKm: 85, factorFlete: 1.06, fleteUrbanoKg: 650 },
  { id: 'ricaurte', nombre: 'Ricaurte / Costa Nariñense', distanciaKm: 142, factorFlete: 1.12, fleteUrbanoKg: 850 },
  { id: 'tuquerres', nombre: 'Túquerres (Nariño)', distanciaKm: 72, factorFlete: 1.05, fleteUrbanoKg: 600 },
  { id: 'bogota', nombre: 'Bogotá D.C.', distanciaKm: 820, factorFlete: 1.08, fleteUrbanoKg: 700 },
  { id: 'cali', nombre: 'Cali (Valle del Cauca)', distanciaKm: 390, factorFlete: 1.05, fleteUrbanoKg: 600 },
  { id: 'medellin', nombre: 'Medellín (Antioquia)', distanciaKm: 780, factorFlete: 1.08, fleteUrbanoKg: 700 },
  { id: 'otra', nombre: 'Otra Ciudad / Municipio', distanciaKm: 100, factorFlete: 1.05, fleteUrbanoKg: 650 },
];

/* ─── Borrador local ─── */
export const DRAFT_KEY = 'kalarti_cotizador_draft_v1';
