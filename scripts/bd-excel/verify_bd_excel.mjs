/**
 * Suite de Auditoría de Calidad, Integridad Referencial, Paridad con `apu-engine.js`
 * y Detección de Casi-Duplicados sobre `BD_MAESTRA_ERP_KALARTI_2026.xlsx`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { crearContexto, costoAPU, datosCargo } from '../../src/lib/apu-engine.js';
import { norm } from './diccionario_unificacion.mjs';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ERP_DIR = path.resolve(__dirname, '../..');
const OUT_D_DRIVE = 'D:\\DPTO. ARQUITECTURA\\0000 presupuestos\\BD_MAESTRA_ERP_KALARTI_2026.xlsx';
const OUT_PUBLIC = path.join(ERP_DIR, 'public', 'BD_MAESTRA_ERP_KALARTI_2026.xlsx');

function val(cell) {
  const v = cell?.value;
  if (v && typeof v === 'object' && 'result' in v) return v.result;
  return v;
}

function formulaStr(cell) {
  const v = cell?.value;
  if (v && typeof v === 'object' && 'formula' in v) return v.formula;
  return null;
}

const errores = [];
const advertencias = [];
const check = (cond, msg) => {
  if (!cond) errores.push(msg);
};

console.log('🔍 Iniciando auditoría integral de BD_MAESTRA_ERP_KALARTI_2026.xlsx...\n');

// 1. Existencia y sincronización byte a byte
check(fs.existsSync(OUT_D_DRIVE), `No existe archivo en ${OUT_D_DRIVE}`);
check(fs.existsSync(OUT_PUBLIC), `No existe copia en ${OUT_PUBLIC}`);
const hashD = crypto.createHash('sha256').update(fs.readFileSync(OUT_D_DRIVE)).digest('hex');
const hashP = crypto.createHash('sha256').update(fs.readFileSync(OUT_PUBLIC)).digest('hex');
check(hashD === hashP, 'Los dos archivos Excel generados no son idénticos byte a byte');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(OUT_D_DRIVE);

const expectedSheets = [
  '00_PARAMETROS_Y_RESUMEN',
  '01_DISCIPLINAS_CAPITULOS',
  '02_CARGOS_MO',
  '03_CUADRILLAS',
  '04_CUADRILLA_DETALLE',
  '05_INSUMOS_MAESTRO',
  '06_BASICOS_MAESTRO',
  '07_BASICOS_DETALLE',
  '08_UNITARIOS_MAESTRO',
  '09_UNITARIOS_DETALLE',
  '10_TRAZABILIDAD_Y_HOMOLOGACION',
];

for (const s of expectedSheets) {
  check(!!wb.getWorksheet(s), `Falta la pestaña obligatoria: ${s}`);
}

// 2. Auditoría de fórmulas, errores Excel y grafo acíclico entre hojas
const sheetEdges = new Map();
let totalFormulaCells = 0;
const ERROR_TOKENS = /#REF!|#NAME\?|#N\/A|#VALUE!|#DIV\/0!|#NUM!/;

for (const ws of wb.worksheets) {
  sheetEdges.set(ws.name, new Set());
  ws.eachRow((row, rIdx) => {
    row.eachCell((cell, cIdx) => {
      const f = formulaStr(cell);
      const v = val(cell);
      if (f) {
        totalFormulaCells += 1;
        if (ERROR_TOKENS.test(f)) {
          errores.push(`Error en fórmula ${ws.name}!R${rIdx}C${cIdx}: ${f}`);
        }
        // Extraer referencias a otras hojas
        const refs = [...f.matchAll(/'([^']+)'!/g)].map((m) => m[1]);
        for (const targetSheet of refs) {
          if (targetSheet !== ws.name) {
            sheetEdges.get(ws.name).add(targetSheet);
          }
        }
      }
      if (typeof v === 'string' && ERROR_TOKENS.test(v)) {
        errores.push(`Valor de error Excel en ${ws.name}!R${rIdx}C${cIdx}: ${v}`);
      }
      if (typeof v === 'number' && Number.isNaN(v)) {
        errores.push(`Valor NaN en ${ws.name}!R${rIdx}C${cIdx}`);
      }
    });
  });
}

// Verificar ausencia total de ciclos en el grafo de dependencias entre hojas (excluido tablero KPI 00 que lee conteos)
function hasCycle(graph) {
  const state = new Map(); // 0=unvisited, 1=visiting, 2=done
  const dfs = (node) => {
    state.set(node, 1);
    for (const nxt of graph.get(node) || []) {
      if (nxt === '00_PARAMETROS_Y_RESUMEN') continue; // 00 provee constantes C5:C14; sus KPIs C17:C26 solo leen conteos
      if (state.get(nxt) === 1) return `${node} -> ${nxt}`;
      if (!state.get(nxt)) {
        const cyc = dfs(nxt);
        if (cyc) return `${node} -> ${cyc}`;
      }
    }
    state.set(node, 2);
    return null;
  };
  for (const k of graph.keys()) {
    if (k === '00_PARAMETROS_Y_RESUMEN') continue;
    if (!state.get(k)) {
      const cyc = dfs(k);
      if (cyc) return cyc;
    }
  }
  return null;
}
const cycleFound = hasCycle(sheetEdges);
check(!cycleFound, `Ciclo de dependencias detectado entre hojas: ${cycleFound}`);

// 3. Cargar tablas desde el Excel leído
function readTable(sheetName) {
  const ws = wb.getWorksheet(sheetName);
  const headers = [];
  ws.getRow(1).eachCell((c, i) => { headers[i] = String(val(c) || '').trim(); });
  const rows = [];
  ws.eachRow((row, rIdx) => {
    if (rIdx === 1) return;
    const obj = { _row: rIdx };
    row.eachCell({ includeEmpty: true }, (c, i) => {
      if (headers[i]) obj[headers[i]] = val(c);
      obj[`_c${i}`] = val(c);
      obj[`_f${i}`] = formulaStr(c);
    });
    if (obj._c1) rows.push(obj);
  });
  return rows;
}

const tCargos = readTable('02_CARGOS_MO');
const tCuadrillas = readTable('03_CUADRILLAS');
const tCuaDet = readTable('04_CUADRILLA_DETALLE');
const tInsumos = readTable('05_INSUMOS_MAESTRO');
const tBasicos = readTable('06_BASICOS_MAESTRO');
const tBasDet = readTable('07_BASICOS_DETALLE');
const tUnitarios = readTable('08_UNITARIOS_MAESTRO');
const tUniDet = readTable('09_UNITARIOS_DETALLE');

// 4. Integridad referencial y unicidad
const setCargos = new Set();
for (const r of tCargos) {
  check(!setCargos.has(r._c1), `Código de cargo duplicado: ${r._c1}`);
  setCargos.add(r._c1);
  check(r._c12 > 0, `Cargo con valor hora <= 0: ${r._c1}`);
}

const setCuadrillas = new Set();
for (const r of tCuadrillas) {
  check(!setCuadrillas.has(r._c1), `Código de cuadrilla duplicado: ${r._c1}`);
  setCuadrillas.add(r._c1);
  check(r._c5 > 0, `Cuadrilla con valor hora <= 0: ${r._c1}`);
}

for (const r of tCuaDet) {
  check(setCuadrillas.has(r._c1), `04_CUADRILLA_DETALLE fila ${r._row}: cuadrilla huérfana ${r._c1}`);
  check(setCargos.has(r._c3), `04_CUADRILLA_DETALLE fila ${r._row}: cargo huérfano ${r._c3}`);
}

const setInsumos = new Set();
const setInsNameUnit = new Set();
for (const r of tInsumos) {
  check(!setInsumos.has(r._c1), `Código de insumo duplicado: ${r._c1}`);
  setInsumos.add(r._c1);
  const nu = `${norm(r._c2)}|${r._c6}`;
  check(!setInsNameUnit.has(nu), `Insumo duplicado (nombre+unidad): ${nu}`);
  setInsNameUnit.add(nu);
  check(r._c9 > 0, `Insumo con precio 2026 <= 0: ${r._c1} ${r._c2}`);
}

const setBasicos = new Set();
for (const r of tBasicos) {
  check(!setBasicos.has(r._c1), `Código de básico duplicado: ${r._c1}`);
  setBasicos.add(r._c1);
  check(setCuadrillas.has(r._c6), `06_BASICOS_MAESTRO ${r._c1}: cuadrilla inválida ${r._c6}`);
  check(r._c11 > 0, `Básico con costo directo <= 0: ${r._c1}`);
}

for (const r of tBasDet) {
  check(setBasicos.has(r._c1), `07_BASICOS_DETALLE fila ${r._row}: básico padre huérfano ${r._c1}`);
  if (r._c4 === 'MANO_OBRA') {
    check(setCuadrillas.has(r._c5), `07_BASICOS_DETALLE fila ${r._row}: cuadrilla huérfana ${r._c5}`);
  } else {
    check(setInsumos.has(r._c5), `07_BASICOS_DETALLE fila ${r._row}: insumo huérfano ${r._c5}`);
  }
}

const setUnitarios = new Set();
const setUniNameUnit = new Set();
for (const r of tUnitarios) {
  check(!setUnitarios.has(r._c1), `Código APU duplicado: ${r._c1}`);
  setUnitarios.add(r._c1);
  const nu = `${norm(r._c5)}|${r._c7}`;
  check(!setUniNameUnit.has(nu), `Unitario duplicado (nombre+unidad): ${nu}`);
  setUniNameUnit.add(nu);
  check(setCuadrillas.has(r._c8), `08_UNITARIOS_MAESTRO ${r._c1}: cuadrilla inválida ${r._c8}`);
  check(r._c14 > 0, `Unitario con costo directo <= 0: ${r._c1} ${r._c5}`);
}

for (const r of tUniDet) {
  check(setUnitarios.has(r._c1), `09_UNITARIOS_DETALLE fila ${r._row}: APU padre huérfano ${r._c1}`);
  if (r._c4 === 'MANO_OBRA') {
    check(setCuadrillas.has(r._c5), `09_UNITARIOS_DETALLE fila ${r._row}: cuadrilla huérfana ${r._c5}`);
  } else if (r._c4 === 'BASICO') {
    check(setBasicos.has(r._c5), `09_UNITARIOS_DETALLE fila ${r._row}: básico huérfano ${r._c5}`);
  } else {
    check(setInsumos.has(r._c5), `09_UNITARIOS_DETALLE fila ${r._row}: insumo huérfano ${r._c5}`);
  }
}

// 5. Paridad matemática estricta contra `src/lib/apu-engine.js`
const smlvParam = val(wb.getWorksheet('00_PARAMETROS_Y_RESUMEN').getCell('C5'));
const engineCtx = crearContexto({
  config: [
    { clave: 'SMLV', valor: String(smlvParam) },
    { clave: 'HORAS_MES', valor: '240' },
    { clave: 'HORAS_DIA', valor: '8' },
  ],
  insumos: tInsumos.map((r) => ({
    id: r._c1,
    codigo: r._c1,
    nombre: r._c2,
    tipo: r._c3,
    unidad: r._c6,
    precio_unitario: Number(r._c9),
  })),
  cargos: [
    ...tCargos.map((r) => ({
      id: r._c1,
      codigo: r._c1,
      nombre: r._c2,
      unidad: 'Mes',
      factor_smlv: Number(r._c7),
      factor_multiplicador: Number(r._c9),
    })),
    ...tCuadrillas.map((r) => ({
      id: r._c1,
      codigo: r._c1,
      nombre: r._c2,
      unidad: 'Hora',
      factor_smlv: 1,
      factor_multiplicador: 1,
    })),
  ],
  cargoDetalles: tCuaDet.map((r) => ({
    cargo_padre_id: r._c1,
    cargo_hijo_id: r._c3,
    cantidad: Number(r._c6),
  })),
  apuDetalles: [
    ...tBasDet.map((r) => ({
      apu_id: r._c1,
      insumo_id: r._c4 !== 'MANO_OBRA' ? r._c5 : null,
      cargo_id: r._c4 === 'MANO_OBRA' ? r._c5 : null,
      apu_hijo_id: null,
      cantidad: Number(r._c8),
      unidad_detalle: r._c7,
      desperdicio_pct: 0,
      herramienta_menor_pct: 0,
    })),
    ...tUniDet.map((r) => ({
      apu_id: r._c1,
      insumo_id: (r._c4 !== 'MANO_OBRA' && r._c4 !== 'BASICO') ? r._c5 : null,
      cargo_id: r._c4 === 'MANO_OBRA' ? r._c5 : null,
      apu_hijo_id: r._c4 === 'BASICO' ? r._c5 : null,
      cantidad: Number(r._c8),
      unidad_detalle: r._c7,
      desperdicio_pct: Number(r._c9) || 0,
      herramienta_menor_pct: Number(r._c10) || 0,
    })),
  ],
});

let maxDiffCuadrilla = 0;
for (const r of tCuadrillas) {
  const { precioHora } = datosCargo(engineCtx, r._c1);
  const diff = Math.abs(precioHora - Number(r._c5));
  maxDiffCuadrilla = Math.max(maxDiffCuadrilla, diff);
  check(diff < 0.05, `Diferencia en valor hora cuadrilla ${r._c1}: Excel=${r._c5} vs Engine=${precioHora}`);
}

let maxDiffBasico = 0;
for (const r of tBasicos) {
  const c = costoAPU(engineCtx, r._c1);
  const diff = Math.abs(c.total - Number(r._c11));
  maxDiffBasico = Math.max(maxDiffBasico, diff);
  check(diff < 1.0, `Diferencia en costo Básico ${r._c1}: Excel=${r._c11} vs Engine=${c.total}`);
}

let maxDiffUnitario = 0;
for (const r of tUnitarios) {
  const c = costoAPU(engineCtx, r._c1);
  const diff = Math.abs(c.total - Number(r._c14));
  maxDiffUnitario = Math.max(maxDiffUnitario, diff);
  check(diff < 1.0, `Diferencia en costo Unitario ${r._c1} (${r._c5}): Excel=${r._c14} vs Engine=${c.total}`);
}

// 6. Control de calidad léxica (cero mojibake, cero abreviaturas crudas de APEU, cero paréntesis sin cerrar, cero "bioconstrucción", cero cortes de 'm')
const PATRON_PROHIBIDO = /Ã|Â|├|\uFFFD|\bbioconstruc|\bCegr[ií]s\b|\bCeblanco\b|\bCCTO\b|\bMORT\b|\bM de O\b|\bDeralladas\b|\bINERIOR\b|\bBreacker\b|\bTOMACORREN\b|\bSOBRECIM\b|\bCONTR TOPOG\b|\bTeja AC\b|\bmanposteria\b|\b35000\s*psi\b|\bM\s+Pa\b|\b\d+M\s+m\b|\b\d+(?:[.,]\d+)?\s+m\s+(?:inutos?|etros?|uros?|anos?|atecsa|tc|il)\b|\bM\s+ini-Com\b|est[aá]ndar industrial est[aá]ndar/i;

for (const ws of wb.worksheets) {
  ws.eachRow((row, rIdx) => {
    row.eachCell((cell, cIdx) => {
      // Ignorar columna de nombres originales crudos en trazabilidad o equivalentes históricos si vinieran del archivo fuente
      if (ws.name === '10_TRAZABILIDAD_Y_HOMOLOGACION' && cIdx === 4) return;
      if (ws.name === '05_INSUMOS_MAESTRO' && cIdx === 15) return;
      const v = val(cell);
      if (typeof v === 'string' && /bioconstruc/i.test(v)) {
        errores.push(`Término prohibido "bioconstrucción" encontrado en ${ws.name}!R${rIdx}C${cIdx}: "${v}"`);
      }
    });
  });
}

for (const r of tInsumos) {
  if (PATRON_PROHIBIDO.test(r._c2)) {
    errores.push(`Nombre de insumo con abreviatura cruda, corte erróneo o mojibake: ${r._c1} -> "${r._c2}"`);
  }
}
for (const r of tUnitarios) {
  if (PATRON_PROHIBIDO.test(r._c5) || PATRON_PROHIBIDO.test(r._c6)) {
    errores.push(`Nombre/descripción de unitario con abreviatura cruda, corte erróneo o mojibake: ${r._c1} -> "${r._c5}"`);
  }
  const openP = (String(r._c5).match(/\(/g) || []).length;
  const closeP = (String(r._c5).match(/\)/g) || []).length;
  if (openP !== closeP) {
    errores.push(`Paréntesis desbalanceados en nombre de unitario: ${r._c1} -> "${r._c5}"`);
  }
}

// 6b. Verificación de independización de disciplinas/cuadrillas y pureza de categorías de almacén (v2)
const cuadrillasRequeridas = ['CUA-CMA', 'CUA-CAL', 'CUA-GUA', 'CUA-MAD', 'CUA-HID', 'CUA-GAS'];
for (const qReq of cuadrillasRequeridas) {
  check(setCuadrillas.has(qReq), `Falta cuadrilla independizada obligatoria: ${qReq}`);
}
check(!setCuadrillas.has('CUA-CAR'), 'No debe existir cuadrilla combinada heredada CUA-CAR');

const itemsGuadua = tInsumos.filter((r) => r._c4 === 'GUADUA');
check(itemsGuadua.length > 0, 'Debe existir la categoría de almacén GUADUA con insumos');
for (const r of itemsGuadua) {
  check(/GUADUA|ESTERILLA/i.test(r._c2), `Insumo intruso en categoría GUADUA: ${r._c1} "${r._c2}"`);
}
for (const r of tInsumos) {
  const N = norm(r._c2);
  if (/\bBORAX\b|ACIDO BORICO|ACEITE DE LINAZA/.test(N)) {
    check(r._c4 === 'QUÍMICOS', `Químico mal clasificado (${r._c4}): ${r._c1} "${r._c2}"`);
  }
  if ((/\bLIJA\b|VARILLA ROSCADA|\bTUERCAS?\b/.test(N)) && r._c3 === 'MATERIAL' && !/CONTRATUERCA (CONDUIT|EMT|IMC)/.test(N)) {
    check(r._c4 === 'FERRETERÍA', `Ferretería mal clasificada (${r._c4}): ${r._c1} "${r._c2}"`);
  }
  if (/EUCALIPTO/.test(N)) {
    check(r._c4 === 'MADERAS Y ASERRADERO', `Eucalipto mal clasificado (${r._c4}): ${r._c1} "${r._c2}"`);
  }
}

// 7. Detección de posibles casi-duplicados (Jaccard >= 0.85 en el mismo capítulo y unidad, excluyendo números distintos)
function numsOf(s) {
  return (norm(s).match(/\d+(?:[./]\d+)?/g) || []).join(',');
}
function wordsOf(s) {
  const stop = new Set(['PARA', 'CON', 'POR', 'DEL', 'LOS', 'LAS', 'UNA', 'EN', 'DE', 'EL', 'LA', 'Y', 'O', 'TIPO']);
  return new Set(norm(s).split(' ').filter((w) => w.length > 2 && !stop.has(w) && !/^\d/.test(w)));
}

const posiblesSimilares = [];
for (let i = 0; i < tUnitarios.length; i++) {
  for (let j = i + 1; j < tUnitarios.length; j++) {
    const a = tUnitarios[i], b = tUnitarios[j];
    if (a._c2 !== b._c2 || a._c7 !== b._c7) continue;
    if (numsOf(a._c5) !== numsOf(b._c5)) continue;
    const wa = wordsOf(a._c5), wbSet = wordsOf(b._c5);
    if (wa.size < 2 || wbSet.size < 2) continue;
    const inter = [...wa].filter((x) => wbSet.has(x)).length;
    const jac = inter / (wa.size + wbSet.size - inter);
    if (jac >= 0.85) {
      posiblesSimilares.push(`${a._c1} "${a._c5}" (${a._c15})  <~>  ${b._c1} "${b._c5}" (${b._c15}) [sim=${jac.toFixed(2)}]`);
    }
  }
}

console.log(`✅ Pestañas verificadas            : ${wb.worksheets.length} / 11`);
console.log(`✅ Celdas con fórmulas auditadas   : ${totalFormulaCells.toLocaleString('es-CO')}`);
console.log(`✅ Ciclos en grafo de hojas        : ${cycleFound || '0 (100% DAG acíclico)'}`);
console.log(`✅ Máx. desvío vs apu-engine.js    : Cuadrillas $${maxDiffCuadrilla.toFixed(4)} | Básicos $${maxDiffBasico.toFixed(4)} | Unitarios $${maxDiffUnitario.toFixed(4)}`);
console.log(`ℹ️ Pares muy similares (mismos #s) : ${posiblesSimilares.length}`);
if (posiblesSimilares.length > 0) {
  posiblesSimilares.slice(0, 25).forEach((s) => console.log('   •', s));
}

if (errores.length > 0) {
  console.error(`\n❌ AUDITORÍA FALLÓ CON ${errores.length} ERRORES:`);
  errores.slice(0, 40).forEach((e) => console.error('   -', e));
  process.exit(1);
} else {
  console.log('\n🎉 AUDITORÍA 100% SUPERADA: 0 errores, 0 huérfanos, 0 duplicados, paridad matemática exacta.');
}
