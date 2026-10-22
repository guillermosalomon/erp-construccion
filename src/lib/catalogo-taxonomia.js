/**
 * Taxonomía oficial Kalarti de capítulos APU.
 * Compartida por: scripts de catálogo, ERP, Cotizador y exportes.
 * `cuadrilla` = código de la cuadrilla por defecto (ver CUADRILLAS_MO).
 */
export const CAPITULOS_APU = [
  { codigo: '00', nombre: 'BÁSICOS', cuadrilla: 'CUA-OC' },
  { codigo: '01', nombre: 'PRELIMINARES', cuadrilla: 'CUA-OC' },
  { codigo: '02', nombre: 'MOVIMIENTO DE TIERRAS', cuadrilla: 'CUA-OC' },
  { codigo: '03', nombre: 'CIMENTACIÓN', cuadrilla: 'CUA-OC' },
  { codigo: '04', nombre: 'ESTRUCTURA EN CONCRETO', cuadrilla: 'CUA-OC' },
  { codigo: '05', nombre: 'ESTRUCTURA METÁLICA', cuadrilla: 'CUA-CE' },
  { codigo: '06', nombre: 'MAMPOSTERÍA', cuadrilla: 'CUA-OC' },
  { codigo: '07', nombre: 'PAÑETES', cuadrilla: 'CUA-OC' },
  { codigo: '08', nombre: 'PISOS Y ENCHAPES', cuadrilla: 'CUA-OI' },
  { codigo: '09', nombre: 'CUBIERTAS', cuadrilla: 'CUA-OC' },
  { codigo: '10', nombre: 'HIDROSANITARIAS', cuadrilla: 'CUA-OC' },
  { codigo: '11', nombre: 'ELÉCTRICAS', cuadrilla: 'CUA-OC' },
  { codigo: '12', nombre: 'VOZ Y DATOS', cuadrilla: 'CUA-VD' },
  { codigo: '13', nombre: 'AIRE ACONDICIONADO', cuadrilla: 'CUA-AA' },
  { codigo: '14', nombre: 'RED CONTRA INCENDIO', cuadrilla: 'CUA-RCI' },
  { codigo: '15', nombre: 'DRYWALL Y CIELOS', cuadrilla: 'CUA-OI' },
  { codigo: '16', nombre: 'ESTUCO Y PINTURA', cuadrilla: 'CUA-OI' },
  { codigo: '17', nombre: 'CARPINTERÍA', cuadrilla: 'CUA-CE' },
  { codigo: '18', nombre: 'APARATOS SANITARIOS', cuadrilla: 'CUA-OI' },
  { codigo: '19', nombre: 'GUADUA Y MADERA', cuadrilla: 'CUA-OC' },
  { codigo: '20', nombre: 'EXTERIORES Y VÍAS', cuadrilla: 'CUA-OC' },
  { codigo: '21', nombre: 'PISCINAS', cuadrilla: 'CUA-OC' },
  { codigo: '22', nombre: 'GASES MEDICINALES', cuadrilla: 'CUA-GM' },
  { codigo: '23', nombre: 'ASEO Y ENTREGA', cuadrilla: 'CUA-OC' },
];

export const CAPITULO_POR_NOMBRE = new Map(CAPITULOS_APU.map((c) => [c.nombre, c]));

/** Orden de presentación de un capítulo (para cuadros y exportes) */
export function ordenCapitulo(nombre) {
  const c = CAPITULO_POR_NOMBRE.get(String(nombre || '').toUpperCase().trim());
  return c ? Number(c.codigo) : 99;
}

/**
 * Cuadrillas de mano de obra (referente MANO DE OBRA, Hospital Civil Ipiales 2026).
 * Integrantes con n.º de SMLV y factor prestacional (F PRESTACIONAL).
 */
