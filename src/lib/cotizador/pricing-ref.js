/**
 * Generador y fallback de Precios de Mercado / Rendimientos para el catálogo público.
 * Asigna precios de mercado de construcción Colombia (COP) coherentes según la unidad y categoría de cada APU,
 * para que el cotizador público siempre muestre valores profesionales de referencia si no hay cálculo directo en BD.
 */

const PRECIOS_REFERENCIA_POR_CATEGORIA = {
  PRELIMINARES: { M2: 8500, ML: 12000, UN: 180000, GLOBAL: 450000, M3: 35000 },
  'MOVIMIENTO DE TIERRA': { M3: 42000, M2: 12000, ML: 18000 },
  CIMENTACIONES: { M3: 680000, ML: 95000, M2: 85000, UN: 250000, KG: 7800 },
  'ESTRUCTURAS CONCRETO': { M3: 750000, M2: 95000, ML: 65000, KG: 7600, UN: 120000 },
  'FUNDICION DE PISO': { M2: 55000, M3: 620000 },
  MUROS: { M2: 48000, ML: 35000, UN: 28000 },
  REVOQUES: { M2: 24000, ML: 16000 },
  'ESTRUCTURAS MADERA': { M2: 110000, ML: 45000, UN: 85000 },
  'CONSTRUCCION EN GUADUA': { ML: 38000, M2: 145000, UN: 75000, PUNTO: 95000 },
  'CONSTRUCCION EN ROLLIZA': { ML: 42000, M2: 155000, UN: 80000 },
  CUBIERTAS: { M2: 85000, ML: 38000, UN: 120000 },
  'CANALES Y BAJANTES': { ML: 36000, UN: 45000 },
  'INSTALACIONES HIDRAULICAS': { UN: 65000, PTO: 85000, ML: 22000, M: 22000, GLOBAL: 350000 },
  'PUNTOS SANITARIOS': { UN: 95000, PTO: 95000, ML: 28000 },
  ALCANTARILLADOS: { ML: 85000, UN: 320000, M3: 45000 },
  'INSTALACIONES ELECTRICAS': { UN: 48000, PTO: 58000, SAL: 58000, ML: 18000, GLOBAL: 450000 },
  ENCHAPES: { M2: 52000, ML: 22000, UN: 35000 },
  'ENCHAPES CERAMICOS': { M2: 58000, ML: 24000 },
  'ACCESORIOS PARA ENCHAPES': { UN: 45000, ML: 18000, M2: 32000 },
  ACABADOS: { M2: 42000, ML: 22000, UN: 65000 },
  'ESTUCO Y PINTURA': { M2: 22000, ML: 14000 },
  ESTUCOS: { M2: 14000, ML: 9000 },
  'PINTURAS DETALLADAS': { M2: 16000, ML: 11000, UN: 25000 },
  VENTANERIA: { M2: 220000, UN: 350000 },
  'CARPINTERIA MADERA': { UN: 420000, M2: 180000, ML: 65000 },
  'CARPINTERIA METALICA': { M2: 210000, ML: 75000, UN: 380000 },
  'OBRA EXTERIORES': { M2: 65000, ML: 48000, M3: 95000 },
  VIAS: { M2: 85000, M3: 140000, ML: 55000, KG: 7800 },
  BASICOS: { M3: 420000, KG: 6800, UN: 18000 }
};

export function estimarPrecioReferencia(categoria, unidad, nombre = '') {
  const cat = String(categoria || '').toUpperCase().trim();
  const un = String(unidad || 'UN').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const refCat = PRECIOS_REFERENCIA_POR_CATEGORIA[cat] || {};
  
  if (refCat[un]) return refCat[un];
  if (un === 'M2') return refCat.M2 || 45000;
  if (un === 'M3') return refCat.M3 || 550000;
  if (un === 'ML' || un === 'M') return refCat.ML || 28000;
  if (un === 'KG') return 7600;
  if (un === 'PTO' || un === 'SAL') return 65000;
  if (un === 'GL' || un === 'GLOBAL') return 350000;
  
  return refCat.UN || 50000;
}
