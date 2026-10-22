/**
 * Depuración y reconstrucción del catálogo Kalarti (insumos, mano de obra, APU).
 *
 *   node scripts/catalogo/build-catalogo.mjs            → DRY-RUN: genera reporte y staging (no escribe en Supabase)
 *   node scripts/catalogo/build-catalogo.mjs --apply    → Aplica en Supabase (hace backup previo en data/)
 *
 * Requiere: data/referentes.json (python scripts/catalogo/extract_referentes.py data/referentes.json)
 * Opcional: data/nombres_override.json  { "<NOMBRE ORIGINAL NORMALIZADO>": { "nombre": "...", "descripcion": "..." } }
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { conectar, fetchAll, DATA, norm, fixMojibake, unidad } from './lib.mjs';
import { acortarNombre, sentenceCase, clasificarCapitulo, capituloHospital, categoriaInsumo, evaluarBanda } from './nombres.mjs';
import { CAPITULOS_APU, CAPITULO_POR_NOMBRE, CARGOS_MO, CUADRILLAS_MO, precioKalarti, MARGEN_KALARTI } from '../../src/lib/catalogo-taxonomia.js';
import { crearContexto, costoAPU, factorConversion, SMLV_2026 } from '../../src/lib/apu-engine.js';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const APPLY = process.argv.includes('--apply');
const ref = JSON.parse(fs.readFileSync(path.join(DATA, 'referentes.json'), 'utf8'));
const overridesPath = path.join(DATA, 'nombres_override.json');
const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {};

const log = (...a) => console.log(...a);
const sb = await conectar();
const safe = (t) => fetchAll(sb, t).catch((e) => { log('  (sin acceso a', t + ':', e.message + ')'); return []; });
log('📥 Cargando datos actuales de Supabase…');
const [apus, det, insumos, cargos, cargoDet, config, pItems, ofertas, inventario, proveedores, categorias] = await Promise.all(
  ['apu', 'apu_detalle', 'insumos', 'cargos', 'cargo_detalle', 'global_config', 'presupuesto_items', 'mk_ofertas', 'inventario_transacciones', 'erp_proveedores', 'categorias'].map(safe));
log(`   apu ${apus.length} · detalle ${det.length} · insumos ${insumos.length} · cargos ${cargos.length} · items ${pItems.length}`);

// Costos actuales (antes) con el motor único y la configuración vigente
const ctxAntes = crearContexto({ insumos, cargos, cargoDetalles: cargoDet, apuDetalles: det, config, ofertas });
const costoAntes = new Map(apus.map((a) => [a.id, Math.round(costoAPU(ctxAntes, a.id).total)]));

// ════════════════════════════════════════════════════════════
// 1. MANO DE OBRA: configuración, cargos y cuadrillas
// ════════════════════════════════════════════════════════════
const fp = ref.factor_prestacional;
const SMLV = fp.smlv || SMLV_2026;
const stConfig = [
  { clave: 'SMLV', valor: String(SMLV) },
  { clave: 'HORAS_MES', valor: '240' },
  { clave: 'HORAS_DIA', valor: '8' },
  { clave: 'MARGEN_KALARTI', valor: String(MARGEN_KALARTI) },
  { clave: 'FACTOR_PRESTACIONAL', valor: JSON.stringify(fp) },
];
const cargoByCode = new Map(cargos.map((c) => [c.codigo, c]));
const stCargos = new Map(); // codigo → cargo staging
for (const m of CARGOS_MO) {
  const ex = cargoByCode.get(m.codigo);
  stCargos.set(m.codigo, { sid: ex?.id || `new-cargo-${m.codigo}`, existe: !!ex, codigo: m.codigo, nombre: m.nombre, unidad: 'Mes', factor_smlv: m.smlv, factor_multiplicador: m.factor, categoria: 'Mano de Obra Directa', precio_unitario: Math.round(SMLV * m.smlv * m.factor) });
}
const vhRef = new Map(ref.cuadrillas.map((c) => [norm(c.nombre), c.valor_hora]));
for (const q of CUADRILLAS_MO) {
  const ex = cargoByCode.get(q.codigo);
  const vh = q.integrantes.reduce((t, [h, n]) => { const m = CARGOS_MO.find((x) => x.codigo === h); return t + (SMLV * m.smlv * m.factor / 240) * n; }, 0);
  stCargos.set(q.codigo, { sid: ex?.id || `new-cargo-${q.codigo}`, existe: !!ex, codigo: q.codigo, nombre: q.nombre, unidad: 'Hora', factor_smlv: Math.round((vh * 240 / SMLV) * 10000) / 10000, factor_multiplicador: 1, categoria: 'cuadrilla', precio_unitario: Math.round(vh), valor_hora: vh, valor_hora_ref: q.ref ? vhRef.get(norm(q.ref)) : null, integrantes: q.integrantes });
}
const stCargoDet = CUADRILLAS_MO.flatMap((q) => q.integrantes.map(([h, n]) => ({ cargo_padre_id: stCargos.get(q.codigo).sid, cargo_hijo_id: stCargos.get(h).sid, cantidad: n, factor_smlv: null })));
const cua = (codigo) => stCargos.get(codigo);

/** Resuelve la cuadrilla de una línea de MO del referente. Devuelve { codigo, factorHoras } */
function resolverCuadrilla(desc, precio, capitulo) {
  const D = norm(desc);
  const defecto = CAPITULO_POR_NOMBRE.get(capitulo)?.cuadrilla || 'CUA-OC';
  const cands = [];
  for (const q of CUADRILLAS_MO) {
    const vh = stCargos.get(q.codigo).valor_hora_ref || stCargos.get(q.codigo).valor_hora;
    if (precio > 0 && Math.abs(precio - vh) / vh < 0.01) cands.push({ codigo: q.codigo, f: 1, q });
    else if (precio > 0 && Math.abs(precio - vh * 8) / (vh * 8) < 0.01) cands.push({ codigo: q.codigo, f: 8, q });
  }
  const porNombre = (list) => list.find((c) => c.q.ref && D.includes(norm(c.q.ref).replace(/^CUADRILLA /, '')));
  if (cands.length) return porNombre(cands) || cands.find((c) => c.codigo === defecto) || cands[0];
  const n = porNombre(CUADRILLAS_MO.map((q) => ({ codigo: q.codigo, f: 1, q })));
  return n || { codigo: defecto, f: 1 };
}

// ════════════════════════════════════════════════════════════
// 2. INSUMOS: maestro con precio almacén Kalarti
// ════════════════════════════════════════════════════════════
const stIns = new Map();     // sid → insumo staging
const byKey = new Map();     // NOMBRE|UND → sid
const byName = new Map();    // NOMBRE → sid
const remapIns = new Map();  // id duplicado → sid canónico
const usoIns = new Map();
det.forEach((d) => d.insumo_id && usoIns.set(d.insumo_id, (usoIns.get(d.insumo_id) || 0) + 1));
const refExterna = new Set([...ofertas.map((o) => o.insumo_id), ...inventario.map((t) => t.insumo_id)].filter(Boolean));
const kIns = (n, u) => `${norm(n)}|${unidad(u)}`;
let seqIns = 0;

