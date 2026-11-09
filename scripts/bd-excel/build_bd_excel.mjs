/**
 * Construye la Base de Datos Maestra en Excel para ERP_Construccion:
 *   - D:\DPTO. ARQUITECTURA\0000 presupuestos\BD_MAESTRA_ERP_KALARTI_2026.xlsx
 *   - erp-construccion\public\BD_MAESTRA_ERP_KALARTI_2026.xlsx
 *
 * Arquitectura relacional viva (DAG sin referencias circulares):
 *   00_PARAMETROS_Y_RESUMEN -> 02_CARGOS_MO -> 04_CUADRILLA_DETALLE -> 03_CUADRILLAS
 *   00_PARAMETROS_Y_RESUMEN -> 05_INSUMOS_MAESTRO
 *   (05_INSUMOS_MAESTRO + 03_CUADRILLAS) -> 07_BASICOS_DETALLE -> 06_BASICOS_MAESTRO
 *   (05_INSUMOS_MAESTRO + 03_CUADRILLAS + 06_BASICOS_MAESTRO) -> 09_UNITARIOS_DETALLE -> 08_UNITARIOS_MAESTRO
 *   10_TRAZABILIDAD_Y_HOMOLOGACION
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  CAPITULOS_BD,
  CAPITULO_MAP,
  DISCIPLINAS_MO,
  CARGOS_MO_BD,
  CUADRILLAS_MO_BD,
  norm,
  fixMojibake,
  normalizarUnidad,
  sentenceCaseTecnico,
  modernizarInsumo,
  modernizarNombreApu,
  clasificarApu,
} from './diccionario_unificacion.mjs';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERP_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(__dirname, 'data');
const RAW_PATH = path.join(DATA_DIR, 'raw_sources.json');

const OUT_D_DRIVE = 'D:\\DPTO. ARQUITECTURA\\0000 presupuestos\\BD_MAESTRA_ERP_KALARTI_2026.xlsx';
const OUT_PUBLIC = path.join(ERP_DIR, 'public', 'BD_MAESTRA_ERP_KALARTI_2026.xlsx');

const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
const P = raw.parametros_2026;

const SMLV = P.smlv; // 1,750,905
const AUX_TRANSP = P.auxilio_transporte; // 200,000
const HORAS_MES = P.horas_mes; // 240
const HORAS_DIA = P.horas_dia; // 8
const FP = {
  NIVEL_1: P.fp_1_smlv, // 1.77
  NIVEL_1_5: P.fp_1_5_smlv, // 1.71
  NIVEL_2: P.fp_2_smlv, // 1.68
  PROFESIONAL: P.fp_profesional, // 1.58
};
const FACTOR_INDEX_APEU = P.factor_indexacion_apeu; // 1.5225
const MARGEN_KALARTI = P.margen_kalarti; // 0.15

const trazabilidad = []; // filas para 10_TRAZABILIDAD_Y_HOMOLOGACION

function regTrazabilidad({ entidad, fuente, codigoOrigen, nombreOrigen, codigoNuevo, nombreNuevo, accion, detalle = '' }) {
  trazabilidad.push({
    entidad,
    fuente,
    codigo_origen: codigoOrigen || '—',
    nombre_origen: fixMojibake(nombreOrigen || ''),
    codigo_nuevo: codigoNuevo,
    nombre_nuevo: nombreNuevo,
    accion,
    detalle,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CÁLCULO EXACTO DE CARGOS Y CUADRILLAS POR DISCIPLINA (2026)
// ═══════════════════════════════════════════════════════════════════════════

const cargosMap = new Map();
for (const c of CARGOS_MO_BD) {
  const salBase = SMLV * c.smlv;
  const fp = FP[c.nivel];
  const mensual = salBase * fp;
  const vh = mensual / HORAS_MES;
  const jornal = vh * HORAS_DIA;
  cargosMap.set(c.codigo, {
    ...c,
    disciplina_nombre: DISCIPLINAS_MO[c.disciplina],
    salario_base: salBase,
    factor_prestacional: fp,
    mensual_integral: mensual,
    jornal_diario: jornal,
    valor_hora: vh,
  });
}

const cuadrillasMap = new Map();
const cuadrillaDetalleRows = [];
for (const q of CUADRILLAS_MO_BD) {
  let vh = 0;
  let totalInt = 0;
  for (const [codCargo, cant] of q.integrantes) {
    const cg = cargosMap.get(codCargo);
    const aporte = cant * cg.valor_hora;
    vh += aporte;
    totalInt += cant;
    cuadrillaDetalleRows.push({
      codigo_cuadrilla: q.codigo,
      nombre_cuadrilla: q.nombre,
      codigo_cargo: codCargo,
      nombre_cargo: cg.nombre,
      disciplina: cg.disciplina,
      cantidad: cant,
      valor_hora_cargo: cg.valor_hora,
      aporte_hora: aporte,
    });
  }
  cuadrillasMap.set(q.codigo, {
    ...q,
    disciplina_nombre: DISCIPLINAS_MO[q.disciplina],
    valor_hora: vh,
    valor_jornal: vh * HORAS_DIA,
    total_integrantes: Math.round(totalInt * 100) / 100,
  });
}

// Valor hora de 1 Oficial (1.5 SMLV) + 1 Ayudante (1.0 SMLV) en 2026 (base de equivalencia para cuadrillas APEU)
const VH_BASE_1OFI_1AYU_2026 = (SMLV * 1.5 * FP.NIVEL_1_5 + SMLV * 1.0 * FP.NIVEL_1) / HORAS_MES; // 31,625.7215625

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONSOLIDACIÓN Y DEDUPLICACIÓN DE INSUMOS (05_INSUMOS_MAESTRO)
// ═══════════════════════════════════════════════════════════════════════════

const insumosByKey = new Map(); // claveCanonica -> insumoObj
const insumosByNormName = new Map(); // norm(nombreOriginal) -> claveCanonica
const apeuCodeToKey = new Map(); // codigo_origen APEU -> claveCanonica

function registrarInsumo({
  fuente,
  descripcion,
  categoriaOrigen = '',
  unidadRaw = 'UND',
  tipoRaw = 'MATERIAL',
  precioCotizado2026 = null,
  precioHistoricoApeu = null,
  cotizaciones = [],
  codigoOrigen = null,
}) {
  // Corrección puntual Hospital: CEMENTO GRIS X 50KG tenía unidad KG pero precio $33,499 (que es BULTO)
  let uAjustada = unidadRaw;
  let pCot = precioCotizado2026;
  const N0 = norm(descripcion);
  if (/^CEMENTO GRIS X 50\s?KG$/.test(N0) && normalizarUnidad(unidadRaw) === 'KG') {
    if (pCot && pCot > 10000) {
      uAjustada = 'BTO';
    } else if (pCot && pCot > 0 && pCot < 2000) {
      uAjustada = 'BTO';
      pCot = pCot * 50;
    }
  }

  const mod = modernizarInsumo(descripcion, categoriaOrigen, uAjustada, tipoRaw);
  if (!mod) return null;

  if (mod.esIndiceMil) {
    pCot = 1000;
  }

  let origenPrecio = pCot && pCot > 0 ? 'COTIZADO_2026' : 'APEU_INDEXADO_2026';
  let precioBase = origenPrecio === 'COTIZADO_2026'
    ? Math.round(pCot * 100) / 100
    : Math.round(((precioHistoricoApeu || 0) * (mod.factorPrecio || 1)) * 100) / 100;

  if (!(precioBase > 0)) return null;

  // Buscar existente por clave canónica o por nombre+unidad normalizados
  const altKey = `${mod.tipo}|${norm(mod.nombre)}|${mod.unidad}`;
  const existingKey = insumosByKey.has(mod.claveCanonica)
    ? mod.claveCanonica
    : (insumosByKey.has(altKey) ? altKey : null);

  if (existingKey) {
    const ex = insumosByKey.get(existingKey);
    insumosByNormName.set(N0, existingKey);
    if (codigoOrigen) apeuCodeToKey.set(codigoOrigen, existingKey);
    if (codigoOrigen) apeuCodeToKey.set(codigoOrigen.replace(/^COD-/, ''), existingKey);

    // Fusionar cotizaciones nuevas sin sobrescribir precio 2026 de mayor prioridad
    const provs = new Set(ex.cotizaciones.map((c) => c.proveedor));
    for (const c of cotizaciones) {
      if (c.proveedor && c.valor > 0 && !provs.has(c.proveedor)) {
        ex.cotizaciones.push(c);
        provs.add(c.proveedor);
      }
    }
    // Si el existente era APEU_INDEXADO_2026 y llega uno COTIZADO_2026, promover a 2026
    if (ex.origen_precio === 'APEU_INDEXADO_2026' && origenPrecio === 'COTIZADO_2026') {
      ex.origen_precio = 'COTIZADO_2026';
      ex.precio_base = precioBase;
      ex.fuente_principal = fuente;
    }
    if (!ex.nombres_origen.includes(fixMojibake(descripcion))) {
      ex.nombres_origen.push(fixMojibake(descripcion));
    }
    if (norm(descripcion) !== norm(ex.nombre)) {
      regTrazabilidad({
        entidad: 'INSUMO',
        fuente,
        codigoOrigen,
        nombreOrigen: descripcion,
        codigoNuevo: ex.KeyTemp,
        nombreNuevo: ex.nombre,
        accion: 'FUSIONADO',
        detalle: `Unificado en insumo maestro (${ex.unidad})`,
      });
    }
    return existingKey;
  }

  const key = mod.claveCanonica;
  const obj = {
    KeyTemp: key,
    codigo: null, // asignado luego ordenadamente
    nombre: mod.nombre,
    tipo: mod.tipo,
    categoria: mod.categoria,
    disciplina: mod.disciplina,
    unidad: mod.unidad,
    origen_precio: origenPrecio,
    precio_base: precioBase,
    es_indice_mil: !!mod.esIndiceMil,
    factor_precio_apeu: mod.factorPrecio || 1,
    cotizaciones: [...cotizaciones],
    fuente_principal: fuente,
    nombres_origen: [fixMojibake(descripcion)],
    codigos_origen: codigoOrigen ? [codigoOrigen] : [],
    en_uso: false,
  };

  insumosByKey.set(key, obj);
  if (altKey !== key) insumosByKey.set(altKey, obj);
  insumosByNormName.set(N0, key);
  insumosByNormName.set(norm(mod.nombre), key);
  if (codigoOrigen) {
    apeuCodeToKey.set(codigoOrigen, key);
    apeuCodeToKey.set(codigoOrigen.replace(/^COD-/, ''), key);
  }

  regTrazabilidad({
    entidad: 'INSUMO',
    fuente,
    codigoOrigen,
    nombreOrigen: descripcion,
    codigoNuevo: key,
    nombreNuevo: mod.nombre,
    accion: norm(descripcion) !== norm(mod.nombre) ? 'RENOMBRADO_Y_CREADO' : 'CREADO',
    detalle: origenPrecio === 'APEU_INDEXADO_2026' ? 'Indexado a 2026 por SMLV' : 'Precio directo cotizado 2026',
  });
  return key;
}

// Cargar insumos en orden estricto de prioridad: HOSPITAL -> RICAURTE -> DETECCION -> APEU
for (const [fuenteKey, fuenteLabel] of [['hospital', 'HOSPITAL'], ['ricaurte', 'RICAURTE'], ['deteccion', 'DETECCION']]) {
  const src = raw[fuenteKey];
  for (const m of src.materiales) {
    registrarInsumo({
      fuente: fuenteLabel,
      descripcion: m.descripcion,
      categoriaOrigen: m.categoria,
      unidadRaw: m.unidad,
      tipoRaw: 'MATERIAL',
      precioCotizado2026: m.precio_ref,
      cotizaciones: m.cotizaciones || [],
      codigoOrigen: m.codigo_erp,
    });
  }
  for (const e of src.equipos) {
    registrarInsumo({
      fuente: fuenteLabel,
      descripcion: e.descripcion,
      categoriaOrigen: 'EQUIPOS',
      unidadRaw: e.unidad,
      tipoRaw: 'EQUIPO',
      precioCotizado2026: e.precio,
      codigoOrigen: e.codigo,
    });
  }
  for (const t of src.transportes) {
    registrarInsumo({
      fuente: fuenteLabel,
      descripcion: t.descripcion,
      categoriaOrigen: 'TRANSPORTE',
      unidadRaw: t.unidad,
      tipoRaw: 'TRANSPORTE',
      precioCotizado2026: t.precio,
      codigoOrigen: t.codigo,
    });
  }
}

for (const m of raw.apeu.materiales) {
  registrarInsumo({
    fuente: 'APEU',
    descripcion: m.descripcion,
    categoriaOrigen: m.categoria,
    unidadRaw: m.unidad,
    tipoRaw: m.tipo_origen,
    precioHistoricoApeu: m.precio_historico,
    codigoOrigen: m.codigo_origen,
  });
}

function precioActivoInsumo(ins) {
  return ins.origen_precio === 'APEU_INDEXADO_2026'
    ? Math.round(ins.precio_base * FACTOR_INDEX_APEU * 100) / 100
    : ins.precio_base;
}

function resolverInsumoLinea({ descripcion, unidad, precio, bucket, fuente, refMaterial = null, refEquipo = null }) {
  // 1. Buscar por código APEU si existe
  for (const ref of [refMaterial, refEquipo]) {
    if (ref && apeuCodeToKey.has(ref)) {
      return insumosByKey.get(apeuCodeToKey.get(ref));
    }
  }
  const N = norm(descripcion);
  if (insumosByNormName.has(N)) {
    return insumosByKey.get(insumosByNormName.get(N));
  }
  // 2. Intentar modernizando el nombre de la línea
  const tipo = bucket === 'equipo' ? 'EQUIPO' : bucket === 'transporte' ? 'TRANSPORTE' : 'MATERIAL';
  const key = registrarInsumo({
    fuente,
    descripcion,
    categoriaOrigen: tipo,
    unidadRaw: unidad || 'UND',
    tipoRaw: tipo,
    precioCotizado2026: fuente !== 'APEU' ? precio : null,
    precioHistoricoApeu: fuente === 'APEU' ? precio : null,
  });
  return key ? insumosByKey.get(key) : null;
}

function ajustarCantidadInsumo(ins, cantidadRaw, unidadLineaRaw, precioLinea, fuente) {
  let cant = Number(cantidadRaw) || 0;
  if (!(cant > 0) || !ins) return 0;

  if (ins.es_indice_mil) {
    const p = Number(precioLinea) || 0;
    return p > 0 ? (cant * p) / 1000 : cant;
  }

  const uLin = normalizarUnidad(unidadLineaRaw, ins.nombre);
  // Si el insumo vino de 1/4 Gal en APEU y se normalizó a GAL (x4 precio), escalar consumo x0.25
  if (fuente === 'APEU' && /1\/4\s*GAL/i.test(String(unidadLineaRaw || '')) && ins.unidad === 'GAL') {
    return cant * 0.25;
  }
  // Si en APEU Soldadura PVC estaba en 1/4 Gal (~0.95 LT) y el maestro está en LT, relación 1/4 Gal = 0.946 LT
  if (fuente === 'APEU' && /1\/4\s*GAL/i.test(String(unidadLineaRaw || '')) && ins.unidad === 'LT') {
    return cant * 0.946;
  }
  // Cemento consumido en KG cuando el maestro está en BTO (50 kg o 40 kg)
  if (uLin === 'KG' && ins.unidad === 'BTO') {
    const kgPorBulto = /40\s*KG/i.test(ins.nombre) ? 40 : 50;
    return cant / kgPorBulto;
  }
  // Conversión de empaque real en referentes 2026 (ej. tornillo individual $34 vs caja $17,000; masilla kg vs cuñete)
  if (fuente !== 'APEU' && precioLinea > 0) {
    const pMaster = precioActivoInsumo(ins);
    const ratio = precioLinea / pMaster;
    // Ignorar error de separador de miles (ej. 4.641 vs 4641 -> ratio ~0.001)
    const esErrorMiles = Math.abs(ratio - 0.001) < 0.00015;
    if (!esErrorMiles && (ratio < 0.35 || ratio > 2.8)) {
      cant = cant * ratio;
    }
  }
  return cant;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONSTRUCCIÓN DE ANÁLISIS BÁSICOS (06_BASICOS_MAESTRO + 07_BASICOS_DETALLE)
// ═══════════════════════════════════════════════════════════════════════════

const basicosList = [];
const basicosAliasMap = new Map(); // norm(alias) -> basicoObj

function crearBasico({ nombre, descripcion, disciplina = 'CIV', cuadrilla = 'CUA-CIV', unidad = 'M3', fuente, aliases = [], lineasRaw = [] }) {
  const b = {
    codigo: null,
    nombre,
    descripcion_tecnica: descripcion || nombre,
    disciplina,
    cuadrilla,
    unidad: normalizarUnidad(unidad),
    fuente,
    aliases,
    lineas: [], // { tipo_recurso, insumoRef?, cuadrillaRef?, cantidad }
  };

  for (const l of lineasRaw) {
    if (l.tipo === 'MANO_OBRA') {
      const vhDest = cuadrillasMap.get(cuadrilla).valor_hora;
      const horas = l.costoMo2026 ? l.costoMo2026 / vhDest : l.cantidad;
      const prev = b.lineas.find((x) => x.tipo_recurso === 'MANO_OBRA' && x.cuadrillaRef === cuadrilla);
      if (prev) prev.cantidad += horas;
      else b.lineas.push({ tipo_recurso: 'MANO_OBRA', cuadrillaRef: cuadrilla, cantidad: horas });
    } else {
      const ins = resolverInsumoLinea({
        descripcion: l.descripcion,
        unidad: l.unidad,
        precio: l.precio,
        bucket: l.bucket || 'material',
        fuente,
      });
      if (!ins) continue;
      ins.en_uso = true;
      const cant = ajustarCantidadInsumo(ins, l.cantidad, l.unidad, l.precio, fuente);
      const prev = b.lineas.find((x) => x.insumoObj === ins);
      if (prev) prev.cantidad += cant;
      else b.lineas.push({ tipo_recurso: ins.tipo, insumoObj: ins, cantidad: cant });
    }
  }

  basicosList.push(b);
  for (const al of [nombre, ...aliases]) {
    basicosAliasMap.set(norm(al), b);
    basicosAliasMap.set(norm(al).replace(/[()]/g, ''), b);
  }
  return b;
}

function convertirLineasBasicoReferente(bRef) {
  return bRef.lineas.map((l) => {
    if (l.bucket === 'mano_obra' || /CUADRILLA|VALOR HORA/i.test(l.descripcion)) {
      const f = /^(DIA|JORNADA|JORNAL)$/i.test(l.unidad) ? 8 : 1;
      const pHora = f === 8 ? (l.precio || 0) / 8 : (l.precio || cuadrillasMap.get('CUA-CIV').valor_hora);
      return {
        tipo: 'MANO_OBRA',
        cantidad: (l.cantidad || 0) * f,
        costoMo2026: (l.cantidad || 0) * f * pHora,
      };
    }
    return {
      tipo: 'INSUMO',
      descripcion: l.descripcion,
      unidad: l.unidad,
      cantidad: l.cantidad,
      precio: l.precio,
      bucket: l.bucket,
    };
  });
}

// 3.1 Básicos de Hospital (8 básicos principales)
const hospBasMap = new Map(raw.hospital.basicos.map((b) => [norm(b.descripcion), b]));
const ricBasMap = new Map(raw.ricaurte.basicos.map((b) => [norm(b.descripcion), b]));

crearBasico({
  nombre: 'Mortero seco 1:2 mezclado en obra',
  descripcion: 'Mortero de pega y relleno dosificación 1:2 preparado en obra',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'RICAURTE',
  aliases: ['MORTERO 1:2', 'MORTERO (1:2)', 'MORTERO (1:2) MEZCLADO EN OBRA (RELLENO DE CANUTOS EN UNIONES DE GUADUA - ERP)'],
  lineasRaw: convertirLineasBasicoReferente(ricBasMap.get(norm('MORTERO (1:2) MEZCLADO EN OBRA (RELLENO DE CANUTOS EN UNIONES DE GUADUA - ERP)'))),
});

crearBasico({
  nombre: 'Mortero seco 1:3 mezclado en obra',
  descripcion: 'Mortero dosificación 1:3 preparado en obra para mampostería, pañetes y pisos',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['MORTERO (1:3)', 'MORTERO 1:3', 'MORTERO (1:3) MEZCLADO EN OBRA'],
  lineasRaw: convertirLineasBasicoReferente(hospBasMap.get('MORTERO 1:3') || raw.hospital.basicos[0]),
});

crearBasico({
  nombre: 'Mortero seco 1:4 mezclado en obra',
  descripcion: 'Mortero dosificación 1:4 preparado en obra para pega de mampostería y revoque',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['MORTERO (1:4)', 'MORTERO 1:4', 'MORTERO (1:4) MEZCLADO EN OBRA'],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[1]),
});

crearBasico({
  nombre: 'Mortero seco 1:5 mezclado en obra',
  descripcion: 'Mortero pobre dosificación 1:5 preparado en obra para nivelaciones y plantillas',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'APEU',
  aliases: ['MORTERO 1:5', 'MORTERO (1:5)'],
  lineasRaw: [
    { tipo: 'INSUMO', descripcion: 'ARENA NEGRA', unidad: 'M3', cantidad: 1.18, precio: 85000, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'CEMENTO GRIS X 50KG', unidad: 'BTO', cantidad: 6.0, precio: 33499, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'AGUA', unidad: 'LT', cantidad: 160, precio: 22, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'Transporte Agregados', unidad: 'M3/KM', cantidad: 42.0, precio: 1230.54, bucket: 'transporte' },
    { tipo: 'MANO_OBRA', cantidad: 3.8, costoMo2026: 3.8 * 51892.44694 },
  ],
});

crearBasico({
  nombre: 'Mortero impermeabilizado 1:2 con aditivo hidrófugo',
  descripcion: 'Mortero rico 1:2 impermeabilizado integralmente con Sika-1 para zonas húmedas y tanques',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'APEU',
  aliases: ['MORT 1:2 IMP', 'MORTERO 1:2 IMPERMEABILIZADO'],
  lineasRaw: [
    { tipo: 'INSUMO', descripcion: 'ARENA NEGRA', unidad: 'M3', cantidad: 0.97, precio: 85000, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'CEMENTO GRIS X 50KG', unidad: 'BTO', cantidad: 11.5, precio: 33499, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'AGUA', unidad: 'LT', cantidad: 210, precio: 22, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'Sika 1', unidad: 'GAL', cantidad: 5.27, precio: 25600 * FACTOR_INDEX_APEU, bucket: 'material' },
    { tipo: 'MANO_OBRA', cantidad: 4.2, costoMo2026: 4.2 * 51892.44694 },
  ],
});

crearBasico({
  nombre: 'Mortero impermeabilizado 1:3 con aditivo Sika-1',
  descripcion: 'Mortero 1:3 impermeabilizado con hidrófugo integral Sika-1 para sobrecimientos, baños y piscinas',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'RICAURTE',
  aliases: ['MORTERO (1:3) IMPERMEABILIZADO CON SIKA-1', 'MORT 1:3 IMP'],
  lineasRaw: convertirLineasBasicoReferente(ricBasMap.get(norm('MORTERO (1:3) IMPERMEABILIZADO CON SIKA-1'))),
});

crearBasico({
  nombre: 'Mortero impermeabilizado 1:4 con aditivo hidrófugo',
  descripcion: 'Mortero 1:4 impermeabilizado integralmente con Sika-1 para revoques exteriores',
  disciplina: 'MAM',
  cuadrilla: 'CUA-MAM',
  unidad: 'M3',
  fuente: 'APEU',
  aliases: ['MORT 1:4 IMP'],
  lineasRaw: [
    { tipo: 'INSUMO', descripcion: 'ARENA NEGRA', unidad: 'M3', cantidad: 1.16, precio: 85000, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'CEMENTO GRIS X 50KG', unidad: 'BTO', cantidad: 7.25, precio: 33499, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'AGUA', unidad: 'LT', cantidad: 170, precio: 22, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'Sika 1', unidad: 'GAL', cantidad: 4.08, precio: 25600 * FACTOR_INDEX_APEU, bucket: 'material' },
    { tipo: 'MANO_OBRA', cantidad: 4.0, costoMo2026: 4.0 * 51892.44694 },
  ],
});

crearBasico({
  nombre: 'Concreto pobre 10.5 MPa (1500 psi / 1:4:8) preparado en obra',
  descripcion: 'Concreto simple de limpieza y nivelación dosificación 1:4:8 preparado en obra',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'APEU',
  aliases: ['CCTO 1:4:8', 'CONCRETO 1500 PSI'],
  lineasRaw: [
    { tipo: 'INSUMO', descripcion: 'ARENA NEGRA', unidad: 'M3', cantidad: 0.56, precio: 85000, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'CEMENTO GRIS X 50KG', unidad: 'BTO', cantidad: 3.5, precio: 33499, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'GRAVILLA 3/4"', unidad: 'M3', cantidad: 1.02, precio: 115000, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'AGUA', unidad: 'LT', cantidad: 160, precio: 22, bucket: 'material' },
    { tipo: 'INSUMO', descripcion: 'Mezcladora de concreto 1 bulto', unidad: 'HORA', cantidad: 3.5, precio: 6553, bucket: 'equipo' },
    { tipo: 'MANO_OBRA', cantidad: 4.2, costoMo2026: 4.2 * 51892.44694 },
  ],
});

crearBasico({
  nombre: 'Concreto simple 14 MPa (2000 psi / 1:3:6) preparado en obra',
  descripcion: 'Concreto f\'c=14 MPa (2000 psi) preparado en obra para solados, bases y ciclópeos',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['CONCRETO 2000 PSI', 'CCTO 1:3:6'],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[2]),
});

crearBasico({
  nombre: 'Concreto 17.5 MPa (2500 psi / 1:2:4) preparado en obra',
  descripcion: 'Concreto f\'c=17.5 MPa (2500 psi) preparado en obra para contrapisos, andenes y solados',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['CONCRETO 2500 PSI', 'CCTO 1:2:4', "CONCRETO f'c=17.5 MPa (2500 PSI - SOLADOS DE LIMPIEZA SEGÚN PLANO E-1)"],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[3]),
});

crearBasico({
  nombre: 'Concreto estructural 21 MPa (3000 psi / 1:2:3) preparado en obra',
  descripcion: 'Concreto estructural f\'c=21 MPa (3000 psi) preparado en obra',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['CONCRETO 3000 PSI', 'CCTO 1:2:3', "CONCRETO ESTRUCTURAL f'c=21 MPa (3000 PSI) MEZCLADO EN OBRA"],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[4]),
});

crearBasico({
  nombre: 'Concreto hidráulico estanco 21 MPa (3000 psi) impermeabilizado',
  descripcion: 'Concreto hidráulico impermeable f\'c=21 MPa (3000 psi) con Sika-1 para tanques, PTAR y piscinas',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'RICAURTE',
  aliases: ["CONCRETO HIDRÁULICO ESTANCO f'c=21 MPa (3000 PSI) + SIKA-1 (TANQUE Y PISCINA)", 'CCTO 1:2:3 ACE'],
  lineasRaw: convertirLineasBasicoReferente(ricBasMap.get(norm("CONCRETO HIDRÁULICO ESTANCO f'c=21 MPa (3000 PSI) + SIKA-1 (TANQUE Y PISCINA)"))),
});

crearBasico({
  nombre: 'Concreto estructural 24.5 MPa (3500 psi) preparado en obra',
  descripcion: 'Concreto estructural f\'c=24.5 MPa (3500 psi) preparado en obra',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['CONCRETO 3500 PSI'],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[5]),
});

crearBasico({
  nombre: 'Concreto estructural 28 MPa (4000 psi / 1:2:2) preparado en obra',
  descripcion: 'Concreto estructural de alta resistencia f\'c=28 MPa (4000 psi) preparado en obra',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'HOSPITAL',
  aliases: ['CONCRETO 4000 PSI', 'CCTO 1:2:2', 'CCTO 1:2:2 ACE'],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[6]),
});

crearBasico({
  nombre: 'Concreto ciclópeo 60% concreto 14 MPa + 40% piedra rajón',
  descripcion: 'Mezcla en obra de concreto ciclópeo (60% concreto simple 2000 psi y 40% piedra rajón)',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M3',
  fuente: 'APEU',
  aliases: ['CCTO CICLOPEO', 'CONCRETO CICLOPEO'],
  lineasRaw: [
    ...convertirLineasBasicoReferente(raw.hospital.basicos[2]).map((l) => ({
      ...l,
      cantidad: l.cantidad * 0.6,
      costoMo2026: l.costoMo2026 ? l.costoMo2026 * 0.6 : undefined,
    })),
    { tipo: 'INSUMO', descripcion: 'Rajón', unidad: 'M3', cantidad: 0.42, precio: 30000, bucket: 'material' },
  ],
});

crearBasico({
  nombre: 'Formaleta en madera y tablero para concreto (por m² contacto)',
  descripcion: 'Suministro, armado y desencofre de formaleta en madera común, listón y guadua',
  disciplina: 'CIV',
  cuadrilla: 'CUA-CIV',
  unidad: 'M2',
  fuente: 'HOSPITAL',
  aliases: ['FORMALETA', 'FORMALETA EN MADERA / TABLERO PARA ESTRUCTURAS DE CONCRETO (POR M2 DE CONTACTO)'],
  lineasRaw: convertirLineasBasicoReferente(raw.hospital.basicos[7]),
});

// Asignar códigos 00.001..00.016 y precalcular costos de básicos
basicosList.forEach((b, idx) => {
  b.codigo = `00.${String(idx + 1).padStart(3, '0')}`;
  let eq = 0, mat = 0, mo = 0, tr = 0;
  for (const l of b.lineas) {
    if (l.tipo_recurso === 'MANO_OBRA') {
      const p = cuadrillasMap.get(l.cuadrillaRef).valor_hora;
      l.precio_calc = p;
      mo += l.cantidad * p;
    } else {
      const p = precioActivoInsumo(l.insumoObj);
      l.precio_calc = p;
      const sub = l.cantidad * p;
      if (l.tipo_recurso === 'EQUIPO') eq += sub;
      else if (l.tipo_recurso === 'TRANSPORTE') tr += sub;
      else mat += sub;
    }
  }
  b.c_equipo = eq;
  b.c_material = mat;
  b.c_mo = mo;
  b.c_transporte = tr;
  b.c_total = eq + mat + mo + tr;
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. CONSTRUCCIÓN Y UNIFICACIÓN DE UNITARIOS (08_UNITARIOS_MAESTRO)
// ═══════════════════════════════════════════════════════════════════════════

const apeuUnitMap = new Map(raw.apeu.unitarios.map((u) => [u.codigo_origen, u]));
const apeuUnitNormMap = new Map(raw.apeu.unitarios.map((u) => [norm(u.codigo_origen), u]));
const bdUnitMo = raw.apeu.bd_unit_mo || {};

/**
 * Resuelve el costo de mano de obra 2026 de una línea de APEU usando `bd_unit_mo`
 */