export const CARGOS_MO = [
  { codigo: 'MO-AYU', nombre: 'Ayudante', smlv: 1.0, factor: 1.77 },
  { codigo: 'MO-OFI', nombre: 'Oficial', smlv: 1.5, factor: 1.71 },
  { codigo: 'MO-MAE', nombre: 'Maestro', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-CER', nombre: 'Cerrajero', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-ACE', nombre: 'Auxiliar cerrajería', smlv: 1.0, factor: 1.77 },
  { codigo: 'MO-ORC', nombre: 'Oficial RCI', smlv: 1.5, factor: 1.71 },
  { codigo: 'MO-MRC', nombre: 'Maestro RCI', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-ARC', nombre: 'Auxiliar RCI', smlv: 1.0, factor: 1.77 },
  { codigo: 'MO-OVD', nombre: 'Oficial voz y datos', smlv: 1.5, factor: 1.71 },
  { codigo: 'MO-MVD', nombre: 'Maestro voz y datos', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-AVD', nombre: 'Auxiliar voz y datos', smlv: 1.0, factor: 1.77 },
  { codigo: 'MO-OAA', nombre: 'Oficial aire acondicionado', smlv: 1.5, factor: 1.71 },
  { codigo: 'MO-MAA', nombre: 'Maestro aire acondicionado', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-AAA', nombre: 'Auxiliar aire acondicionado', smlv: 1.0, factor: 1.77 },
  { codigo: 'MO-OGM', nombre: 'Oficial gases medicinales', smlv: 1.5, factor: 1.71 },
  { codigo: 'MO-MGM', nombre: 'Maestro gases medicinales', smlv: 2.0, factor: 1.68 },
  { codigo: 'MO-AGM', nombre: 'Auxiliar gases medicinales', smlv: 1.0, factor: 1.77 },
];

export const CUADRILLAS_MO = [
  { codigo: 'CUA-BAS', nombre: 'Cuadrilla básica (oficial + ayudante)', integrantes: [['MO-OFI', 1], ['MO-AYU', 1]], ref: null },
  { codigo: 'CUA-OC', nombre: 'Cuadrilla obra civil', integrantes: [['MO-AYU', 2], ['MO-OFI', 1], ['MO-MAE', 0.3]], ref: 'CUADRILLA OBRA CIVIL' },
  { codigo: 'CUA-OI', nombre: 'Cuadrilla obra interiores', integrantes: [['MO-AYU', 3], ['MO-OFI', 1], ['MO-MAE', 0.5]], ref: 'CUADRILLA OBRA INTERIORES' },
  { codigo: 'CUA-CE', nombre: 'Cuadrilla cerrajería', integrantes: [['MO-CER', 1], ['MO-ACE', 2]], ref: 'CUADRILLA CERRAJERIA' },
  { codigo: 'CUA-RCI', nombre: 'Cuadrilla red contra incendio', integrantes: [['MO-ORC', 1], ['MO-MRC', 0.5], ['MO-ARC', 3]], ref: 'CUADRILLA RCI EXTINCION' },
  { codigo: 'CUA-DET', nombre: 'Cuadrilla detección incendio', integrantes: [['MO-ORC', 1], ['MO-MRC', 0.3], ['MO-ARC', 2]], ref: 'CUADRILLA RCI DETECCION' },
  { codigo: 'CUA-VD', nombre: 'Cuadrilla voz y datos', integrantes: [['MO-OVD', 0.5], ['MO-MVD', 0.2], ['MO-AVD', 1]], ref: 'CUADRILLA VOZ Y DATOS' },
  { codigo: 'CUA-AA', nombre: 'Cuadrilla aire acondicionado', integrantes: [['MO-OAA', 0.5], ['MO-MAA', 1], ['MO-AAA', 2]], ref: 'CUADRILLA INSTALADORA DE AIRE ACONDICIONADO Y REFRIGERACION' },
  { codigo: 'CUA-GM', nombre: 'Cuadrilla gases medicinales', integrantes: [['MO-OGM', 1], ['MO-MGM', 1], ['MO-AGM', 1]], ref: 'CUADRILLA INSTALADORA RED DE GASES MEDICINALES' },
];

/** Margen comercial Kalarti sobre el mejor precio de compra */
export const MARGEN_KALARTI = 0.15;

/** Redondeo comercial del precio almacén */
export function redondearPrecio(v) {
  if (!(v > 0)) return 0;
  if (v < 1000) return Math.round(v / 10) * 10;
  if (v < 10000) return Math.round(v / 50) * 50;
  return Math.round(v / 100) * 100;
}

/** Precio almacén Kalarti = menor cotización vigente × (1 + margen) */
export function precioKalarti(cotizaciones = [], precioRef = 0, margen = MARGEN_KALARTI) {
  const vals = cotizaciones.map((c) => Number(c.valor ?? c.precio_compra)).filter((v) => v > 0);
  const base = vals.length ? Math.min(...vals) : Number(precioRef) || 0;
  return redondearPrecio(base * (1 + margen));
}