// 2a. Insumos existentes (fusión de duplicados)
const gruposDup = new Map();
for (const i of insumos) {
  const k = kIns(i.nombre, i.unidad);
  if (!gruposDup.has(k)) gruposDup.set(k, []);
  gruposDup.get(k).push(i);
}
for (const [k, grupo] of gruposDup) {
  grupo.sort((a, b) => (Number(b.precio_unitario) > 0) - (Number(a.precio_unitario) > 0) || (usoIns.get(b.id) || 0) - (usoIns.get(a.id) || 0));
  const can = grupo[0];
  stIns.set(can.id, { sid: can.id, existe: true, accion: 'SIN CAMBIO', codigo: can.codigo, nombre: fixMojibake(can.nombre), nombre_anterior: can.nombre, tipo: can.tipo, unidad: can.unidad, precio_unitario: Number(can.precio_unitario) || 0, precio_anterior: Number(can.precio_unitario) || 0, categoria: can.categoria, categoria_id: can.categoria_id, notas: can.notas, cotizaciones: [], user_id: can.user_id });
  byKey.set(k, can.id);
  if (!byName.has(norm(can.nombre))) byName.set(norm(can.nombre), can.id);
  grupo.slice(1).forEach((d) => remapIns.set(d.id, can.id));
}
const insByCode = new Map(insumos.map((i) => [String(i.codigo || '').toUpperCase(), i.id]));

function nuevoCodigoInsumo(tipo) {
  seqIns += 1;
  const p = tipo === 'EQUIPO' ? 'EQ' : tipo === 'TRANSPORTE' ? 'TR' : tipo === 'MANO_OBRA' ? 'MO' : 'MT';
  return `K${p}-${String(seqIns).padStart(4, '0')}`;
}
function upsertInsumo({ nombre, unidad: u, tipo = 'MATERIAL', precio, categoria, cotizaciones = [], codigoErp = null, fuente }) {
  const k = kIns(nombre, u);
  let sid = byKey.get(k) || byName.get(norm(nombre)) || (codigoErp && insByCode.get(codigoErp.toUpperCase()));
  if (sid && remapIns.has(sid)) sid = remapIns.get(sid);
  const nombreFinal = norm(nombre).length > 80 ? acortarNombre(nombre, 80).nombre : sentenceCase(nombre);
  if (sid && stIns.has(sid)) {
    const s = stIns.get(sid);
    if (s._ref) { // ya actualizado por otro referente: fusionar cotizaciones
      const provs = new Set(s.cotizaciones.map((c) => c.proveedor));
      cotizaciones.forEach((c) => { if (!provs.has(c.proveedor)) s.cotizaciones.push(c); });
      if (tipo === 'MATERIAL') s.precio_unitario = precioKalarti(s.cotizaciones, s.precio_ref);
      return sid;
    }
    Object.assign(s, { _ref: fuente, accion: s.existe ? 'ACTUALIZAR' : 'CREAR', nombre: nombreFinal, unidad: unidad(u), tipo, categoria, cotizaciones, precio_ref: precio });
    s.precio_unitario = tipo === 'MATERIAL' ? precioKalarti(cotizaciones, precio) : Math.round(precio);
    return sid;
  }
  sid = `new-ins-${stIns.size}`;
  stIns.set(sid, { sid, existe: false, _ref: fuente, accion: 'CREAR', codigo: nuevoCodigoInsumo(tipo), nombre: nombreFinal, tipo, unidad: unidad(u), precio_ref: precio, precio_unitario: tipo === 'MATERIAL' ? precioKalarti(cotizaciones, precio) : Math.round(precio), precio_anterior: null, categoria, cotizaciones, notas: fuente ? `Referente ${fuente}` : null });
  byKey.set(k, sid);
  if (!byName.has(norm(nombre))) byName.set(norm(nombre), sid);
  return sid;
}

// 2b. Materiales del referente (categoría vacía hereda la anterior del mismo archivo)
let ultimaCat = {};
for (const m of ref.materiales) {
  const cat = m.categoria || ultimaCat[m.fuente] || '';
  if (m.categoria) ultimaCat[m.fuente] = m.categoria;
  upsertInsumo({ nombre: m.descripcion, unidad: m.unidad, precio: m.precio_ref, categoria: categoriaInsumo(cat, m.descripcion), cotizaciones: m.cotizaciones, codigoErp: m.codigo_erp, fuente: m.fuente });
}
for (const e of ref.equipos) upsertInsumo({ nombre: e.descripcion, unidad: e.unidad, tipo: 'EQUIPO', precio: e.precio, categoria: 'EQUIPOS', fuente: 'HOSPITAL' });
for (const t of ref.transportes) upsertInsumo({ nombre: t.descripcion, unidad: t.unidad, tipo: 'TRANSPORTE', precio: t.precio, categoria: 'TRANSPORTE', fuente: 'HOSPITAL' });

function insumoParaLinea(l, fuente) {
  const tipo = l.bucket === 'equipo' ? 'EQUIPO' : l.bucket === 'transporte' ? 'TRANSPORTE' : l.bucket === 'mano_obra' ? 'MANO_OBRA' : 'MATERIAL';
  const sid = byKey.get(kIns(l.descripcion, l.unidad)) || byName.get(norm(l.descripcion));
  if (sid) return remapIns.get(sid) || sid;
  return upsertInsumo({ nombre: l.descripcion, unidad: l.unidad, tipo, precio: l.precio, categoria: tipo === 'MATERIAL' ? categoriaInsumo('', l.descripcion) : tipo === 'EQUIPO' ? 'EQUIPOS' : tipo === 'TRANSPORTE' ? 'TRANSPORTE' : 'MANO DE OBRA', fuente });
}

// ════════════════════════════════════════════════════════════
// 3. APU
// ════════════════════════════════════════════════════════════
const apuById = new Map(apus.map((a) => [a.id, a]));
const apuByCode = new Map(apus.map((a) => [String(a.codigo).toUpperCase(), a]));
const apuByName = new Map();
apus.forEach((a) => { const k = norm(a.nombre); if (!apuByName.has(k)) apuByName.set(k, []); apuByName.get(k).push(a); });
const detByApu = new Map();
det.forEach((d) => { if (!detByApu.has(d.apu_id)) detByApu.set(d.apu_id, []); detByApu.get(d.apu_id).push(d); });
const enPresupuesto = new Set(pItems.map((p) => p.apu_id));
const stApu = new Map();   // sid → apu staging
const usados = new Set();  // ids existentes ya asignados
const eliminar = [];       // { id, codigo, nombre, motivo, reemplazo }
const remapApu = new Map();

function tomarExistente(...cands) {
  for (const a of cands.flat()) if (a && !usados.has(a.id)) { usados.add(a.id); return a; }
  return null;
}
function nuevoApu({ ex, nombreOriginal, unidad: u, capitulo, origen, lineas, refDirecto = null, descripcionExtra = null }) {
  const sid = ex?.id || `new-apu-${stApu.size}`;
  const ov = overrides[norm(nombreOriginal)];
  const corto = ov || acortarNombre(nombreOriginal);
  stApu.set(sid, {
    sid, existe: !!ex, codigo_legacy: ex?.codigo || null, nombre_anterior: ex?.nombre || nombreOriginal, clave_nombre: norm(nombreOriginal), texto_original: fixMojibake(nombreOriginal), con_override: !!ov,
    nombre: corto.nombre, descripcion: corto.descripcion ?? descripcionExtra ?? (ex?.descripcion || null),
    unidad: unidad(u || ex?.unidad), categoria_apu: capitulo, categoria_anterior: ex?.categoria_apu || null,
    tipo: ex?.tipo || 'BASICO', origen, lineas, ref_directo: refDirecto, accion: ex ? 'RECONSTRUIR' : 'CREAR',
    costo_anterior: ex ? costoAntes.get(ex.id) : null, user_id: ex?.user_id,
  });
  return sid;
}