function costoMoLineaApeu2026(lineaApeu) {
  const cant = Number(lineaApeu.cantidad) || 0;
  if (!(cant > 0)) return 0;
  const info = lineaApeu.ref_mo ? bdUnitMo[lineaApeu.ref_mo] : null;
  if (info && info.rendimiento_horas > 0) {
    const u = normalizarUnidad(info.unidad);
    // Jornales directos (Topógrafo, Cadeneros, Maestro/Oficial/Ayudante por Día)
    if (u === 'DIA' || /TOPOGRAFO|CADENERO/i.test(info.cuadrilla_base)) {
      const horas = info.rendimiento_horas * (u === 'DIA' ? 8 : 1);
      if (/TOPOGRAFO/i.test(info.cuadrilla_base) && info.integrantes_extra.length > 0) {
        return cant * horas * cuadrillasMap.get('CUA-TOP').valor_hora;
      }
      return cant * horas * VH_BASE_1OFI_1AYU_2026;
    }
    return cant * info.rendimiento_horas * VH_BASE_1OFI_1AYU_2026;
  }
  // Respaldo: indexar el parcial histórico de MO por relación de SMLV
  if (lineaApeu.parcial_historico > 0) {
    return lineaApeu.parcial_historico * FACTOR_INDEX_APEU;
  }
  return cant * 0.25 * VH_BASE_1OFI_1AYU_2026;
}

