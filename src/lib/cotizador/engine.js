/**
 * Motor puro del Cotizador: presupuesto (AIU) y cronograma (Gantt).
 * Sin dependencias de React ni Supabase → reutilizable en cliente y servidor.
 */
import { AIU, CUADRILLAS_DEFAULT, CUADRILLA_GENERAL } from './config';
import { ordenCapitulo } from '../catalogo-taxonomia';

/**
 * @param {Array} items   [{ apu_id, cantidad }]
 * @param {Map|Object} catalogo  apu_id -> { precio_unitario, ... }
 */
export function calcularPresupuesto(items, catalogo) {
  const get = (id) => (catalogo instanceof Map ? catalogo.get(id) : catalogo[id]);
  const costoDirecto = items.reduce((sum, it) => {
    const c = get(it.apu_id);
    return sum + (Number(c?.precio_unitario) || 0) * (Number(it.cantidad) || 0);
  }, 0);
  const admin = costoDirecto * AIU.admin / 100;
  const imprev = costoDirecto * AIU.imprev / 100;
  const utilidad = costoDirecto * AIU.utilidad / 100;
  const iva = utilidad * AIU.ivaSobreUtilidad / 100;
  const total = costoDirecto + admin + imprev + utilidad + iva;
  return { costoDirecto, admin, imprev, utilidad, iva, total };
}

/**
 * Agrupa ítems por capítulo (categoría del APU) con subtotales.
 * Capítulos en el orden oficial (CAPITULOS_APU) y numeración secuencial: capítulo `1`, ítems `1.1`, `1.2`…
 */
export function agruparPorCapitulo(items, catalogo) {
  const get = (id) => (catalogo instanceof Map ? catalogo.get(id) : catalogo[id]);
  const caps = new Map();
  items.forEach(it => {
    const c = get(it.apu_id);
    const cap = c?.capitulo || c?.categoria || 'GENERAL';
    if (!caps.has(cap)) caps.set(cap, { capitulo: cap, items: [], subtotal: 0 });
    const g = caps.get(cap);
    const valor = (Number(c?.precio_unitario) || 0) * (Number(it.cantidad) || 0);
    g.items.push({ ...it, apu: c, valor });
    g.subtotal += valor;
  });
  const grupos = Array.from(caps.values());
  // Orden estable: capítulo oficial y, a igualdad, orden de aparición
  grupos.forEach((g, i) => { g._pos = i; });
  grupos.sort((a, b) => (ordenCapitulo(a.capitulo) - ordenCapitulo(b.capitulo)) || (a._pos - b._pos));
  grupos.forEach((g, i) => {
    delete g._pos;
    g.numero = String(i + 1);
    g.items.forEach((it, j) => { it.numero = `${i + 1}.${j + 1}`; });
  });
  return grupos;
}

/* ─── Calendario laboral (lunes a sábado, igual que el ERP) ─── */
function addWorkingDays(startIso, offset) {
  const d = new Date(`${startIso}T12:00:00`);
  // si arranca en domingo, mover a lunes
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  let n = Math.max(0, Math.floor(offset));
  while (n > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) n--;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Genera el cronograma.
 * - Cada ítem se asigna a la cuadrilla Kalarti de su categoría.
 * - Una cuadrilla ejecuta sus ítems en secuencia; `numCuadrillas` equipos en paralelo dividen la duración.
 * - Las fases (orden de cuadrilla) son fin-a-inicio; cuadrillas del mismo orden van en paralelo.
 *
 * @returns {{ tareas: Array, duracionDias: number, fechaFin: string, porCuadrilla: Array }}
 */
export function calcularCronograma(items, catalogo, { fechaInicio, numCuadrillas = 1, cuadrillas = CUADRILLAS_DEFAULT } = {}) {
  const get = (id) => (catalogo instanceof Map ? catalogo.get(id) : catalogo[id]);
  const start = fechaInicio || new Date().toISOString().split('T')[0];
  const crews = Math.max(1, Number(numCuadrillas) || 1);
  const byCode = new Map([...cuadrillas, CUADRILLA_GENERAL].map(c => [c.codigo, c]));

  // Agrupar por cuadrilla
  const grupos = new Map();
  items.forEach((it, idx) => {
    const apu = get(it.apu_id);
    if (!apu || !(Number(it.cantidad) > 0)) return;
    const cq = byCode.get(apu.cuadrilla_codigo) || CUADRILLA_GENERAL;
    if (!grupos.has(cq.codigo)) grupos.set(cq.codigo, { cuadrilla: cq, items: [] });
    grupos.get(cq.codigo).items.push({ ...it, apu, idx });
  });

  // Fases ordenadas
  const ordenes = [...new Set([...grupos.values()].map(g => g.cuadrilla.orden))].sort((a, b) => a - b);
  const tareas = [];
  const porCuadrilla = [];
  let faseInicio = 0;

  ordenes.forEach(orden => {
    let faseFin = faseInicio;
    [...grupos.values()].filter(g => g.cuadrilla.orden === orden).forEach(g => {
      let cursor = faseInicio;
      g.items.forEach(it => {
        const rend = Math.max(0.01, Number(it.apu.rendimiento) || 1);
        const dur = Number(it.cantidad) / (rend * crews);
        const startOff = cursor;
        cursor += dur;
        const sDay = Math.floor(startOff);
        const eDay = Math.max(sDay, Math.ceil(cursor) - 1);
        tareas.push({
          apu_id: it.apu_id,
          idx: it.idx,
          nombre: it.apu.nombre_publico || it.apu.nombre,
          cuadrilla: g.cuadrilla,
          startDay: sDay,
          endDay: eDay,
          dias: eDay - sDay + 1,
          fecha_inicio: addWorkingDays(start, sDay),
          fecha_fin: addWorkingDays(start, eDay),
        });
      });
      porCuadrilla.push({
        cuadrilla: g.cuadrilla,
        startDay: Math.floor(faseInicio),
        endDay: Math.max(Math.floor(faseInicio), Math.ceil(cursor) - 1),
        items: g.items.length,
      });
      faseFin = Math.max(faseFin, cursor);
    });
    faseInicio = faseFin;
  });

  tareas.sort((a, b) => a.startDay - b.startDay || a.idx - b.idx);
  const duracionDias = Math.ceil(faseInicio);
  return {
    tareas,
    porCuadrilla,
    duracionDias,
    fechaInicio: addWorkingDays(start, 0),
    fechaFin: duracionDias > 0 ? addWorkingDays(start, duracionDias - 1) : start,
  };
}

export { addWorkingDays };