/** Convierte líneas del referente (bloques APU) en líneas de staging */
function lineasReferente(lineas, capitulo, fuente, basicos) {
  const out = [];
  let hm = 0;
  for (const l of lineas) {
    const D = norm(l.descripcion);
    if (/HERRAMIENTA/.test(D) && l.unidad === '%') {
      const q = l.cantidad || 0;
      hm = q > 0 && q <= 0.2 ? Math.round(q * 10000) / 100 : Number((D.match(/(\d+(?:\.\d+)?)\s?%/) || [])[1]) || 5;
      continue;
    }
    if (l.bucket === 'mano_obra' && /CUADRILLA|VALOR HORA/.test(D)) {
      const r = resolverCuadrilla(l.descripcion, l.precio, capitulo);
      const prev = out.find((x) => x.cargo === r.codigo);
      const horas = (l.cantidad || 0) * r.f;
      if (prev) prev.cantidad += horas; else out.push({ cargo: r.codigo, cantidad: horas, unidad_detalle: 'Hr' });
      continue;
    }
    if (basicos && basicos.has(D)) { out.push({ hijo: basicos.get(D), cantidad: l.cantidad || 0, unidad_detalle: l.unidad }); continue; }
    const sid = insumoParaLinea(l, fuente);
    // Conversión de presentación: el APU del referente usa precio por unidad de consumo (kg, und, m²)
    // mientras el almacén vende por presentación (bulto, caja, galón). f = precio línea / precio presentación.
    const s = stIns.get(sid);
    const pRef = s?.precio_ref || s?.precio_anterior || (s?.precio_unitario || 0) / (1 + MARGEN_KALARTI);
    let cant = l.cantidad || 0;
    if (pRef > 0 && l.precio > 0) {
      const f = l.precio / pRef;
      if (f < 0.5 || f > 2) { cant *= f; (s._fs ||= []).push(f); }
    }
    const prev = out.find((x) => x.insumo === sid);
    if (prev) prev.cantidad += cant; else out.push({ insumo: sid, cantidad: cant, unidad_detalle: null, deRef: true });
  }
  if (hm > 0) { const mo = out.find((x) => x.cargo); if (mo) mo.herramienta_menor_pct = hm; }
  return out;
}

// 3a. Básicos (morteros y concretos)
const basicosMap = new Map();
for (const b of ref.basicos) {
  if (b.fuente === 'RICAURTE' && !/SIKA|ESTANCO/.test(norm(b.descripcion))) continue;
  const ex = tomarExistente(apuByName.get(norm(b.descripcion)) || []);
  const sid = nuevoApu({ ex, nombreOriginal: b.descripcion, unidad: b.unidad || 'M3', capitulo: 'BÁSICOS', origen: `REFERENTE ${b.fuente} (BÁSICO)`, lineas: [], refDirecto: b.directo });
  basicosMap.set(norm(b.descripcion), sid);
  basicosMap.set(norm(b.descripcion).replace(/[()]/g, ''), sid);
}
for (const b of ref.basicos) {
  const sid = basicosMap.get(norm(b.descripcion));
  if (sid) stApu.get(sid).lineas = lineasReferente(b.lineas, 'BÁSICOS', b.fuente, null);
}

// 3b. APU del Hospital Civil Ipiales (Obra civil + RCI)
for (const b of ref.apus) {
  let cap = capituloHospital(b.item);
  const kw = clasificarCapitulo(b.descripcion, cap || 'ESTRUCTURA');
  if (cap === null && /^1\.3\./.test(b.item)) cap = /VENTAN|PUERTA|VIDRIO/.test(norm(b.descripcion)) ? 'CARPINTERÍA' : /METALIC|\bIPE\b|PERFIL|A500|ESCALERA|DESCANSO|PASAMANO|BARANDA/.test(norm(b.descripcion)) ? 'ESTRUCTURA METÁLICA' : 'ESTRUCTURA EN CONCRETO';
  if (!cap || (['DRYWALL Y CIELOS', 'PISOS Y ENCHAPES', 'PRELIMINARES', 'CIMENTACIÓN', 'CARPINTERÍA'].includes(cap) && kw.regla.startsWith('nombre'))) cap = kw.capitulo;
  const cands = (apuByName.get(norm(b.descripcion)) || []).sort((x, y) => (/HOSP/.test(y.codigo) ? 1 : 0) - (/HOSP/.test(x.codigo) ? 1 : 0));
  const ex = tomarExistente(cands);
  nuevoApu({ ex, nombreOriginal: b.descripcion, unidad: b.unidad, capitulo: cap, origen: `REFERENTE ${b.fuente}`, lineas: lineasReferente(b.lineas, cap, 'HOSPITAL', basicosMap), refDirecto: b.directo });
}

// 3c. APU de Casa Ricaurte (tabla APU_ERP)
const ricItems = new Map();
ref.cuadros.RICAURTE.forEach((c) => c.items.forEach((it) => ricItems.set(it.codigo_erp ? it.codigo_erp.toUpperCase() : it.item, { ...it, capitulo: c.capitulo })));
const ricGrupos = new Map();
const ricItemDeCodigo = new Map();
ref.apu_erp_ricaurte.forEach((l) => {
  // Un mismo APU puede repetirse en varios ítems del presupuesto: se toma solo el primer ítem
  if (!ricItemDeCodigo.has(l.codigo_apu)) ricItemDeCodigo.set(l.codigo_apu, l.item);
  if (ricItemDeCodigo.get(l.codigo_apu) !== l.item) return;
  if (!ricGrupos.has(l.codigo_apu)) ricGrupos.set(l.codigo_apu, []);
  ricGrupos.get(l.codigo_apu).push(l);
});
for (const [codigo, ls] of ricGrupos) {
  const ex0 = apuByCode.get(codigo);
  if (ex0 && usados.has(ex0.id)) continue;
  const it = ricItems.get(codigo);
  const ex = tomarExistente(ex0 ? [ex0] : []);
  const nombreOriginal = it?.descripcion || ex?.nombre || codigo;
  const cap = clasificarCapitulo(nombreOriginal, ex?.categoria_apu || it?.capitulo || '').capitulo;
  const lineas = lineasReferente(ls.map((l) => ({
    descripcion: l.descripcion, unidad: l.unidad, cantidad: l.cantidad, precio: l.precio,
    bucket: /MANO/.test(l.tipo) ? 'mano_obra' : /EQUIPO/.test(l.tipo) ? 'equipo' : /TRANSP/.test(l.tipo) ? 'transporte' : 'material',
  })), cap, 'RICAURTE', basicosMap);
  nuevoApu({ ex, nombreOriginal, unidad: it?.unidad || ex?.unidad, capitulo: cap, origen: 'REFERENTE RICAURTE', lineas, refDirecto: it?.precio || null });
}