/**
 * Expande recursivamente las líneas de un unitario de APEU para que NUNCA quede un SUB_APU
 * de nivel 3: solo MATERIAL, EQUIPO, TRANSPORTE, MANO_OBRA o BASICO (de 06_BASICOS_MAESTRO).
 */
function expandirLineasApeu(uApeu, factorEscala = 1, visitados = new Set()) {
  if (!uApeu || visitados.has(uApeu.codigo_origen)) return { items: [], despPct: 0, hmPct: 0, moCosto2026: 0 };
  const nextVis = new Set(visitados);
  nextVis.add(uApeu.codigo_origen);

  const items = []; // { kind: 'INSUMO'|'BASICO', obj, cantidad }
  let despPct = 0;
  let hmPct = 0;
  let moCosto2026 = 0;

  for (const l of uApeu.lineas) {
    const q = (Number(l.cantidad) || 0) * factorEscala;
    if (!(q > 0) && l.tipo_linea !== 'DESPERDICIO' && l.tipo_linea !== 'HERRAMIENTA_MENOR') continue;

    if (l.tipo_linea === 'DESPERDICIO') {
      const d = Number(l.cantidad) || 0;
      if (d > 0 && d <= 0.25) despPct = Math.max(despPct, Math.round(d * 10000) / 100);
      continue;
    }
    if (l.tipo_linea === 'HERRAMIENTA_MENOR') {
      const h = Number(l.cantidad) || 0;
      hmPct = Math.max(hmPct, h > 0 && h <= 0.25 ? Math.round(h * 10000) / 100 : 5);
      continue;
    }
    if (l.tipo_linea === 'MANO_OBRA') {
      moCosto2026 += costoMoLineaApeu2026(l) * factorEscala;
      continue;
    }
    if (l.tipo_linea === 'SUB_APU') {
      const refId = l.ref_compuesto || l.nombre_componente;
      const refNorm = norm(refId);

      // Caso 1: FORMALETA 4u en APEU = 0.25 usos del Básico Formaleta
      if (/^FORMALETA 4U$/i.test(refNorm)) {
        const basForm = basicosAliasMap.get('FORMALETA');
        items.push({ kind: 'BASICO', obj: basForm, cantidad: q * 0.25 });
        continue;
      }
      // Caso 2: ACERO 1/4"..1" en APEU Basicos -> expandir a Acero figurado (kg) + Alambre de amarre (kg)
      if (/^ACERO\s+([\d/."]+|PROME)/.test(refNorm)) {
        const insAcero = insumosByKey.get('MAT_ACERO_FIGURADO_60000');
        const insAlambre = insumosByKey.get('MAT_ALAMBRE_AMARRE_18');
        insAcero.en_uso = true;
        insAlambre.en_uso = true;
        items.push({ kind: 'INSUMO', obj: insAcero, cantidad: q * 1.03 });
        items.push({ kind: 'INSUMO', obj: insAlambre, cantidad: q * 0.04 });
        continue;
      }
      // Caso 3: Coincide con un Básico real de 06_BASICOS_MAESTRO
      if (basicosAliasMap.has(refNorm)) {
        items.push({ kind: 'BASICO', obj: basicosAliasMap.get(refNorm), cantidad: q });
        continue;
      }
      // Caso 4: INTERRUPTOR CONMUTABLE (0 líneas en APEU, pero existe COD-Interruptor conm en materiales)
      if (refNorm === 'INTERRUPTOR CONMUTABLE') {
        const insInt = resolverInsumoLinea({
          descripcion: 'Interruptor conm',
          unidad: 'Un',
          precio: 8100,
          bucket: 'material',
          fuente: 'APEU',
          refMaterial: 'COD-Interruptor conm',
        });
        if (insInt) {
          insInt.en_uso = true;
          items.push({ kind: 'INSUMO', obj: insInt, cantidad: q });
        }
        moCosto2026 += q * 0.15 * VH_BASE_1OFI_1AYU_2026;
        continue;
      }
      // Caso 5: Sub-APU compuesto de APEU -> expandir sus componentes inline
      const subU = apeuUnitMap.get(refId) || apeuUnitNormMap.get(refNorm);
      if (subU && subU.lineas.length > 0) {
        const subExp = expandirLineasApeu(subU, q, nextVis);
        items.push(...subExp.items);
        moCosto2026 += subExp.moCosto2026;
        despPct = Math.max(despPct, subExp.despPct);
        hmPct = Math.max(hmPct, subExp.hmPct);
        continue;
      }
    }

    // Línea de material o equipo normal
    const ins = resolverInsumoLinea({
      descripcion: l.nombre_componente || l.descripcion_fila,
      unidad: l.unidad,
      precio: l.precio_historico,
      bucket: l.tipo_linea === 'EQUIPO' ? 'equipo' : 'material',
      fuente: 'APEU',
      refMaterial: l.ref_material,
      refEquipo: l.ref_equipo,
    });
    if (ins) {
      ins.en_uso = true;
      const cantAj = ajustarCantidadInsumo(ins, q, l.unidad, l.precio_historico, 'APEU');
      if (cantAj > 0) items.push({ kind: 'INSUMO', obj: ins, cantidad: cantAj });
    }
  }

  return { items, despPct, hmPct, moCosto2026 };
}

const STOP_DEDUP_APU = new Set(['DE', 'DEL', 'EN', 'EL', 'LA', 'LOS', 'LAS', 'PARA', 'POR', 'A', 'AL']);
function claveCanonicaApu(nombre, unidad) {
  const tokens = norm(nombre)
    .split(' ')
    .filter((w) => w && !STOP_DEDUP_APU.has(w))
    .map((w) => w.replace(/^(ZAPATAS|PEDESTALES|COLUMNAS|VIGAS|MUROS|CAJAS|PUNTOS|BAJANTES)$/, (m) => m.slice(0, -1)));
  return `${tokens.join(' ')}|${unidad}`;
}

const unitariosByCanon = new Map(); // claveCanonicaApu -> unitarioObj

function consolidarLineasUnitario(itemsRaw, moCosto2026, cuadrillaCodigo, despPctDefault, hmPctDefault) {
  const mapIns = new Map();
  const mapBas = new Map();

  for (const it of itemsRaw) {
    if (!(it.cantidad > 0) || !it.obj) continue;
    if (it.kind === 'BASICO') {
      const prev = mapBas.get(it.obj.codigo) || { obj: it.obj, cantidad: 0 };
      prev.cantidad += it.cantidad;
      mapBas.set(it.obj.codigo, prev);
    } else {
      it.obj.en_uso = true;
      const k = it.obj.KeyTemp;
      const prev = mapIns.get(k) || { obj: it.obj, cantidad: 0, desp: it.desp ?? despPctDefault };
      prev.cantidad += it.cantidad;
      mapIns.set(k, prev);
    }
  }

  const lineas = [];
  for (const { obj, cantidad } of mapBas.values()) {
    lineas.push({
      tipo_recurso: 'BASICO',
      basicoObj: obj,
      cantidad: Math.round(cantidad * 100000) / 100000,
      desperdicio_pct: despPctDefault > 0 ? despPctDefault : 0,
      herramienta_menor_pct: 0,
    });
  }
  for (const { obj, cantidad, desp } of mapIns.values()) {
    lineas.push({
      tipo_recurso: obj.tipo,
      insumoObj: obj,
      cantidad: Math.round(cantidad * 100000) / 100000,
      desperdicio_pct: obj.tipo === 'MATERIAL' ? (desp || 0) : 0,
      herramienta_menor_pct: 0,
    });
  }

  if (moCosto2026 > 0) {
    const vh = cuadrillasMap.get(cuadrillaCodigo).valor_hora;
    const horas = Math.max(0.005, Math.round((moCosto2026 / vh) * 100000) / 100000);
    lineas.push({
      tipo_recurso: 'MANO_OBRA',
      cuadrillaCodigo,
      cantidad: horas,
      desperdicio_pct: 0,
      herramienta_menor_pct: hmPctDefault,
    });
  }

  return lineas;
}

function registrarUnitarioReferente(apuRef, categoriaCuadro = '') {
  // Descartar cascarones en $0 repetidos (ej. VRF 3/4 duplicados sin precio en Hospital)
  const tieneLineasConValor = apuRef.lineas.some((l) => (l.cantidad || 0) > 0 && ((l.precio || 0) > 0 || l.bucket === 'mano_obra'));
  if (!tieneLineasConValor || (apuRef.directo !== null && apuRef.directo <= 0 && apuRef.lineas.length <= 1)) {
    regTrazabilidad({
      entidad: 'UNITARIO',
      fuente: apuRef.fuente,
      codigoOrigen: apuRef.item,
      nombreOrigen: apuRef.descripcion,
      codigoNuevo: 'DESCARTADO',
      nombreNuevo: apuRef.descripcion,
      accion: 'DESCARTADO_SIN_PRECIO_DUPLICADO',
      detalle: 'Ítem en $0 repetido de otra zona VRF con ítem completo ya cargado',
    });
    return;
  }

  const mod = modernizarNombreApu(apuRef.descripcion);
  const clasif = clasificarApu({
    nombreModerno: mod.nombre,
    nombreOriginal: apuRef.descripcion,
    categoriaOrigen: categoriaCuadro,
    fuente: apuRef.fuente,
    subfuente: apuRef.subfuente,
    itemCode: apuRef.item,
  });

  // Corregir unidad de cables lineales en Detección que venían marcados UND con precio por ML
  let unidadFinal = normalizarUnidad(apuRef.unidad, mod.nombre);
  if (apuRef.fuente === 'DETECCION' && /^CABLE\s+(DE\s+INCENDIO|UTP)/i.test(norm(mod.nombre)) && unidadFinal === 'UND') {
    unidadFinal = 'ML';
  }

  const itemsRaw = [];
  let moCosto2026 = 0;
  let hmPct = 0;

  for (const l of apuRef.lineas) {
    const D = norm(l.descripcion);
    const cant = Number(l.cantidad) || 0;
    if (!(cant > 0)) continue;

    // Herramienta menor expresada como %, GLB o HORA con factor <= 0.20 o "(5% MO)"
    if (/HERRAMIENTA MENOR/.test(D)) {
      const mPct = D.match(/(\d+(?:\.\d+)?)\s*%/);
      if (mPct) hmPct = Math.max(hmPct, Number(mPct[1]));
      else if (cant > 0 && cant <= 0.25) hmPct = Math.max(hmPct, Math.round(cant * 10000) / 100);
      else hmPct = Math.max(hmPct, 5);
      continue;
    }

    // Mano de obra / cuadrillas / especialista certificador
    if (l.bucket === 'mano_obra' || /CUADRILLA|VALOR HORA|TECNICO ESPECIALISTA CERTIFICADOR/.test(D)) {
      const esJornal = /^(DIA|JORNADA|JORNAL)$/i.test(l.unidad) || (l.precio > 180000 && !/TECNICO ESPECIALISTA/.test(D));
      let costoLinea = 0;
      if (l.precio > 0) {
        costoLinea = cant * l.precio;
      } else {
        // Caso puntual HOSP 9.1.3 donde HH tenía precio 0 en celda pero 20 HH de cuadrilla
        const horas = cant * (esJornal ? 8 : 1);
        costoLinea = horas * cuadrillasMap.get(clasif.cuadrilla).valor_hora;
      }
      moCosto2026 += costoLinea;
      continue;
    }

    // ¿Es un Básico de 06_BASICOS_MAESTRO?
    const basMatch = basicosAliasMap.get(D) || basicosAliasMap.get(D.replace(/[()]/g, ''));
    if (basMatch) {
      itemsRaw.push({ kind: 'BASICO', obj: basMatch, cantidad: cant });
      continue;
    }

    // Insumo normal (Material, Equipo o Transporte)
    const ins = resolverInsumoLinea({
      descripcion: l.descripcion,
      unidad: l.unidad,
      precio: l.precio,
      bucket: l.bucket,
      fuente: apuRef.fuente,
    });
    if (ins) {
      const cantAj = ajustarCantidadInsumo(ins, cant, l.unidad, l.precio, apuRef.fuente);
      itemsRaw.push({ kind: 'INSUMO', obj: ins, cantidad: cantAj, desp: 0 });
    }
  }

  const lineas = consolidarLineasUnitario(itemsRaw, moCosto2026, clasif.cuadrilla, 0, hmPct);
  if (lineas.length === 0) return;

  const canonKey = claveCanonicaApu(mod.nombre, unidadFinal);
  if (unitariosByCanon.has(canonKey)) {
    const ex = unitariosByCanon.get(canonKey);
    const codOrig = apuRef.codigo_erp || apuRef.item;
    if (codOrig && !ex.codigos_anteriores.includes(`${apuRef.fuente}:${codOrig}`)) {
      ex.codigos_anteriores.push(`${apuRef.fuente}:${codOrig}`);
    }
    regTrazabilidad({
      entidad: 'UNITARIO',
      fuente: apuRef.fuente,
      codigoOrigen: codOrig,
      nombreOrigen: apuRef.descripcion,
      codigoNuevo: ex.KeyTemp,
      nombreNuevo: ex.nombre,
      accion: 'FUSIONADO_DUPLICADO',
      detalle: `Conservado referente prioritario (${ex.fuente_principal})`,
    });
    return;
  }

  const uObj = {
    KeyTemp: canonKey,
    codigo: null,
    codigo_capitulo: clasif.codigoCapitulo,
    capitulo: clasif.capitulo,
    disciplina: clasif.disciplina,
    nombre: mod.nombre,
    descripcion_tecnica: mod.descripcionTecnica,
    unidad: unidadFinal,
    cuadrilla: clasif.cuadrilla,
    lineas,
    fuente_principal: apuRef.fuente,
    codigos_anteriores: [`${apuRef.fuente}:${apuRef.codigo_erp || apuRef.item || 'S/C'}`],
  };

  unitariosByCanon.set(canonKey, uObj);
  regTrazabilidad({
    entidad: 'UNITARIO',
    fuente: apuRef.fuente,
    codigoOrigen: apuRef.codigo_erp || apuRef.item,
    nombreOrigen: apuRef.descripcion,
    codigoNuevo: canonKey,
    nombreNuevo: mod.nombre,
    accion: mod.fueRenombrado ? 'RENOMBRADO_Y_ESTANDARIZADO' : 'ESTANDARIZADO',
    detalle: `Disciplina ${clasif.disciplina} (${clasif.cuadrilla})`,
  });
}

// Mapa de capítulos de origen desde los cuadros de presupuesto
const cuadroCapMap = new Map();
for (const c of [...raw.hospital.cuadro, ...raw.ricaurte.cuadro, ...raw.deteccion.cuadro]) {
  cuadroCapMap.set(`${c.fuente}|${c.item}`, c.capitulo_origen);
}

// 4.1 Procesar referentes 2026 en orden de prioridad: HOSPITAL -> RICAURTE -> DETECCION
for (const a of raw.hospital.apus) {
  registrarUnitarioReferente(a, cuadroCapMap.get(`HOSPITAL|${a.item}`) || '');
}
for (const a of raw.ricaurte.apus) {
  registrarUnitarioReferente(a, cuadroCapMap.get(`RICAURTE|${a.item}`) || '');
}
for (const a of [...raw.deteccion.apus_deteccion, ...raw.deteccion.apus_extincion, ...raw.deteccion.apus_civil]) {
  registrarUnitarioReferente(a, cuadroCapMap.get(`DETECCION|${a.item}`) || '');
}

// 4.2 Procesar unitarios de APEU (omitiendo básicos simples ya migrados a 06_BASICOS_MAESTRO o materiales)
for (const u of raw.apeu.unitarios) {
  const codNorm = norm(u.codigo_origen);
  const catNorm = norm(u.categoria);

  // Omitir los ítems de la categoría BASICOS de APEU (ya representados en 06_BASICOS_MAESTRO o materiales simples)
  // excepto LOSA PREFABR 7 CM que es una actividad constructiva real de entrepiso
  if (catNorm === 'BASICOS' && codNorm !== 'LOSA PREFABR 7 CM') {
    regTrazabilidad({
      entidad: 'BASICO_APEU',
      fuente: 'APEU',
      codigoOrigen: u.codigo_origen,
      nombreOrigen: u.descripcion,
      codigoNuevo: basicosAliasMap.get(codNorm)?.codigo || '05_INSUMOS_MAESTRO',
      nombreNuevo: basicosAliasMap.get(codNorm)?.nombre || 'Integrado directamente como insumo/mezcla',
      accion: 'HOMOLOGADO_EN_BASICOS_O_INSUMOS',
      detalle: 'Eliminada redundancia de hoja BASICOS de APEU',
    });
    continue;
  }

  // Casos de 0 líneas en APEU: INTERRUPTOR CONMUTABLE y TABL CONTROL 4 CIRCUITOS -> construir limpio si no existen
  let exp;
  if (u.lineas.length === 0) {
    if (codNorm === 'INTERRUPTOR CONMUTABLE') {
      const ins = resolverInsumoLinea({ descripcion: 'Interruptor conm', unidad: 'Un', precio: 8100, bucket: 'material', fuente: 'APEU', refMaterial: 'COD-Interruptor conm' });
      exp = { items: ins ? [{ kind: 'INSUMO', obj: ins, cantidad: 1 }] : [], despPct: 0, hmPct: 5, moCosto2026: 0.2 * VH_BASE_1OFI_1AYU_2026 };
    } else if (codNorm === 'TABL CONTROL 4 CIRCUITOS') {
      const insTab = resolverInsumoLinea({ descripcion: 'Tablero 4 circuit', unidad: 'Un', precio: 32500, bucket: 'material', fuente: 'APEU', refMaterial: 'COD-Tablero 4 circuit' });
      const insBrk = resolverInsumoLinea({ descripcion: 'Breacker 15 amp', unidad: 'Un', precio: 8500, bucket: 'material', fuente: 'APEU', refMaterial: 'COD-Breacker 15 amp' });
      exp = {
        items: [
          ...(insTab ? [{ kind: 'INSUMO', obj: insTab, cantidad: 1 }] : []),
          ...(insBrk ? [{ kind: 'INSUMO', obj: insBrk, cantidad: 4 }] : []),
        ],
        despPct: 0,
        hmPct: 5,
        moCosto2026: 1.2 * VH_BASE_1OFI_1AYU_2026,
      };
    } else {
      continue;
    }
  } else {
    exp = expandirLineasApeu(u, 1);
  }

  const mod = modernizarNombreApu(u.descripcion || u.codigo_origen);
  const clasif = clasificarApu({
    nombreModerno: mod.nombre,
    nombreOriginal: u.descripcion,
    categoriaOrigen: u.categoria,
    fuente: 'APEU',
  });

  // Correcciones puntuales de unidades erróneas en APEU
  let unidadFinal = normalizarUnidad(u.unidad, mod.nombre);
  if (codNorm === 'CODO GRESS 4') unidadFinal = 'UND';
  if (codNorm === 'ESTUCO SOBRE MURO EXTERIOR') unidadFinal = 'M2';
  if (/PRESERV.*POR INMERSION/.test(codNorm)) unidadFinal = 'ML';

  const hmFinal = exp.hmPct > 0 ? exp.hmPct : (exp.moCosto2026 > 0 ? clasif.hm_pct : 0);
  const lineas = consolidarLineasUnitario(exp.items, exp.moCosto2026, clasif.cuadrilla, exp.despPct, hmFinal);
  if (lineas.length === 0) continue;

  const canonKey = claveCanonicaApu(mod.nombre, unidadFinal);
  if (unitariosByCanon.has(canonKey)) {
    const ex = unitariosByCanon.get(canonKey);
    ex.codigos_anteriores.push(`APEU:${u.codigo_origen}`);
    regTrazabilidad({
      entidad: 'UNITARIO',
      fuente: 'APEU',
      codigoOrigen: u.codigo_origen,
      nombreOrigen: u.descripcion,
      codigoNuevo: ex.KeyTemp,
      nombreNuevo: ex.nombre,
      accion: 'FUSIONADO_DUPLICADO',
      detalle: `Cubierto por ${ex.fuente_principal}`,
    });
    continue;
  }

  const uObj = {
    KeyTemp: canonKey,
    codigo: null,
    codigo_capitulo: clasif.codigoCapitulo,
    capitulo: clasif.capitulo,
    disciplina: clasif.disciplina,
    nombre: mod.nombre,
    descripcion_tecnica: mod.descripcionTecnica,
    unidad: unidadFinal,
    cuadrilla: clasif.cuadrilla,
    lineas,
    fuente_principal: 'APEU',
    codigos_anteriores: [`APEU:${u.codigo_origen}`],
  };

  unitariosByCanon.set(canonKey, uObj);
  regTrazabilidad({
    entidad: 'UNITARIO',
    fuente: 'APEU',
    codigoOrigen: u.codigo_origen,
    nombreOrigen: u.descripcion,
    codigoNuevo: canonKey,
    nombreNuevo: mod.nombre,
    accion: 'MODERNIZADO_APEU_2026',
    detalle: `Categorizado en ${clasif.capitulo} con ${clasif.cuadrilla}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CODIFICACIÓN FINAL, UNICIDAD ESTRICTA Y CÁLCULO DE CACHÉ DE FÓRMULAS
// ═══════════════════════════════════════════════════════════════════════════

// 5.1 Deduplicar lista única de objetos de insumos y asignar códigos MAT-xxxx / EQU-xxxx / TRN-xxxx
const uniqueInsumos = [...new Set(insumosByKey.values())];
// Asegurar unicidad estricta de (norm(nombre), unidad) en insumos finales
const finalInsumosMap = new Map();
for (const ins of uniqueInsumos) {
  const uk = `${norm(ins.nombre)}|${ins.unidad}`;
  if (!finalInsumosMap.has(uk)) {
    finalInsumosMap.set(uk, ins);
  } else {
    const keep = finalInsumosMap.get(uk);
    if (ins.en_uso) keep.en_uso = true;
    // Redirigir referencias en básicos y unitarios hacia `keep`
    for (const b of basicosList) {
      for (const l of b.lineas) if (l.insumoObj === ins) l.insumoObj = keep;
    }
    for (const u of unitariosByCanon.values()) {
      for (const l of u.lineas) if (l.insumoObj === ins) l.insumoObj = keep;
    }
  }
}

const insumosFinales = [...finalInsumosMap.values()].sort((a, b) =>
  a.tipo.localeCompare(b.tipo) ||
  a.categoria.localeCompare(b.categoria, 'es') ||
  a.nombre.localeCompare(b.nombre, 'es')
);

const seqTipo = { MATERIAL: 0, EQUIPO: 0, TRANSPORTE: 0 };
for (const ins of insumosFinales) {
  seqTipo[ins.tipo] = (seqTipo[ins.tipo] || 0) + 1;
  const pref = ins.tipo === 'EQUIPO' ? 'EQU' : ins.tipo === 'TRANSPORTE' ? 'TRN' : 'MAT';
  ins.codigo = `${pref}-${String(seqTipo[ins.tipo]).padStart(4, '0')}`;
  ins.precio_activo = precioActivoInsumo(ins);
  ins.precio_kalarti = Math.round(ins.precio_activo * (1 + MARGEN_KALARTI));
}

// Actualizar códigos definitivos de insumos en trazabilidad
const mapKeyToCodigoIns = new Map(insumosFinales.map((i) => [i.KeyTemp, i.codigo]));
for (const t of trazabilidad) {
  if (t.entidad === 'INSUMO' && mapKeyToCodigoIns.has(t.codigo_nuevo)) {
    t.codigo_nuevo = mapKeyToCodigoIns.get(t.codigo_nuevo);
  }
}

// Re-consolidar líneas repetidas por fusión final de insumos y recalcular Básicos
for (const b of basicosList) {
  let eq = 0, mat = 0, mo = 0, tr = 0;
  for (const l of b.lineas) {
    if (l.tipo_recurso === 'MANO_OBRA') {
      const p = cuadrillasMap.get(l.cuadrillaRef).valor_hora;
      mo += l.cantidad * p;
    } else {
      const p = l.insumoObj.precio_activo;
      const sub = l.cantidad * p;
      if (l.tipo_recurso === 'EQUIPO') eq += sub;
      else if (l.tipo_recurso === 'TRANSPORTE') tr += sub;
      else mat += sub;
    }
  }
  b.c_equipo = eq;
  b.c_material = mat;
  b.c_mo = mo;
  b.c_transporte = tr;
  b.c_total = eq + mat + mo + tr;
}

  // Asegurar unicidad literal exacta de (norm(nombre), unidad) en caso de que dos claves distintas tuvieran mismo texto corto
  const vistosLiteral = new Set();
  for (const u of unitariosByCanon.values()) {
    let kLit = `${norm(u.nombre)}|${u.unidad}`;
    if (vistosLiteral.has(kLit)) {
      u.nombre = `${u.nombre} (${u.fuente_principal.toLowerCase()})`;
      kLit = `${norm(u.nombre)}|${u.unidad}`;
    }
    vistosLiteral.add(kLit);
  }

  // 5.2 Ordenar Unitarios por capítulo (01..24) y nombre, asignar código CC.NNN y calcular costos exactos
const unitariosFinales = [...unitariosByCanon.values()].sort((a, b) =>
  Number(a.codigo_capitulo) - Number(b.codigo_capitulo) ||
  a.nombre.localeCompare(b.nombre, 'es')
);

const seqCap = new Map();
for (const u of unitariosFinales) {
  const n = (seqCap.get(u.codigo_capitulo) || 0) + 1;
  seqCap.set(u.codigo_capitulo, n);
  u.codigo = `${u.codigo_capitulo}.${String(n).padStart(3, '0')}`;

  // Fusionar si dos líneas apuntaban al mismo insumo tras normalización final
  const merged = [];
  for (const l of u.lineas) {
    const recCode = l.tipo_recurso === 'MANO_OBRA'
      ? l.cuadrillaCodigo
      : l.tipo_recurso === 'BASICO'
        ? l.basicoObj.codigo
        : l.insumoObj.codigo;
    l.codigo_recurso = recCode;
    const prev = merged.find((m) => m.tipo_recurso === l.tipo_recurso && m.codigo_recurso === recCode);
    if (prev) {
      prev.cantidad = Math.round((prev.cantidad + l.cantidad) * 100000) / 100000;
    } else {
      merged.push(l);
    }
  }
  u.lineas = merged;

  let eq = 0, mat = 0, mo = 0, tr = 0, horasMo = 0;
  for (const l of u.lineas) {
    const fDesp = 1 + (l.desperdicio_pct || 0) / 100;
    if (l.tipo_recurso === 'MANO_OBRA') {
      const vh = cuadrillasMap.get(l.cuadrillaCodigo).valor_hora;
      const subMo = l.cantidad * vh;
      const subHm = subMo * ((l.herramienta_menor_pct || 0) / 100);
      l.nombre_recurso = cuadrillasMap.get(l.cuadrillaCodigo).nombre;
      l.unidad_recurso = 'HORA';
      l.precio_recurso = vh;
      l.sub_mat = 0;
      l.sub_mo = subMo;
      l.sub_eq = subHm;
      l.sub_tr = 0;
      horasMo += l.cantidad;
    } else if (l.tipo_recurso === 'BASICO') {
      const b = l.basicoObj;
      const q = l.cantidad * fDesp;
      l.nombre_recurso = b.nombre;
      l.unidad_recurso = b.unidad;
      l.precio_recurso = b.c_total;
      l.sub_mat = q * b.c_material;
      l.sub_mo = q * b.c_mo;
      l.sub_eq = q * b.c_equipo;
      l.sub_tr = q * b.c_transporte;
    } else {
      const ins = l.insumoObj;
      const q = l.cantidad * fDesp;
      const p = ins.precio_activo;
      const sub = q * p;
      l.nombre_recurso = ins.nombre;
      l.unidad_recurso = ins.unidad;
      l.precio_recurso = p;
      l.sub_mat = l.tipo_recurso === 'MATERIAL' ? sub : 0;
      l.sub_mo = 0;
      l.sub_eq = l.tipo_recurso === 'EQUIPO' ? sub : 0;
      l.sub_tr = l.tipo_recurso === 'TRANSPORTE' ? sub : 0;
    }
    l.sub_total = l.sub_mat + l.sub_mo + l.sub_eq + l.sub_tr;
    mat += l.sub_mat;
    mo += l.sub_mo;
    eq += l.sub_eq;
    tr += l.sub_tr;
  }
  u.c_equipo = eq;
  u.c_material = mat;
  u.c_mo = mo;
  u.c_transporte = tr;
  u.c_total = eq + mat + mo + tr;
  u.rendimiento_dia = horasMo > 0 ? Math.round((HORAS_DIA / horasMo) * 10000) / 10000 : 1;
}

const mapKeyToCodigoUni = new Map(unitariosFinales.map((u) => [u.KeyTemp, u.codigo]));
for (const t of trazabilidad) {
  if (t.entidad === 'UNITARIO' && mapKeyToCodigoUni.has(t.codigo_nuevo)) {
    t.codigo_nuevo = mapKeyToCodigoUni.get(t.codigo_nuevo);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. GENERACIÓN DEL LIBRO EXCEL MAESTRO CON FÓRMULAS VIVAS (11 PESTAÑAS)
// ═══════════════════════════════════════════════════════════════════════════

const wb = new ExcelJS.Workbook();
wb.creator = 'Kalarti ERP Construcción';
wb.created = new Date();
wb.modified = new Date();
wb.calcProperties.fullCalcOnLoad = true;

const FMT_COP = '$#,##0';
const FMT_COP_DEC = '$#,##0.00';
const FMT_QTY = '#,##0.0000';
const FMT_PCT = '0.00';

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

function configurarTablaHoja(ws, cols, tabColorArgb) {
  ws.properties.tabColor = { argb: tabColorArgb };
  ws.columns = cols.map(([header, key, width]) => ({ header, key, width }));
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = BORDER_THIN;
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
}

// Rango dinámico seguro para referencias entre hojas (+50 filas de holgura para expansión en Excel)
const R_CAP = CAPITULOS_BD.length + 10;
const R_CARGOS = CARGOS_MO_BD.length + 30;
const R_CUA = CUADRILLAS_MO_BD.length + 10;
const R_CDET = cuadrillaDetalleRows.length + 40;
const R_INS = insumosFinales.length + 100;
const R_BAS = basicosList.length + 20;
const totalBasDetRows = basicosList.reduce((acc, b) => acc + b.lineas.length, 0);
const R_BDET = totalBasDetRows + 60;
const R_UNI = unitariosFinales.length + 100;
const totalUniDetRows = unitariosFinales.reduce((acc, u) => acc + u.lineas.length, 0);
const R_UDET = totalUniDetRows + 200;

// Crear las 11 pestañas en el orden exacto de numeración
const wsParam = wb.addWorksheet('00_PARAMETROS_Y_RESUMEN');
const wsCap = wb.addWorksheet('01_DISCIPLINAS_CAPITULOS');
const wsCargos = wb.addWorksheet('02_CARGOS_MO');
const wsCua = wb.addWorksheet('03_CUADRILLAS');
const wsCDet = wb.addWorksheet('04_CUADRILLA_DETALLE');
const wsIns = wb.addWorksheet('05_INSUMOS_MAESTRO');
const wsBas = wb.addWorksheet('06_BASICOS_MAESTRO');
const wsBDet = wb.addWorksheet('07_BASICOS_DETALLE');
const wsUni = wb.addWorksheet('08_UNITARIOS_MAESTRO');
const wsUDet = wb.addWorksheet('09_UNITARIOS_DETALLE');
const wsTraz = wb.addWorksheet('10_TRAZABILIDAD_Y_HOMOLOGACION');

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 00: PARÁMETROS GLOBALES Y TABLERO RESUMEN
// ───────────────────────────────────────────────────────────────────────────
wsParam.properties.tabColor = { argb: 'FFD97706' };
wsParam.columns = [
  { width: 4 },
  { width: 44 },
  { width: 20 },
  { width: 16 },
  { width: 52 },
];

wsParam.mergeCells('B2:E2');
wsParam.getCell('B2').value = 'BASE DE DATOS MAESTRA ERP CONSTRUCCIÓN — KALARTI 2026';
wsParam.getCell('B2').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };

wsParam.mergeCells('B3:E3');
wsParam.getCell('B3').value = ' Libro relacional auto-calculado: modifique las celdas amarillas de parámetros y todo el catálogo recalculará en tiempo real.';
wsParam.getCell('B3').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };

const paramHdr = wsParam.getRow(4);
['', 'PARÁMETRO GLOBAL DE CÁLCULO', 'VALOR ACTIVO', 'NOMBRE RANGO', 'DESCRIPCIÓN Y CRITERIO TÉCNICO'].forEach((t, idx) => {
  if (idx === 0) return;
  const c = paramHdr.getCell(idx + 1);
  c.value = t;
  c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
});
paramHdr.height = 22;

const parametrosDef = [
  ['Salario Mínimo Legal Mensual Vigente 2026 (COP)', SMLV, 'SMLV_2026', FMT_COP, 'Base salarial Colombia 2026 (Referente Hospital Civil Ipiales / Casa Ricaurte)'],
  ['Auxilio Legal de Transporte 2026 (COP)', AUX_TRANSP, 'AUX_TRANSP_2026', FMT_COP, 'Auxilio mensual vigente incluido en el factor prestacional'],
  ['Horas Laborales Mes Estándar', HORAS_MES, 'HORAS_MES', '#,##0', '30 días calendario × 8 horas/día (estándar motor apu-engine.js)'],
  ['Horas por Jornada Diaria', HORAS_DIA, 'HORAS_DIA', '#,##0', 'Horas efectivas por jornal diario de cuadrilla'],
  ['Factor Prestacional Nivel 1 (1.0 SMLV — Ayudantes/Auxiliares)', FP.NIVEL_1, 'FP_NIVEL_1', '0.00', 'Prestaciones sociales, seguridad social, dotación y parafiscales nivel 1'],
  ['Factor Prestacional Nivel 1.5 (1.5 SMLV — Oficiales/Técnicos)', FP.NIVEL_1_5, 'FP_NIVEL_1_5', '0.00', 'Prestaciones sociales y aportes parafiscales para oficiales calificados'],
  ['Factor Prestacional Nivel 2 (2.0+ SMLV — Maestros/Especialistas)', FP.NIVEL_2, 'FP_NIVEL_2', '0.00', 'Prestaciones sociales para maestros de obra, topógrafos y soldadores'],
  ['Factor Prestacional Personal Profesional / Residente', FP.PROFESIONAL, 'FP_PROFESIONAL', '0.00', 'Factor prestacional para dirección de obra, residentes e ingeniería'],
  ['Factor Indexación Histórica APEU -> 2026', FACTOR_INDEX_APEU, 'FACTOR_INDEX_APEU', '0.0000', 'Relación SMLV 2026 / SMLV base APEU (1,750,905 / 1,150,000) para insumos exclusivos APEU'],
  ['Margen Comercial Almacén Kalarti (Marketplace)', MARGEN_KALARTI, 'MARGEN_KALARTI', '0.0%', 'Margen opcional de referencia para columna Precio Almacén Kalarti (+15%)'],
];

parametrosDef.forEach(([label, val, rangeName, fmt, desc], idx) => {
  const rNum = 5 + idx;
  const row = wsParam.getRow(rNum);
  row.getCell(2).value = label;
  row.getCell(3).value = val;
  row.getCell(3).numFmt = fmt;
  row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
  row.getCell(3).font = { bold: true, color: { argb: 'FF1E293B' } };
  row.getCell(4).value = rangeName;
  row.getCell(4).font = { name: 'Consolas', size: 9, color: { argb: 'FF0F766E' } };
  row.getCell(5).value = desc;
  [2, 3, 4, 5].forEach((cIdx) => { row.getCell(cIdx).border = BORDER_THIN; });
  wb.definedNames.add(`'00_PARAMETROS_Y_RESUMEN'!$C$${rNum}`, rangeName);
});

// Bloque KPI de Auditoría en 00_PARAMETROS_Y_RESUMEN
wsParam.getRow(16).getCell(2).value = 'INDICADORES VIVOS DE INTEGRIDAD DE LA BASE DE DATOS';
wsParam.getRow(16).getCell(2).font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

const kpis = [
  ['Capítulos / Disciplinas Estándar', { formula: `COUNTA('01_DISCIPLINAS_CAPITULOS'!$A$2:$A$${R_CAP})`, result: CAPITULOS_BD.length }, '28 capítulos codificados (00 a 27)'],
  ['Perfiles y Cargos de Mano de Obra por Disciplina', { formula: `COUNTA('02_CARGOS_MO'!$A$2:$A$${R_CARGOS})`, result: CARGOS_MO_BD.length }, '20 disciplinas operativas + 1 administrativa'],
  ['Cuadrillas Específicas por Disciplina', { formula: `COUNTA('03_CUADRILLAS'!$A$2:$A$${R_CUA})`, result: CUADRILLAS_MO_BD.length }, '20 cuadrillas operativas independizadas (CUA-TOP a CUA-GM)'],
  ['Insumos Maestros Unificados (Materiales, Equipos, Transporte)', { formula: `COUNTA('05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS})`, result: insumosFinales.length }, 'Cero duplicados, nombres expandidos y precios 2026'],
  ['  • Con Precio Directo Cotizado 2026', { formula: `COUNTIF('05_INSUMOS_MAESTRO'!$G$2:$G$${R_INS},"COTIZADO_2026")`, result: insumosFinales.filter((i) => i.origen_precio === 'COTIZADO_2026').length }, 'Hospital Civil Ipiales + Casa Ricaurte + Detección RCI'],
  ['  • Exclusivos APEU Indexados a 2026', { formula: `COUNTIF('05_INSUMOS_MAESTRO'!$G$2:$G$${R_INS},"APEU_INDEXADO_2026")`, result: insumosFinales.filter((i) => i.origen_precio === 'APEU_INDEXADO_2026').length }, 'Mármoles, guadua, gres y vías exclusivos de APEU'],
  ['Análisis Básicos Maestros (Morteros, Concretos, Formaleta)', { formula: `COUNTA('06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS})`, result: basicosList.length }, 'Nivel 1 sin referencias circulares'],
  ['Análisis de Precios Unitarios (APUs Compuestos)', { formula: `COUNTA('08_UNITARIOS_MAESTRO'!$A$2:$A$${R_UNI})`, result: unitariosFinales.length }, 'Catálogo unificado y clasificado por disciplina'],
  ['Líneas de Composición en Detalle de Unitarios', { formula: `COUNTA('09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET})`, result: totalUniDetRows }, '100% vinculadas mediante INDEX/MATCH'],
  ['Control de Costos Nulos o Inválidos (Debe ser 0)', { formula: `COUNTIF('08_UNITARIOS_MAESTRO'!$N$2:$N$${unitariosFinales.length + 1},"<=0")`, result: 0 }, 'Validación en vivo de costo directo > $0'],
];

kpis.forEach(([label, formulaVal, nota], idx) => {
  const row = wsParam.getRow(17 + idx);
  row.getCell(2).value = label;
  row.getCell(3).value = formulaVal;
  row.getCell(3).numFmt = '#,##0';
  row.getCell(3).font = { bold: true, color: { argb: 'FF065F46' } };
  row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  row.getCell(4).value = 'ACTIVO';
  row.getCell(4).alignment = { horizontal: 'center' };
  row.getCell(5).value = nota;
  [2, 3, 4, 5].forEach((cIdx) => { row.getCell(cIdx).border = BORDER_THIN; });
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 01: DISCIPLINAS Y CAPÍTULOS
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsCap, [
  ['Cód. Cap.', 'codigo', 11],
  ['Capítulo Estándar ERP', 'nombre', 34],
  ['Cód. Disc.', 'disciplina', 11],
  ['Disciplina Técnica', 'nombre_disc', 38],
  ['Cuadrilla Titular', 'cuadrilla', 16],
  ['Nombre Cuadrilla Titular', 'nombre_cua', 40],
  ['Valor Hora Cuadrilla', 'vh_cua', 20],
  ['% Herr. Menor', 'hm_pct', 14],
  ['Total APUs', 'total_apus', 13],
  ['Alcance Técnico del Capítulo', 'alcance', 68],
], 'FF475569');

CAPITULOS_BD.forEach((cap, idx) => {
  const r = idx + 2;
  const q = cuadrillasMap.get(cap.cuadrilla);
  const countApus = cap.codigo === '00'
    ? basicosList.length
    : unitariosFinales.filter((u) => u.codigo_capitulo === cap.codigo).length;

  const row = wsCap.addRow({
    codigo: cap.codigo,
    nombre: cap.nombre,
    disciplina: cap.disciplina,
    nombre_disc: DISCIPLINAS_MO[cap.disciplina],
    cuadrilla: cap.cuadrilla,
    nombre_cua: {
      formula: `IFERROR(INDEX('03_CUADRILLAS'!$B$2:$B$${R_CUA},MATCH(E${r},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),"")`,
      result: q.nombre,
    },
    vh_cua: {
      formula: `IFERROR(INDEX('03_CUADRILLAS'!$E$2:$E$${R_CUA},MATCH(E${r},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),0)`,
      result: Math.round(q.valor_hora * 100) / 100,
    },
    hm_pct: cap.hm_pct,
    total_apus: {
      formula: cap.codigo === '00'
        ? `COUNTA('06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS})`
        : `COUNTIF('08_UNITARIOS_MAESTRO'!$B$2:$B$${R_UNI},A${r})`,
      result: countApus,
    },
    alcance: cap.alcance,
  });
  row.getCell('vh_cua').numFmt = FMT_COP;
  row.getCell('total_apus').numFmt = '#,##0';
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 02: CARGOS DE MANO DE OBRA POR DISCIPLINA
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsCargos, [
  ['Código Cargo', 'codigo', 14],
  ['Nombre del Cargo / Perfil Especializado', 'nombre', 48],
  ['Cód. Disc.', 'disciplina', 11],
  ['Disciplina Técnica', 'disciplina_nombre', 38],
  ['Tipo de Personal', 'tipo', 22],
  ['Nivel Prestacional', 'nivel', 18],
  ['N.° SMLV', 'smlv', 11],
  ['Salario Base Mensual', 'sal_base', 20],
  ['Factor Prest.', 'fp', 13],
  ['Costo Mensual Integral', 'mensual', 22],
  ['Jornal Diario (8h)', 'jornal', 18],
  ['Valor Hora Hombre', 'vh', 18],
], 'FF2563EB');

CARGOS_MO_BD.forEach((cgRaw, idx) => {
  const r = idx + 2;
  const cg = cargosMap.get(cgRaw.codigo);
  const row = wsCargos.addRow({
    codigo: cg.codigo,
    nombre: cg.nombre,
    disciplina: cg.disciplina,
    disciplina_nombre: cg.disciplina_nombre,
    tipo: cg.tipo,
    nivel: cg.nivel,
    smlv: cg.smlv,
    sal_base: {
      formula: `'00_PARAMETROS_Y_RESUMEN'!$C$5*G${r}`,
      result: Math.round(cg.salario_base * 100) / 100,
    },
    fp: {
      formula: `IF(F${r}="NIVEL_1",'00_PARAMETROS_Y_RESUMEN'!$C$9,IF(F${r}="NIVEL_1_5",'00_PARAMETROS_Y_RESUMEN'!$C$10,IF(F${r}="NIVEL_2",'00_PARAMETROS_Y_RESUMEN'!$C$11,'00_PARAMETROS_Y_RESUMEN'!$C$12)))`,
      result: cg.factor_prestacional,
    },
    mensual: {
      formula: `H${r}*I${r}`,
      result: Math.round(cg.mensual_integral * 100) / 100,
    },
    jornal: {
      formula: `(J${r}/'00_PARAMETROS_Y_RESUMEN'!$C$7)*'00_PARAMETROS_Y_RESUMEN'!$C$8`,
      result: Math.round(cg.jornal_diario * 100) / 100,
    },
    vh: {
      formula: `J${r}/'00_PARAMETROS_Y_RESUMEN'!$C$7`,
      result: Math.round(cg.valor_hora * 10000) / 10000,
    },
  });
  row.getCell('smlv').numFmt = '0.00';
  row.getCell('fp').numFmt = '0.00';
  ['sal_base', 'mensual', 'jornal', 'vh'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 03: CUADRILLAS POR DISCIPLINA
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsCua, [
  ['Cód. Cuadrilla', 'codigo', 15],
  ['Nombre de la Cuadrilla Especializada', 'nombre', 44],
  ['Cód. Disc.', 'disciplina', 11],
  ['Disciplina Técnica', 'disciplina_nombre', 38],
  ['Valor Hora Cuadrilla', 'vh', 20],
  ['Valor Jornal (8h)', 'jornal', 20],
  ['Total Integrantes', 'integrantes', 17],
  ['Composición Estándar de la Cuadrilla', 'descripcion', 56],
], 'FF2563EB');

CUADRILLAS_MO_BD.forEach((qRaw, idx) => {
  const r = idx + 2;
  const q = cuadrillasMap.get(qRaw.codigo);
  const row = wsCua.addRow({
    codigo: q.codigo,
    nombre: q.nombre,
    disciplina: q.disciplina,
    disciplina_nombre: q.disciplina_nombre,
    vh: {
      formula: `SUMIFS('04_CUADRILLA_DETALLE'!$H$2:$H$${R_CDET},'04_CUADRILLA_DETALLE'!$A$2:$A$${R_CDET},A${r})`,
      result: Math.round(q.valor_hora * 10000) / 10000,
    },
    jornal: {
      formula: `E${r}*'00_PARAMETROS_Y_RESUMEN'!$C$8`,
      result: Math.round(q.valor_jornal * 100) / 100,
    },
    integrantes: {
      formula: `SUMIFS('04_CUADRILLA_DETALLE'!$F$2:$F$${R_CDET},'04_CUADRILLA_DETALLE'!$A$2:$A$${R_CDET},A${r})`,
      result: q.total_integrantes,
    },
    descripcion: q.descripcion,
  });
  ['vh', 'jornal'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
  row.getCell('integrantes').numFmt = '0.00';
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 04: DETALLE DE INTEGRANTES DE CUADRILLA
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsCDet, [
  ['Cód. Cuadrilla', 'codigo_cuadrilla', 15],
  ['Nombre Cuadrilla', 'nombre_cuadrilla', 40],
  ['Cód. Cargo', 'codigo_cargo', 14],
  ['Nombre del Cargo Integrante', 'nombre_cargo', 46],
  ['Disciplina', 'disciplina', 12],
  ['Cantidad / Proporción', 'cantidad', 18],
  ['Valor Hora Cargo', 'vh_cargo', 18],
  ['Aporte Hora Cuadrilla', 'aporte', 20],
], 'FF3B82F6');

cuadrillaDetalleRows.forEach((cd, idx) => {
  const r = idx + 2;
  const row = wsCDet.addRow({
    codigo_cuadrilla: cd.codigo_cuadrilla,
    nombre_cuadrilla: cd.nombre_cuadrilla,
    codigo_cargo: cd.codigo_cargo,
    nombre_cargo: {
      formula: `INDEX('02_CARGOS_MO'!$B$2:$B$${R_CARGOS},MATCH(C${r},'02_CARGOS_MO'!$A$2:$A$${R_CARGOS},0))`,
      result: cd.nombre_cargo,
    },
    disciplina: {
      formula: `INDEX('02_CARGOS_MO'!$C$2:$C$${R_CARGOS},MATCH(C${r},'02_CARGOS_MO'!$A$2:$A$${R_CARGOS},0))`,
      result: cd.disciplina,
    },
    cantidad: cd.cantidad,
    vh_cargo: {
      formula: `INDEX('02_CARGOS_MO'!$L$2:$L$${R_CARGOS},MATCH(C${r},'02_CARGOS_MO'!$A$2:$A$${R_CARGOS},0))`,
      result: Math.round(cd.valor_hora_cargo * 10000) / 10000,
    },
    aporte: {
      formula: `F${r}*G${r}`,
      result: Math.round(cd.aporte_hora * 10000) / 10000,
    },
  });
  row.getCell('cantidad').numFmt = '0.00';
  ['vh_cargo', 'aporte'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 05: INSUMOS MAESTRO (MATERIALES, EQUIPOS, TRANSPORTE)
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsIns, [
  ['Código Insumo', 'codigo', 14],
  ['Nombre Estandarizado del Insumo', 'nombre', 56],
  ['Tipo', 'tipo', 13],
  ['Categoría de Almacén', 'categoria', 28],
  ['Disciplina', 'disciplina', 11],
  ['Unidad', 'unidad', 9],
  ['Política de Precio', 'origen_precio', 20],
  ['Precio Base Origen', 'precio_base', 18],
  ['Precio Unitario 2026 (Activo)', 'precio_activo', 22],
  ['Precio Almacén Kalarti (+15%)', 'precio_kalarti', 24],
  ['N.° Cotiz.', 'ncot', 11],
  ['Proveedores / Referencias Cotizadas', 'proveedores', 38],
  ['Fuente Principal', 'fuente', 15],
  ['Estado Uso', 'uso', 12],
  ['Nombres Originales Homologados', 'homologados', 52],
], 'FF0D9488');

insumosFinales.forEach((ins, idx) => {
  const r = idx + 2;
  const provStr = ins.cotizaciones.map((c) => `${c.proveedor}: $${Math.round(c.valor).toLocaleString('es-CO')}`).join(' | ');
  const row = wsIns.addRow({
    codigo: ins.codigo,
    nombre: ins.nombre,
    tipo: ins.tipo,
    categoria: ins.categoria,
    disciplina: ins.disciplina,
    unidad: ins.unidad,
    origen_precio: ins.origen_precio,
    precio_base: ins.precio_base,
    precio_activo: {
      formula: `IF(G${r}="APEU_INDEXADO_2026",ROUND(H${r}*'00_PARAMETROS_Y_RESUMEN'!$C$13,2),H${r})`,
      result: ins.precio_activo,
    },
    precio_kalarti: {
      formula: `ROUND(I${r}*(1+'00_PARAMETROS_Y_RESUMEN'!$C$14),0)`,
      result: ins.precio_kalarti,
    },
    ncot: ins.cotizaciones.length,
    proveedores: provStr || (ins.origen_precio === 'APEU_INDEXADO_2026' ? 'Base histórica APEU actualizada por SMLV 2026' : `Referente directo ${ins.fuente_principal}`),
    fuente: ins.fuente_principal,
    uso: ins.en_uso ? 'EN USO APU' : 'CATÁLOGO',
    homologados: ins.nombres_origen.join(' || ').slice(0, 300),
  });
  ['precio_base', 'precio_activo', 'precio_kalarti'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
  if (ins.origen_precio === 'APEU_INDEXADO_2026') {
    row.getCell('origen_precio').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  } else {
    row.getCell('origen_precio').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 06 Y 07: BÁSICOS MAESTRO Y BÁSICOS DETALLE
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsBas, [
  ['Cód. Básico', 'codigo', 13],
  ['Nombre del Análisis Básico', 'nombre', 50],
  ['Descripción Técnica', 'descripcion', 58],
  ['Disciplina', 'disciplina', 11],
  ['Unidad', 'unidad', 9],
  ['Cuadrilla', 'cuadrilla', 13],
  ['Costo Equipo', 'eq', 16],
  ['Costo Material', 'mat', 16],
  ['Costo Mano Obra', 'mo', 17],
  ['Costo Transporte', 'tr', 17],
  ['Costo Directo Total', 'total', 20],
  ['Fuente Base', 'fuente', 14],
  ['Códigos / Nombres Homologados', 'aliases', 48],
], 'FF4F46E5');

configurarTablaHoja(wsBDet, [
  ['Cód. Básico', 'codigo_basico', 13],
  ['Nombre del Básico', 'nombre_basico', 44],
  ['Ítem', 'item_linea', 7],
  ['Tipo Recurso', 'tipo_recurso', 14],
  ['Cód. Recurso', 'codigo_recurso', 14],
  ['Nombre del Recurso (Fórmula Viva)', 'nombre_recurso', 50],
  ['Und', 'unidad', 8],
  ['Cantidad', 'cantidad', 14],
  ['Precio Unitario', 'precio', 18],
  ['Subtotal Material', 'sub_mat', 18],
  ['Subtotal Mano Obra', 'sub_mo', 18],
  ['Subtotal Equipo', 'sub_eq', 16],
  ['Subtotal Transporte', 'sub_tr', 18],
  ['Subtotal Línea', 'sub_total', 18],
], 'FF6366F1');

let bDetRowNum = 1;
basicosList.forEach((b, idx) => {
  const r = idx + 2;
  const row = wsBas.addRow({
    codigo: b.codigo,
    nombre: b.nombre,
    descripcion: b.descripcion_tecnica,
    disciplina: b.disciplina,
    unidad: b.unidad,
    cuadrilla: b.cuadrilla,
    eq: {
      formula: `SUMIFS('07_BASICOS_DETALLE'!$L$2:$L$${R_BDET},'07_BASICOS_DETALLE'!$A$2:$A$${R_BDET},A${r})`,
      result: Math.round(b.c_equipo * 100) / 100,
    },
    mat: {
      formula: `SUMIFS('07_BASICOS_DETALLE'!$J$2:$J$${R_BDET},'07_BASICOS_DETALLE'!$A$2:$A$${R_BDET},A${r})`,
      result: Math.round(b.c_material * 100) / 100,
    },
    mo: {
      formula: `SUMIFS('07_BASICOS_DETALLE'!$K$2:$K$${R_BDET},'07_BASICOS_DETALLE'!$A$2:$A$${R_BDET},A${r})`,
      result: Math.round(b.c_mo * 100) / 100,
    },
    tr: {
      formula: `SUMIFS('07_BASICOS_DETALLE'!$M$2:$M$${R_BDET},'07_BASICOS_DETALLE'!$A$2:$A$${R_BDET},A${r})`,
      result: Math.round(b.c_transporte * 100) / 100,
    },
    total: {
      formula: `SUM(G${r}:J${r})`,
      result: Math.round(b.c_total * 100) / 100,
    },
    fuente: b.fuente,
    aliases: b.aliases.join(' | ').slice(0, 250),
  });
  ['eq', 'mat', 'mo', 'tr', 'total'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
  row.getCell('total').font = { bold: true };

  b.lineas.forEach((l, lIdx) => {
    bDetRowNum += 1;
    const dr = bDetRowNum;
    const isMo = l.tipo_recurso === 'MANO_OBRA';
    const codRec = isMo ? l.cuadrillaRef : l.insumoObj.codigo;
    const nomRec = isMo ? cuadrillasMap.get(l.cuadrillaRef).nombre : l.insumoObj.nombre;
    const undRec = isMo ? 'HORA' : l.insumoObj.unidad;
    const pRec = isMo ? cuadrillasMap.get(l.cuadrillaRef).valor_hora : l.insumoObj.precio_activo;
    const sub = l.cantidad * pRec;

    const dRow = wsBDet.addRow({
      codigo_basico: b.codigo,
      nombre_basico: b.nombre,
      item_linea: lIdx + 1,
      tipo_recurso: l.tipo_recurso,
      codigo_recurso: codRec,
      nombre_recurso: {
        formula: `IF(D${dr}="MANO_OBRA",INDEX('03_CUADRILLAS'!$B$2:$B$${R_CUA},MATCH(E${dr},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),INDEX('05_INSUMOS_MAESTRO'!$B$2:$B$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0)))`,
        result: nomRec,
      },
      unidad: {
        formula: `IF(D${dr}="MANO_OBRA","HORA",INDEX('05_INSUMOS_MAESTRO'!$F$2:$F$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0)))`,
        result: undRec,
      },
      cantidad: Math.round(l.cantidad * 100000) / 100000,
      precio: {
        formula: `IF(D${dr}="MANO_OBRA",INDEX('03_CUADRILLAS'!$E$2:$E$${R_CUA},MATCH(E${dr},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),INDEX('05_INSUMOS_MAESTRO'!$I$2:$I$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0)))`,
        result: Math.round(pRec * 100) / 100,
      },
      sub_mat: { formula: `IF(D${dr}="MATERIAL",H${dr}*I${dr},0)`, result: l.tipo_recurso === 'MATERIAL' ? sub : 0 },
      sub_mo: { formula: `IF(D${dr}="MANO_OBRA",H${dr}*I${dr},0)`, result: l.tipo_recurso === 'MANO_OBRA' ? sub : 0 },
      sub_eq: { formula: `IF(D${dr}="EQUIPO",H${dr}*I${dr},0)`, result: l.tipo_recurso === 'EQUIPO' ? sub : 0 },
      sub_tr: { formula: `IF(D${dr}="TRANSPORTE",H${dr}*I${dr},0)`, result: l.tipo_recurso === 'TRANSPORTE' ? sub : 0 },
      sub_total: { formula: `SUM(J${dr}:M${dr})`, result: sub },
    });
    dRow.getCell('cantidad').numFmt = FMT_QTY;
    ['precio', 'sub_mat', 'sub_mo', 'sub_eq', 'sub_tr', 'sub_total'].forEach((k) => { dRow.getCell(k).numFmt = FMT_COP; });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 08 Y 09: UNITARIOS MAESTRO Y UNITARIOS DETALLE
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsUni, [
  ['Código APU', 'codigo', 12],
  ['Cód. Cap.', 'codigo_cap', 10],
  ['Capítulo', 'capitulo', 30],
  ['Disciplina', 'disciplina', 11],
  ['Nombre Estandarizado del Unitario', 'nombre', 56],
  ['Descripción y Alcance Técnico Completo', 'descripcion', 68],
  ['Und', 'unidad', 8],
  ['Cuadrilla Disciplina', 'cuadrilla', 18],
  ['Rend. (Und/Día)', 'rendimiento', 15],
  ['Costo Equipo', 'eq', 16],
  ['Costo Material', 'mat', 17],
  ['Costo Mano Obra', 'mo', 17],
  ['Costo Transporte', 'tr', 17],
  ['Costo Directo Total', 'total', 20],
  ['Fuente Base', 'fuente', 14],
  ['Códigos Anteriores / Trazabilidad', 'anteriores', 36],
], 'FF059669');

configurarTablaHoja(wsUDet, [
  ['Código APU', 'codigo_apu', 12],
  ['Nombre del Unitario', 'nombre_apu', 44],
  ['Ítem', 'item_linea', 7],
  ['Tipo Recurso', 'tipo_recurso', 14],
  ['Cód. Recurso', 'codigo_recurso', 14],
  ['Nombre del Recurso (Fórmula Viva)', 'nombre_recurso', 50],
  ['Und', 'unidad', 8],
  ['Cantidad', 'cantidad', 14],
  ['% Desp.', 'desp', 9],
  ['% H.M.', 'hm', 9],
  ['Precio Unitario', 'precio', 18],
  ['Subtotal Material', 'sub_mat', 18],
  ['Subtotal Mano Obra', 'sub_mo', 18],
  ['Subtotal Equipo', 'sub_eq', 16],
  ['Subtotal Transporte', 'sub_tr', 18],
  ['Subtotal Línea', 'sub_total', 18],
], 'FF10B981');

let uDetRowNum = 1;
unitariosFinales.forEach((u, idx) => {
  const r = idx + 2;
  const row = wsUni.addRow({
    codigo: u.codigo,
    codigo_cap: u.codigo_capitulo,
    capitulo: u.capitulo,
    disciplina: u.disciplina,
    nombre: u.nombre,
    descripcion: u.descripcion_tecnica,
    unidad: u.unidad,
    cuadrilla: u.cuadrilla,
    rendimiento: {
      formula: `IFERROR(ROUND('00_PARAMETROS_Y_RESUMEN'!$C$8/SUMIFS('09_UNITARIOS_DETALLE'!$H$2:$H$${R_UDET},'09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET},A${r},'09_UNITARIOS_DETALLE'!$D$2:$D$${R_UDET},"MANO_OBRA"),4),1)`,
      result: u.rendimiento_dia,
    },
    eq: {
      formula: `SUMIFS('09_UNITARIOS_DETALLE'!$N$2:$N$${R_UDET},'09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET},A${r})`,
      result: Math.round(u.c_equipo * 100) / 100,
    },
    mat: {
      formula: `SUMIFS('09_UNITARIOS_DETALLE'!$L$2:$L$${R_UDET},'09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET},A${r})`,
      result: Math.round(u.c_material * 100) / 100,
    },
    mo: {
      formula: `SUMIFS('09_UNITARIOS_DETALLE'!$M$2:$M$${R_UDET},'09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET},A${r})`,
      result: Math.round(u.c_mo * 100) / 100,
    },
    tr: {
      formula: `SUMIFS('09_UNITARIOS_DETALLE'!$O$2:$O$${R_UDET},'09_UNITARIOS_DETALLE'!$A$2:$A$${R_UDET},A${r})`,
      result: Math.round(u.c_transporte * 100) / 100,
    },
    total: {
      formula: `SUM(J${r}:M${r})`,
      result: Math.round(u.c_total * 100) / 100,
    },
    fuente: u.fuente_principal,
    anteriores: u.codigos_anteriores.join(' | ').slice(0, 250),
  });
  row.getCell('rendimiento').numFmt = '#,##0.00';
  ['eq', 'mat', 'mo', 'tr', 'total'].forEach((k) => { row.getCell(k).numFmt = FMT_COP; });
  row.getCell('total').font = { bold: true, color: { argb: 'FF064E3B' } };

  u.lineas.forEach((l, lIdx) => {
    uDetRowNum += 1;
    const dr = uDetRowNum;
    const dRow = wsUDet.addRow({
      codigo_apu: u.codigo,
      nombre_apu: u.nombre,
      item_linea: lIdx + 1,
      tipo_recurso: l.tipo_recurso,
      codigo_recurso: l.codigo_recurso,
      nombre_recurso: {
        formula: `IF(D${dr}="MANO_OBRA",INDEX('03_CUADRILLAS'!$B$2:$B$${R_CUA},MATCH(E${dr},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),IF(D${dr}="BASICO",INDEX('06_BASICOS_MAESTRO'!$B$2:$B$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),INDEX('05_INSUMOS_MAESTRO'!$B$2:$B$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0))))`,
        result: l.nombre_recurso,
      },
      unidad: {
        formula: `IF(D${dr}="MANO_OBRA","HORA",IF(D${dr}="BASICO",INDEX('06_BASICOS_MAESTRO'!$E$2:$E$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),INDEX('05_INSUMOS_MAESTRO'!$F$2:$F$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0))))`,
        result: l.unidad_recurso,
      },
      cantidad: l.cantidad,
      desp: l.desperdicio_pct || 0,
      hm: l.herramienta_menor_pct || 0,
      precio: {
        formula: `IF(D${dr}="MANO_OBRA",INDEX('03_CUADRILLAS'!$E$2:$E$${R_CUA},MATCH(E${dr},'03_CUADRILLAS'!$A$2:$A$${R_CUA},0)),IF(D${dr}="BASICO",INDEX('06_BASICOS_MAESTRO'!$K$2:$K$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),INDEX('05_INSUMOS_MAESTRO'!$I$2:$I$${R_INS},MATCH(E${dr},'05_INSUMOS_MAESTRO'!$A$2:$A$${R_INS},0))))`,
        result: Math.round(l.precio_recurso * 100) / 100,
      },
      sub_mat: {
        formula: `IF(D${dr}="MATERIAL",H${dr}*(1+I${dr}/100)*K${dr},IF(D${dr}="BASICO",H${dr}*(1+I${dr}/100)*INDEX('06_BASICOS_MAESTRO'!$H$2:$H$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),0))`,
        result: Math.round(l.sub_mat * 100) / 100,
      },
      sub_mo: {
        formula: `IF(D${dr}="MANO_OBRA",H${dr}*K${dr},IF(D${dr}="BASICO",H${dr}*(1+I${dr}/100)*INDEX('06_BASICOS_MAESTRO'!$I$2:$I$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),0))`,
        result: Math.round(l.sub_mo * 100) / 100,
      },
      sub_eq: {
        formula: `IF(D${dr}="EQUIPO",H${dr}*(1+I${dr}/100)*K${dr},IF(D${dr}="MANO_OBRA",(H${dr}*K${dr})*(J${dr}/100),IF(D${dr}="BASICO",H${dr}*(1+I${dr}/100)*INDEX('06_BASICOS_MAESTRO'!$G$2:$G$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),0)))`,
        result: Math.round(l.sub_eq * 100) / 100,
      },
      sub_tr: {
        formula: `IF(D${dr}="TRANSPORTE",H${dr}*(1+I${dr}/100)*K${dr},IF(D${dr}="BASICO",H${dr}*(1+I${dr}/100)*INDEX('06_BASICOS_MAESTRO'!$J$2:$J$${R_BAS},MATCH(E${dr},'06_BASICOS_MAESTRO'!$A$2:$A$${R_BAS},0)),0))`,
        result: Math.round(l.sub_tr * 100) / 100,
      },
      sub_total: {
        formula: `SUM(L${dr}:O${dr})`,
        result: Math.round(l.sub_total * 100) / 100,
      },
    });
    dRow.getCell('cantidad').numFmt = FMT_QTY;
    dRow.getCell('desp').numFmt = FMT_PCT;
    dRow.getCell('hm').numFmt = FMT_PCT;
    ['precio', 'sub_mat', 'sub_mo', 'sub_eq', 'sub_tr', 'sub_total'].forEach((k) => { dRow.getCell(k).numFmt = FMT_COP; });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// PESTAÑA 10: TRAZABILIDAD Y HOMOLOGACIÓN COMPLETA
// ───────────────────────────────────────────────────────────────────────────
configurarTablaHoja(wsTraz, [
  ['Entidad', 'entidad', 14],
  ['Archivo Fuente', 'fuente', 14],
  ['Código Origen', 'codigo_origen', 22],
  ['Nombre Original en Archivo Fuente', 'nombre_origen', 54],
  ['Código Maestro', 'codigo_nuevo', 16],
  ['Nombre Actualizado y Unificado en BD', 'nombre_nuevo', 56],
  ['Acción Aplicada', 'accion', 28],
  ['Observación Técnica', 'detalle', 44],
], 'FF7C3AED');

trazabilidad.forEach((t) => {
  wsTraz.addRow(t);
});

// Validaciones de datos desplegables en hojas clave
wsCargos.dataValidations.add(`F2:F${CARGOS_MO_BD.length + 1}`, {
  type: 'list',
  allowBlank: false,
  formulae: ['"NIVEL_1,NIVEL_1_5,NIVEL_2,PROFESIONAL"'],
});
wsIns.dataValidations.add(`C2:C${insumosFinales.length + 1}`, {
  type: 'list',
  allowBlank: false,
  formulae: ['"MATERIAL,EQUIPO,TRANSPORTE"'],
});
wsIns.dataValidations.add(`G2:G${insumosFinales.length + 1}`, {
  type: 'list',
  allowBlank: false,
  formulae: ['"COTIZADO_2026,APEU_INDEXADO_2026"'],
});
wsUDet.dataValidations.add(`D2:D${uDetRowNum}`, {
  type: 'list',
  allowBlank: false,
  formulae: ['"MATERIAL,EQUIPO,TRANSPORTE,MANO_OBRA,BASICO"'],
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. GUARDADO SINCRONIZADO EN AMBAS RUTAS Y RESUMEN JSON
// ═══════════════════════════════════════════════════════════════════════════

fs.mkdirSync(path.dirname(OUT_PUBLIC), { recursive: true });
await wb.xlsx.writeFile(OUT_D_DRIVE);
fs.copyFileSync(OUT_D_DRIVE, OUT_PUBLIC);

const porCapitulo = {};
for (const c of CAPITULOS_BD) {
  porCapitulo[`${c.codigo} ${c.nombre}`] = c.codigo === '00'
    ? basicosList.length
    : unitariosFinales.filter((u) => u.codigo_capitulo === c.codigo).length;
}

const resumenBuild = {
  generado_en: new Date().toISOString(),
  archivos_salida: [OUT_D_DRIVE, OUT_PUBLIC],
  totales: {
    capitulos: CAPITULOS_BD.length,
    cargos_mo: CARGOS_MO_BD.length,
    cuadrillas: CUADRILLAS_MO_BD.length,
    cuadrilla_detalle: cuadrillaDetalleRows.length,
    insumos_totales: insumosFinales.length,
    insumos_en_uso: insumosFinales.filter((i) => i.en_uso).length,
    insumos_cotizados_2026: insumosFinales.filter((i) => i.origen_precio === 'COTIZADO_2026').length,
    insumos_apeu_indexados_2026: insumosFinales.filter((i) => i.origen_precio === 'APEU_INDEXADO_2026').length,
    basicos_maestro: basicosList.length,
    basicos_detalle: totalBasDetRows,
    unitarios_maestro: unitariosFinales.length,
    unitarios_detalle: totalUniDetRows,
    registros_trazabilidad: trazabilidad.length,
  },
  unitarios_por_fuente: {
    HOSPITAL: unitariosFinales.filter((u) => u.fuente_principal === 'HOSPITAL').length,
    RICAURTE: unitariosFinales.filter((u) => u.fuente_principal === 'RICAURTE').length,
    DETECCION: unitariosFinales.filter((u) => u.fuente_principal === 'DETECCION').length,
    APEU: unitariosFinales.filter((u) => u.fuente_principal === 'APEU').length,
  },
  apus_por_capitulo: porCapitulo,
};

fs.writeFileSync(path.join(DATA_DIR, 'bd_resumen.json'), JSON.stringify(resumenBuild, null, 2), 'utf8');

console.log('✅ Base de Datos Maestra generada exitosamente:');
console.log('   1.', OUT_D_DRIVE);
console.log('   2.', OUT_PUBLIC);
console.log('\n📊 Resumen de construcción:');
console.log(JSON.stringify(resumenBuild.totales, null, 2));
console.log('\n📑 APUs por fuente principal:', JSON.stringify(resumenBuild.unitarios_por_fuente));
console.log('\n📂 Distribución por capítulo:');
for (const [k, v] of Object.entries(porCapitulo)) {
  console.log(`   ${k.padEnd(42)} : ${v}`);
}