// 3c-bis. Presentaciones de venta (bulto, caja, galón…) detectadas por nombre y por los APU del referente
const tamanoNombre = (n) => {
  const N = norm(n);
  const caja = N.match(/CAJA\s?(?:X\s?)?(\d+)\s?MIL\b/);
  if (caja) return Number(caja[1]) * 1000;
  const m = N.match(/(?:X\s?)?(\d+(?:[.,]\d+)?)\s?(KG|KGS|GL|GLN|GAL|LT|LTS)\b/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
};
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const s of stIns.values()) {
  s.unidad_original = s.existe ? unidad(insumos.find((i) => i.id === s.sid)?.unidad) : null;
  const u = unidad(s.unidad);
  if (!['KG', 'LT', 'GAL', 'ML', 'M2'].includes(u)) continue;
  const fs = (s._fs || []).filter((f) => f < 0.5);
  const Sf = fs.length ? 1 / mediana(fs) : null;
  const Sn = tamanoNombre(s.nombre);
  let S = null;
  if (Sf && Sn && Math.abs(Sf - Sn) / Sn < 0.35) S = Sn;
  else if (Sf) S = Sf;
  else if (Sn && ['KG', 'LT', 'GAL'].includes(u)) S = Sn;
  if (!S || S < 1.5) continue;
  const N = norm(s.nombre);
  s.unidad_base = u;
  s.presentacion = Math.round(S * 1000) / 1000;
  s.unidad = u === 'KG' && /CEMENTO|\bCAL\b|ESTUCO|PEGA|MORTERO|YESO|MASILLA|BULTO|GRANITO|MARMOLINA/.test(N) ? 'BTO' : /CAJA/.test(N) ? 'CAJA' : /ROLLO/.test(N) ? 'ROLLO' : 'UND';
  if (s.existe && s.accion === 'SIN CAMBIO') s.accion = 'ACTUALIZAR';
}
/** Convierte una línea existente a la unidad final del insumo (evita conversiones implícitas del motor) */
function convertirLineaExistente(sid, cantidad, ud0) {
  const s = stIns.get(sid);
  if (!s) return { cantidad, unidad_detalle: ud0 };
  const orig = s.unidad_original || unidad(s.unidad);
  const U = unidad(s.unidad);
  const qOrig = cantidad * factorConversion(orig, ud0);
  let q = qOrig;
  if (orig !== U) {
    if (s.presentacion && orig === s.unidad_base) q = qOrig / s.presentacion;
    else q = qOrig * factorConversion(U, orig);
  }
  return { cantidad: q, unidad_detalle: U };
}

// 3d. APU existentes no cubiertos por referentes: depurar o eliminar
const CUADRILLA_LEGACY = /CUADRILLA|AYUDANTE|OFICIAL|MAESTRO|SUB-OFICIAL/i;
const restantes = apus.filter((a) => !usados.has(a.id));
// duplicados exactos y copias
const canon = new Map();
for (const a of restantes) {
  const k = norm(String(a.nombre).replace(/\(copia\)/ig, '')) + '|' + unidad(a.unidad);
  const tieneDet = (detByApu.get(a.id) || []).length > 0;
  if (!canon.has(k)) { canon.set(k, a); continue; }
  const c = canon.get(k);
  const cTiene = (detByApu.get(c.id) || []).length > 0;
  const [keep, drop] = (!cTiene && tieneDet) || (/copia/i.test(c.nombre) && !/copia/i.test(a.nombre)) ? [a, c] : [c, a];
  canon.set(k, keep);
  remapApu.set(drop.id, keep.id);
  eliminar.push({ id: drop.id, codigo: drop.codigo, nombre: drop.nombre, motivo: 'Duplicado', reemplazo: keep.codigo });
}
for (const a of restantes) {
  if (remapApu.has(a.id)) continue;
  usados.add(a.id);
  const dets = (detByApu.get(a.id) || []).slice().sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)));
  if (!dets.length) {
    if (enPresupuesto.has(a.id)) {
      nuevoApu({ ex: a, nombreOriginal: a.nombre, unidad: a.unidad, capitulo: clasificarCapitulo(a.nombre, a.categoria_apu).capitulo, origen: 'EXISTENTE (sin desglose, en presupuesto)', lineas: [] });
      stApu.get(a.id).accion = 'REVISAR';
    } else {
      eliminar.push({ id: a.id, codigo: a.codigo, nombre: a.nombre, motivo: 'Sin desglose ni referente' });
    }
    continue;
  }
  const cap = clasificarCapitulo(a.nombre, a.categoria_apu).capitulo;
  const vistos = new Set();
  const lineas = [];
  let horasMO = 0, lineasMO = 0, duplicadas = 0;
  for (const d of dets) {
    const insumoId = d.insumo_id ? (remapIns.get(d.insumo_id) || d.insumo_id) : null;
    const key = insumoId ? `i:${insumoId}` : d.cargo_id ? `c:${d.cargo_id}` : `h:${d.apu_hijo_id}`;
    if (vistos.has(key)) { duplicadas++; continue; }
    vistos.add(key);
    if (d.cargo_id) {
      const c = cargos.find((x) => x.id === d.cargo_id);
      if (c && (CUADRILLA_LEGACY.test(c.nombre) || /cuadrilla/i.test(c.categoria || ''))) {
        const u = norm(d.unidad_detalle || 'HR');
        const h = (Number(d.cantidad) || 0) * (u === 'DIA' ? 8 : 1);
        horasMO = Math.max(horasMO, h); lineasMO++;
        continue;
      }
      lineas.push({ cargo_id: d.cargo_id, cantidad: Number(d.cantidad) || 0, unidad_detalle: d.unidad_detalle, herramienta_menor_pct: Number(d.herramienta_menor_pct) || 0 });
    } else if (d.apu_hijo_id) {
      lineas.push({ hijoExistente: remapApu.get(d.apu_hijo_id) || d.apu_hijo_id, cantidad: Number(d.cantidad) || 0, unidad_detalle: d.unidad_detalle, desperdicio_pct: Number(d.desperdicio_pct) || 0 });
    } else {
      const cv = convertirLineaExistente(insumoId, Number(d.cantidad) || 0, d.unidad_detalle);
      lineas.push({ insumo: insumoId, cantidad: cv.cantidad, unidad_detalle: cv.unidad_detalle, desperdicio_pct: Number(d.desperdicio_pct) || 0 });
    }
  }
  if (horasMO > 0) lineas.push({ cargo: 'CUA-BAS', cantidad: horasMO, unidad_detalle: 'Hr', herramienta_menor_pct: 5 });
  const sid = nuevoApu({ ex: a, nombreOriginal: a.nombre, unidad: a.unidad, capitulo: cap, origen: 'EXISTENTE DEPURADO', lineas });
  Object.assign(stApu.get(sid), { accion: 'DEPURAR', lineas_duplicadas: duplicadas, lineas_mo_fusionadas: lineasMO });
}
// hijos que apuntan a APU eliminados sin reemplazo
const eliminadosIds = new Set(eliminar.map((e) => e.id));
for (const s of stApu.values()) {
  s.lineas = s.lineas.filter((l) => !(l.hijoExistente && eliminadosIds.has(l.hijoExistente) && !remapApu.has(l.hijoExistente)));
  s.lineas.forEach((l) => { if (l.hijoExistente) l.hijo = remapApu.get(l.hijoExistente) || l.hijoExistente; });
}

// 3d-bis. Precio por similitud para insumos en uso sin precio (nombre corto contenido en un insumo del referente)
const usadosNuevo = new Set([...stApu.values()].flatMap((s) => s.lineas.filter((l) => l.insumo).map((l) => l.insumo)));
const STOP = new Set(['PARA', 'CON', 'DEL', 'LOS', 'LAS', 'TIPO', 'UND', 'POR']);
const toks = (n) => norm(n).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
const conPrecio = [...stIns.values()].filter((p) => p._ref && p.precio_unitario > 0);
for (const s of stIns.values()) {
  if (!usadosNuevo.has(s.sid) || s.precio_unitario > 0) continue;
  const T = toks(s.nombre);
  if (!T.length) continue;
  const cands = conPrecio.filter((p) => (p.tipo === s.tipo) && unidad(p.unidad) === unidad(s.unidad) && (() => {
    const P = toks(p.nombre);
    return T.every((w) => P.some((x) => x === w || (w.length >= 4 && x.startsWith(w))));
  })()).sort((a, b) => a.nombre.length - b.nombre.length);
  if (cands.length) {
    Object.assign(s, { precio_unitario: cands[0].precio_unitario, precio_similar: cands[0].nombre, accion: 'ACTUALIZAR' });
  }
}
// Precios investigados (data/precios_override.json: { "<sid>": { "precio": n, "fuente": "..." } }) — en la unidad actual del insumo
const preciosOvPath = path.join(DATA, 'precios_override.json');
const preciosOv = fs.existsSync(preciosOvPath) ? JSON.parse(fs.readFileSync(preciosOvPath, 'utf8')) : {};
for (const s of stIns.values()) {
  const o = preciosOv[s.sid];
  if (o && Number(o.precio) > 0 && !s._ref) {
    Object.assign(s, { precio_unitario: Math.round(Number(o.precio)), precio_similar: `Investigado: ${o.fuente || 'mercado Pasto 2026'}`, accion: s.existe ? 'ACTUALIZAR' : 'CREAR' });
    if (o.nombre) s.nombre = o.nombre;
    if (o.unidad && unidad(o.unidad) !== unidad(s.unidad)) {
      // Cambio de unidad de venta: las líneas existentes ya consumen en esa unidad (ver fuente)
      s.unidad = unidad(o.unidad);
      for (const a of stApu.values()) for (const l of a.lineas) if (l.insumo === s.sid) l.unidad_detalle = s.unidad;
    }
  }
}

// 3d-ter. Nombres cortos repetidos dentro de un capítulo: se agrega el rasgo distintivo del texto original
const grupoNombre = new Map();
for (const s of stApu.values()) { const k = s.categoria_apu + '|' + norm(s.nombre); if (!grupoNombre.has(k)) grupoNombre.set(k, []); grupoNombre.get(k).push(s); }
for (const g of grupoNombre.values()) {
  if (g.length < 2 || g.some((s) => s.con_override)) continue;
  const palabras = g.map((s) => sentenceCase(s.nombre_anterior).split(/[\s,]+/));
  g.forEach((s, i) => {
    const base = new Set(norm(s.nombre).split(' '));
    const otras = new Set(palabras.filter((_, j) => j !== i).flat().map((w) => norm(w)));
    const dist = palabras[i].filter((w) => w.length > 2 && !base.has(norm(w)) && !otras.has(norm(w))).slice(0, 3);
    if (dist.length) s.nombre = `${s.nombre} ${dist.join(' ')}`.slice(0, 70).trim();
  });
}

// 3e. Códigos CC.NNN y rendimiento
const porCap = new Map();
for (const s of stApu.values()) { if (!porCap.has(s.categoria_apu)) porCap.set(s.categoria_apu, []); porCap.get(s.categoria_apu).push(s); }
for (const [cap, list] of porCap) {
  const cc = CAPITULO_POR_NOMBRE.get(cap)?.codigo || '99';
  list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  list.forEach((s, i) => { s.codigo = `${cc}.${String(i + 1).padStart(3, '0')}`; });
}
for (const s of stApu.values()) {
  const horas = s.lineas.filter((l) => l.cargo).reduce((t, l) => t + l.cantidad, 0);
  s.rendimiento = horas > 0 ? Math.min(99999, Math.round((8 / horas) * 10000) / 10000) : (Number(apuById.get(s.sid)?.rendimiento) || 1);
}

// ════════════════════════════════════════════════════════════
// 4. Costos nuevos con el motor único
// ════════════════════════════════════════════════════════════
const cargosLegacy = cargos.filter((c) => ![...stCargos.values()].some((s) => s.sid === c.id));
const ctxNuevo = crearContexto({
  config: stConfig,
  insumos: [...stIns.values()].map((i) => ({ id: i.sid, nombre: i.nombre, tipo: i.tipo, unidad: i.unidad, precio_unitario: i.precio_unitario })),
  cargos: [...cargosLegacy, ...[...stCargos.values()].map((c) => ({ id: c.sid, nombre: c.nombre, unidad: c.unidad, factor_smlv: c.factor_smlv, factor_multiplicador: c.factor_multiplicador }))],
  cargoDetalles: stCargoDet,
  apuDetalles: [...stApu.values()].flatMap((s) => s.lineas.map((l) => detalleDe(s.sid, l))),
});
function detalleDe(apuSid, l) {
  return {
    apu_id: apuSid,
    insumo_id: l.insumo || null,
    cargo_id: l.cargo ? cua(l.cargo).sid : (l.cargo_id || null),
    apu_hijo_id: l.hijo || null,
    cantidad: Math.round((l.cantidad || 0) * 10000) / 10000,
    unidad_detalle: l.deRef ? (stIns.get(l.insumo)?.unidad || null) : (l.unidad_detalle || null),
    desperdicio_pct: l.desperdicio_pct || 0,
    herramienta_menor_pct: l.herramienta_menor_pct || 0,
  };
}
for (const s of stApu.values()) {
  const c = costoAPU(ctxNuevo, s.sid);
  Object.assign(s, { costo_nuevo: Math.round(c.total), c_equipo: Math.round(c.equipo), c_material: Math.round(c.material), c_mo: Math.round(c.mano_obra), c_transporte: Math.round(c.transporte) });
  Object.assign(s, evaluarBanda(s.categoria_apu, s.unidad, s.costo_nuevo));
  if (s.costo_nuevo === 0 && s.accion !== 'REVISAR') s.estado = 'COSTO 0';
}

// 4a. Fusionar APU idénticos (mismo nombre, unidad y capítulo, costo ±2 %)
{
  const grupos = new Map();
  for (const s of stApu.values()) { const k = `${s.categoria_apu}|${s.unidad}|${norm(s.nombre)}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); }
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => (b.existe - a.existe));
    const keep = g[0];
    for (const d of g.slice(1)) {
      if (Math.abs(d.costo_nuevo - keep.costo_nuevo) > 0.02 * Math.max(1, keep.costo_nuevo)) continue;
      stApu.delete(d.sid);
      remapApu.set(d.sid, keep.sid);
      if (d.existe) eliminar.push({ id: d.sid, codigo: d.codigo_legacy, nombre: d.nombre, motivo: 'Duplicado (mismo nombre y costo)', reemplazo: keep.codigo });
    }
  }
  for (const s of stApu.values()) s.lineas.forEach((l) => { if (l.hijo && remapApu.has(l.hijo)) l.hijo = remapApu.get(l.hijo); });
  // recodificar tras la fusión
  const pc = new Map();
  for (const s of stApu.values()) { if (!pc.has(s.categoria_apu)) pc.set(s.categoria_apu, []); pc.get(s.categoria_apu).push(s); }
  porCap.clear();
  for (const [cap, list] of pc) {
    porCap.set(cap, list);
    const cc = CAPITULO_POR_NOMBRE.get(cap)?.codigo || '99';
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    list.forEach((s, i) => { s.codigo = `${cc}.${String(i + 1).padStart(3, '0')}`; });
  }
}

// 4b. Insumos a eliminar: sin uso, sin precio y sin referencias externas
const insEliminar = [];
for (const [dupId, canId] of remapIns) if (!refExterna.has(dupId)) insEliminar.push({ id: dupId, nombre: insumos.find((i) => i.id === dupId)?.nombre, motivo: 'Duplicado', reemplazo: stIns.get(canId)?.nombre });
for (const s of stIns.values()) {
  if (s.existe && !s._ref && !usadosNuevo.has(s.sid) && !(s.precio_unitario > 0) && !refExterna.has(s.sid)) {
    insEliminar.push({ id: s.sid, nombre: s.nombre, motivo: 'Sin uso y sin precio' });
    s.accion = 'ELIMINAR';
  } else if (s.existe && !s._ref && s.nombre !== s.nombre_anterior) s.accion = 'ACTUALIZAR';
}

// ════════════════════════════════════════════════════════════
// 5. Reporte y staging
// ════════════════════════════════════════════════════════════
const lista = [...stApu.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
const cuenta = (f) => lista.filter(f).length;
const resumen = {
  apu_final: lista.length, apu_creados: cuenta((s) => s.accion === 'CREAR'), apu_reconstruidos: cuenta((s) => s.accion === 'RECONSTRUIR'),
  apu_depurados: cuenta((s) => s.accion === 'DEPURAR'), apu_revisar: cuenta((s) => s.accion === 'REVISAR'), apu_eliminados: eliminar.length,
  lineas_duplicadas_quitadas: lista.reduce((t, s) => t + (s.lineas_duplicadas || 0), 0),
  apu_con_mo_fusionada: cuenta((s) => (s.lineas_mo_fusionadas || 0) > 1),
  estado_ok: cuenta((s) => s.estado === 'OK'), estado_alto: cuenta((s) => s.estado === 'ALTO'), estado_bajo: cuenta((s) => s.estado === 'BAJO'), costo_cero: cuenta((s) => s.estado === 'COSTO 0'),
  nombres_mayores_60: cuenta((s) => s.nombre.length > 60), sin_clasificar: 0,
  insumos_final: [...stIns.values()].filter((i) => i.accion !== 'ELIMINAR').length,
  insumos_creados: [...stIns.values()].filter((i) => i.accion === 'CREAR').length,
  insumos_actualizados: [...stIns.values()].filter((i) => i.accion === 'ACTUALIZAR').length,
  insumos_eliminados: insEliminar.length,
  insumos_sin_precio_en_uso: [...stIns.values()].filter((i) => usadosNuevo.has(i.sid) && !(i.precio_unitario > 0)).length,
  cotizaciones: [...stIns.values()].reduce((t, i) => t + i.cotizaciones.length, 0),
  capitulos: Object.fromEntries([...porCap].map(([k, v]) => [k, v.length])),
};
log('\n📊 Resumen:', JSON.stringify(resumen, null, 1));

// Impacto en los presupuestos de los proyectos (costo directo)
const [proyectos] = await Promise.all([safe('proyectos')]);
const costoNuevoDe = (apuId) => stApu.get(remapApu.get(apuId) || apuId)?.costo_nuevo ?? 0;
const impactoProyectos = proyectos.map((p) => {
  const its = pItems.filter((i) => i.proyecto_id === p.id);
  const antes = its.reduce((t, i) => t + (costoAntes.get(i.apu_id) || 0) * (Number(i.cantidad) || 0), 0);
  const despues = its.reduce((t, i) => t + costoNuevoDe(i.apu_id) * (Number(i.cantidad) || 0), 0);
  return { proyecto: p.nombre, items: its.length, costo_directo_antes: Math.round(antes), costo_directo_nuevo: Math.round(despues) };
});
log('🏗️ Impacto en proyectos:', JSON.stringify(impactoProyectos, null, 1));

fs.writeFileSync(path.join(DATA, 'catalogo_staging.json'), JSON.stringify({ generado: new Date().toISOString(), resumen, config: stConfig, cargos: [...stCargos.values()], cargoDetalle: stCargoDet, insumos: [...stIns.values()], insumosEliminar: insEliminar, apus: lista, apusEliminar: eliminar, remapApu: [...remapApu], remapIns: [...remapIns] }, null, 1));
fs.writeFileSync(path.join(DATA, 'nombres_revision.json'), JSON.stringify(lista.map((s) => ({ clave: s.clave_nombre, original: s.texto_original, nombre_anterior_erp: s.nombre_anterior, nombre: s.nombre, descripcion: s.descripcion, capitulo: s.categoria_apu, unidad: s.unidad })), null, 1));
// Insumos en uso que no vienen del referente (precio a revisar)
const usoEjemplo = new Map();
for (const a of lista) for (const l of a.lineas) if (l.insumo && !usoEjemplo.has(l.insumo)) usoEjemplo.set(l.insumo, { apu: a.nombre, apu_unidad: a.unidad, cantidad: Math.round(l.cantidad * 10000) / 10000, unidad_linea: l.unidad_detalle });
fs.writeFileSync(path.join(DATA, 'insumos_revision.json'), JSON.stringify([...stIns.values()].filter((s) => usadosNuevo.has(s.sid) && !s._ref).map((s) => ({
  sid: s.sid, nombre: s.nombre, tipo: s.tipo, unidad: s.unidad, precio_actual: s.precio_unitario, precio_por_similitud: s.precio_similar || null,
  usos: lista.filter((a) => a.lineas.some((l) => l.insumo === s.sid)).length, ejemplo: usoEjemplo.get(s.sid),
})), null, 1));

await escribirReporte();
log(`\n📄 Reporte: ${path.join(DATA, 'reporte_depuracion_apu.xlsx')}`);

if (!APPLY) { log('\nℹ️ DRY-RUN: no se escribió nada en Supabase. Use --apply para aplicar.'); process.exit(0); }
await aplicar();

// ════════════════════════════════════════════════════════════
async function escribirReporte() {
  const wb = new ExcelJS.Workbook();
  const head = (ws, cols) => {
    ws.columns = cols.map(([header, key, width]) => ({ header, key, width }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: { row: 1, column: cols.length } };
  };
  const money = '#,##0';
  const r = wb.addWorksheet('RESUMEN');
  r.columns = [{ width: 40 }, { width: 18 }];
  r.addRow(['DEPURACIÓN CATÁLOGO KALARTI — ' + new Date().toLocaleString('es-CO')]).font = { bold: true, size: 13 };
  r.addRow([APPLY ? 'MODO: APLICADO' : 'MODO: DRY-RUN (sin cambios en base de datos)']);
  r.addRow([]);
  Object.entries(resumen).filter(([, v]) => typeof v !== 'object').forEach(([k, v]) => r.addRow([k.replace(/_/g, ' '), v]));
  r.addRow([]); r.addRow(['APU POR CAPÍTULO']).font = { bold: true };
  CAPITULOS_APU.forEach((c) => r.addRow([`${c.codigo} ${c.nombre}`, resumen.capitulos[c.nombre] || 0]));
  r.addRow([]); r.addRow(['IMPACTO EN PROYECTOS (costo directo)', 'Antes', 'Nuevo']).font = { bold: true };
  r.getColumn(3).width = 18;
  impactoProyectos.forEach((p) => { const row = r.addRow([`${p.proyecto} (${p.items} ítems)`, p.costo_directo_antes, p.costo_directo_nuevo]); row.getCell(2).numFmt = money; row.getCell(3).numFmt = money; });

  const a = wb.addWorksheet('APU');
  head(a, [['Código', 'codigo', 9], ['Código anterior', 'codigo_legacy', 14], ['Nombre nuevo', 'nombre', 50], ['Nombre anterior', 'nombre_anterior', 60], ['Capítulo', 'categoria_apu', 22], ['Cat. anterior', 'categoria_anterior', 22], ['Und', 'unidad', 6], ['Costo anterior', 'costo_anterior', 14], ['Costo nuevo', 'costo_nuevo', 14], ['Equipo', 'c_equipo', 11], ['Material', 'c_material', 12], ['M. obra', 'c_mo', 11], ['Otros', 'c_transporte', 10], ['Ref. directo', 'ref_directo', 13], ['Banda', 'banda', 20], ['Estado', 'estado', 10], ['Acción', 'accion', 13], ['Origen', 'origen', 28], ['Líneas dup.', 'lineas_duplicadas', 8], ['Líneas MO fusionadas', 'lineas_mo_fusionadas', 8], ['Rend. (und/día)', 'rendimiento', 10]]);
  lista.forEach((s) => {
    const row = a.addRow({ ...s, ref_directo: s.ref_directo ? Math.round(s.ref_directo) : null });
    const col = { ALTO: 'FFFECACA', BAJO: 'FFFEF3C7', 'COSTO 0': 'FFFCA5A5', OK: 'FFDCFCE7' }[s.estado];
    if (col) row.getCell('estado').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col } };
  });
  ['costo_anterior', 'costo_nuevo', 'c_equipo', 'c_material', 'c_mo', 'c_transporte', 'ref_directo'].forEach((k) => { a.getColumn(k).numFmt = money; });

  const e = wb.addWorksheet('APU ELIMINADOS');
  head(e, [['Código', 'codigo', 14], ['Nombre', 'nombre', 70], ['Motivo', 'motivo', 26], ['Reemplazo', 'reemplazo', 14]]);
  eliminar.forEach((x) => e.addRow(x));

  const i = wb.addWorksheet('INSUMOS');
  head(i, [['Código', 'codigo', 12], ['Nombre', 'nombre', 50], ['Nombre anterior', 'nombre_anterior', 40], ['Tipo', 'tipo', 11], ['Und', 'unidad', 7], ['Categoría', 'categoria', 22], ['Precio anterior', 'precio_anterior', 13], ['Mejor compra', 'mejor', 13], ['Precio Kalarti', 'precio_unitario', 13], ['N.º cotiz.', 'ncot', 8], ['Presentación', 'presentacion', 10], ['Und. consumo', 'unidad_base', 8], ['Precio por similitud con', 'precio_similar', 40], ['Acción', 'accion', 12], ['En uso', 'uso', 7]]);
  [...stIns.values()].sort((x, y) => String(x.categoria).localeCompare(String(y.categoria)) || x.nombre.localeCompare(y.nombre)).forEach((s) => {
    const vals = s.cotizaciones.map((c) => c.valor).filter((v) => v > 0);
    i.addRow({ ...s, mejor: vals.length ? Math.min(...vals) : null, ncot: s.cotizaciones.length, uso: usadosNuevo.has(s.sid) ? 'Sí' : '' });
  });
  ['precio_anterior', 'mejor', 'precio_unitario'].forEach((k) => { i.getColumn(k).numFmt = money; });

  const ie = wb.addWorksheet('INSUMOS ELIMINADOS');
  head(ie, [['Nombre', 'nombre', 60], ['Motivo', 'motivo', 22], ['Reemplazo', 'reemplazo', 50]]);
  insEliminar.forEach((x) => ie.addRow(x));

  const m = wb.addWorksheet('MANO DE OBRA');
  m.columns = [{ width: 38 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 18 }];
  m.addRow([`SMLV 2026: ${SMLV.toLocaleString('es-CO')} · Horas/mes: 240 · Fuente: F PRESTACIONAL referente`]).font = { bold: true };
  m.addRow(['Cargo', 'N.º SMLV', 'Factor', 'Mensual integral', 'Jornal', 'H-H']).font = { bold: true };
  CARGOS_MO.forEach((c) => { const men = SMLV * c.smlv * c.factor; m.addRow([c.nombre, c.smlv, c.factor, Math.round(men), Math.round(men / 30), Math.round(men / 240)]); });
  m.addRow([]); m.addRow(['Cuadrilla', 'Integrantes', '', 'Valor hora', 'Valor hora ref.', 'Diferencia']).font = { bold: true };
  CUADRILLAS_MO.forEach((q) => { const c = stCargos.get(q.codigo); m.addRow([q.nombre, q.integrantes.map(([h, n]) => `${n} ${CARGOS_MO.find((x) => x.codigo === h).nombre}`).join(' + '), '', Math.round(c.valor_hora), c.valor_hora_ref ? Math.round(c.valor_hora_ref) : '', c.valor_hora_ref ? Math.round(c.valor_hora - c.valor_hora_ref) : '']); });
  [4, 5, 6].forEach((k) => { m.getColumn(k).numFmt = money; });

  const d = wb.addWorksheet('POSIBLES DUPLICADOS');
  head(d, [['Capítulo', 'cap', 22], ['Und', 'und', 6], ['APU 1', 'a', 50], ['APU 2', 'b', 50], ['Similitud', 'sim', 10]]);
  const tok = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
  for (const list of porCap.values()) {
    for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
      if (list[x].unidad !== list[y].unidad) continue;
      const A = tok(list[x].nombre), B = tok(list[y].nombre);
      const inter = [...A].filter((w) => B.has(w)).length; const sim = inter / (A.size + B.size - inter || 1);
      if (sim >= 0.75) d.addRow({ cap: list[x].categoria_apu, und: list[x].unidad, a: `${list[x].codigo} ${list[x].nombre}`, b: `${list[y].codigo} ${list[y].nombre}`, sim: Math.round(sim * 100) / 100 });
    }
  }
  await wb.xlsx.writeFile(path.join(DATA, 'reporte_depuracion_apu.xlsx'));
}

// ════════════════════════════════════════════════════════════
async function aplicar() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bk = path.join(DATA, `backup-${ts}.json`);
  fs.writeFileSync(bk, JSON.stringify({ apus, det, insumos, cargos, cargoDet, config, pItems }));
  log(`\n💾 Backup: ${bk}`);
  const uid = sb.userId;
  const chk = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const lotes = async (rows, n, fn) => { for (let i = 0; i < rows.length; i += n) await fn(rows.slice(i, i + n)); };

  // config
  for (const c of stConfig) chk(await sb.from('global_config').upsert({ ...c, user_id: uid }, { onConflict: 'clave' }), 'global_config');
  // cargos
  const idCargo = new Map();
  for (const c of stCargos.values()) {
    const row = { codigo: c.codigo, nombre: c.nombre, unidad: c.unidad, factor_smlv: c.factor_smlv, factor_multiplicador: c.factor_multiplicador, categoria: c.categoria, precio_unitario: c.precio_unitario, recargo_cop: 0, recargo_pct: 0 };
    const res = c.existe ? chk(await sb.from('cargos').update(row).eq('id', c.sid).select().single(), 'cargos upd') : chk(await sb.from('cargos').insert({ ...row, user_id: uid }).select().single(), 'cargos ins');
    idCargo.set(c.sid, res.id);
  }
  const padres = [...new Set(stCargoDet.map((d) => idCargo.get(d.cargo_padre_id)))];
  chk(await sb.from('cargo_detalle').delete().in('cargo_padre_id', padres), 'cargo_detalle del');
  chk(await sb.from('cargo_detalle').insert(stCargoDet.map((d) => ({ cargo_padre_id: idCargo.get(d.cargo_padre_id), cargo_hijo_id: idCargo.get(d.cargo_hijo_id), cantidad: d.cantidad, user_id: uid }))), 'cargo_detalle ins');
  log('✅ Mano de obra y cuadrillas');

  // categorías de insumo
  const catId = new Map(categorias.map((c) => [norm(c.nombre), c.id]));
  for (const nombre of new Set([...stIns.values()].map((i) => i.categoria).filter(Boolean))) {
    if (!catId.has(norm(nombre))) { const r = chk(await sb.from('categorias').insert({ nombre, user_id: uid }).select().single(), 'categorias'); catId.set(norm(nombre), r.id); }
  }
  // insumos
  const idIns = new Map();
  const insRow = (s) => ({ codigo: s.codigo, nombre: s.nombre, tipo: s.tipo, unidad: s.unidad, precio_unitario: s.precio_unitario, categoria: s.categoria || null, categoria_id: s.categoria ? catId.get(norm(s.categoria)) : (s.categoria_id || null), notas: s.notas || null });
  const actualizar = [...stIns.values()].filter((s) => s.existe && s.accion === 'ACTUALIZAR');
  await lotes(actualizar, 200, async (b) => { chk(await sb.from('insumos').upsert(b.map((s) => ({ id: s.sid, ...insRow(s), user_id: s.user_id || uid }))), 'insumos upd'); });
  [...stIns.values()].filter((s) => s.existe).forEach((s) => idIns.set(s.sid, s.sid));
  const crear = [...stIns.values()].filter((s) => !s.existe);
  await lotes(crear, 200, async (b) => { const r = chk(await sb.from('insumos').insert(b.map((s) => ({ ...insRow(s), user_id: uid }))).select('id, codigo'), 'insumos ins'); r.forEach((x) => { const s = b.find((y) => y.codigo === x.codigo); idIns.set(s.sid, x.id); }); });
  log(`✅ Insumos: ${actualizar.length} actualizados, ${crear.length} creados`);

  // APU
  const { error: errLegacy } = await sb.from('apu').select('codigo_legacy').limit(1);
  const conLegacy = !errLegacy;
  const idApu = new Map();
  const apuRow = (s) => ({ codigo: s.codigo, nombre: s.nombre, descripcion: s.descripcion || null, unidad: s.unidad, categoria_apu: s.categoria_apu, tipo: s.tipo || 'BASICO', rendimiento: s.rendimiento, ...(conLegacy ? { codigo_legacy: s.codigo_legacy } : {}) });
  // Paso 1: códigos temporales para evitar colisiones de UNIQUE durante la recodificación
  const existentes = lista.filter((s) => s.existe);
  await lotes(existentes, 200, async (b) => { chk(await sb.from('apu').upsert(b.map((s) => ({ id: s.sid, ...apuRow(s), codigo: `TMP-${s.sid.slice(0, 8)}-${s.codigo}`, user_id: s.user_id || uid }))), 'apu tmp'); });
  await lotes(existentes, 200, async (b) => { chk(await sb.from('apu').upsert(b.map((s) => ({ id: s.sid, ...apuRow(s), user_id: s.user_id || uid }))), 'apu upd'); });
  existentes.forEach((s) => idApu.set(s.sid, s.sid));
  const nuevos = lista.filter((s) => !s.existe);
  await lotes(nuevos, 200, async (b) => { const r = chk(await sb.from('apu').insert(b.map((s) => ({ ...apuRow(s), user_id: uid }))).select('id, codigo'), 'apu ins'); r.forEach((x) => idApu.set(b.find((y) => y.codigo === x.codigo).sid, x.id)); });
  log(`✅ APU: ${existentes.length} actualizados, ${nuevos.length} creados`);

  // Detalle: reemplazo completo para los APU del catálogo
  const apuIds = lista.map((s) => idApu.get(s.sid));
  await lotes(apuIds, 100, async (b) => { chk(await sb.from('apu_detalle').delete().in('apu_id', b), 'apu_detalle del'); });
  const filas = lista.flatMap((s) => s.lineas.map((l) => {
    const d = detalleDe(s.sid, l);
    return { ...d, apu_id: idApu.get(s.sid), insumo_id: d.insumo_id ? idIns.get(d.insumo_id) || d.insumo_id : null, cargo_id: d.cargo_id ? idCargo.get(d.cargo_id) || d.cargo_id : null, apu_hijo_id: d.apu_hijo_id ? idApu.get(d.apu_hijo_id) || d.apu_hijo_id : null, user_id: uid };
  }));
  await lotes(filas, 500, async (b) => { chk(await sb.from('apu_detalle').insert(b), 'apu_detalle ins'); });
  log(`✅ Detalle APU: ${filas.length} líneas`);

  // Presupuestos: reapuntar duplicados eliminados
  for (const [viejo, nuevo] of remapApu) {
    if (!/^[0-9a-f-]{36}$/i.test(viejo)) continue; // duplicados nuevos: nunca existieron en la base
    chk(await sb.from('presupuesto_items').update({ apu_id: idApu.get(nuevo) || nuevo }).eq('apu_id', viejo), 'presupuesto remap');
  }
  // Eliminar APU (primero su detalle y referencias como hijo)
  const elim = eliminar.map((e) => e.id).filter((id) => !enPresupuesto.has(id) || remapApu.has(id));
  await lotes(elim, 100, async (b) => {
    chk(await sb.from('apu_detalle').delete().in('apu_id', b), 'det elim');
    chk(await sb.from('apu_detalle').delete().in('apu_hijo_id', b), 'det hijo elim');
    chk(await sb.from('apu').delete().in('id', b), 'apu elim');
  });
  log(`✅ APU eliminados: ${elim.length}`);
  // Insumos eliminados
  const insElim = insEliminar.map((x) => x.id);
  await lotes(insElim, 100, async (b) => { chk(await sb.from('apu_detalle').delete().in('insumo_id', b), 'det ins elim'); chk(await sb.from('insumos').delete().in('id', b), 'insumos elim'); });
  log(`✅ Insumos eliminados: ${insElim.length}`);

  // Cotizaciones internas
  const { error: errCot } = await sb.from('insumo_cotizaciones').select('id').limit(1);
  if (errCot) { log('⚠️ Tabla insumo_cotizaciones no existe: ejecute migration-fase19-catalogo.sql y vuelva a aplicar.'); return; }
  const provId = new Map(proveedores.map((p) => [norm(p.nombre), p.id]));
  const cots = [...stIns.values()].flatMap((s) => s.cotizaciones.map((c) => ({ insumo_id: idIns.get(s.sid), proveedor_id: provId.get(norm(c.proveedor)) || null, proveedor_nombre: c.proveedor, precio_compra: c.valor, referencia: c.referencia || null, vigente: true, user_id: uid }))).filter((c) => c.insumo_id);
  const ids = [...new Set(cots.map((c) => c.insumo_id))];
  await lotes(ids, 200, async (b) => { chk(await sb.from('insumo_cotizaciones').delete().in('insumo_id', b), 'cot del'); });
  await lotes(cots, 500, async (b) => { chk(await sb.from('insumo_cotizaciones').insert(b), 'cot ins'); });
  log(`✅ Cotizaciones internas: ${cots.length}`);
  log('\n🎉 Catálogo aplicado.');
}
