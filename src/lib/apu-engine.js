/**
 * Motor único de costos APU — Kalarti
 * Usado por: ERP (StoreContext), API catálogo del Cotizador y API de exportación.
 * Función pura: sin React ni Supabase.
 *
 * Modelo (igual al referente PRESUPUESTO_H CIVIL IPIALES):
 *   - Mano de obra = cuadrilla (cargo con integrantes) × horas. Valor hora = Σ (SMLV × n_salarios × factor prestacional / HORAS_MES) × cantidad.
 *   - Herramienta menor = % sobre la mano de obra (se reporta como EQUIPO).
 *   - Materiales a precio almacén Kalarti (insumos.precio_unitario).
 *   - Transporte y equipos como insumos tipo TRANSPORTE / EQUIPO.
 */

export const SMLV_2026 = 1750905;
export const HORAS_MES_DEFAULT = 240; // 30 días × 8 h (jornal integral = mensual / 30)
export const HORAS_DIA_DEFAULT = 8;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Clasifica un tipo de insumo en el bucket de presentación del APU */
export function bucketInsumo(tipo) {
  const t = norm(tipo).replace(/[\s_]+/g, '');
  if (t.startsWith('equipo') || t.startsWith('herramienta')) return 'equipo';
  if (t.startsWith('transporte') || t === 'otros') return 'transporte';
  if (t.startsWith('manodeobra') || t === 'mo') return 'mano_obra';
  return 'material';
}

/** Conversión de unidad de empaque → unidad del detalle */
export function factorConversion(unidadInsumo, unidadDetalle) {
  const ui = norm(unidadInsumo);
  const ud = norm(unidadDetalle);
  if (!ud || ui === ud) return 1;
  if ((ui === 'bto' || ui === 'bulto') && ud === 'kg') return 1 / 50;
  if ((ui === 'gal' || ui === 'gln' || ui === 'galon') && (ud === 'lt' || ud === 'lts' || ud === 'l')) return 1 / 3.785;
  if ((ui === 'kg') && (ud === 'bto' || ud === 'bulto')) return 50;
  return 1;
}

/**
 * Crea el contexto indexado para cálculos rápidos.
 * @param {{insumos?:Array, cargos?:Array, cargoDetalles?:Array, apuDetalles?:Array, config?:Array, ofertas?:Array}} data
 */
export function crearContexto(data = {}) {
  const cfg = (k) => (data.config || []).find((c) => c.clave === k)?.valor;
  const ctx = {
    smlv: parseFloat(cfg('SMLV')) || SMLV_2026,
    horasMes: parseFloat(cfg('HORAS_MES')) || HORAS_MES_DEFAULT,
    horasDia: parseFloat(cfg('HORAS_DIA')) || HORAS_DIA_DEFAULT,
    insumos: new Map((data.insumos || []).map((i) => [i.id, i])),
    cargos: new Map((data.cargos || []).map((c) => [c.id, c])),
    integrantes: new Map(),
    detalles: new Map(),
    ofertas: new Map(),
    _cargoMemo: new Map(),
    _apuMemo: new Map(),
  };
  (data.cargoDetalles || []).forEach((d) => {
    if (!ctx.integrantes.has(d.cargo_padre_id)) ctx.integrantes.set(d.cargo_padre_id, []);
    ctx.integrantes.get(d.cargo_padre_id).push(d);
  });
  (data.apuDetalles || []).forEach((d) => {
    if (!ctx.detalles.has(d.apu_id)) ctx.detalles.set(d.apu_id, []);
    ctx.detalles.get(d.apu_id).push(d);
  });
  (data.ofertas || []).forEach((o) => {
    if (o.insumo_id && o.activo !== false && Number(o.precio_venta) > 0 && !ctx.ofertas.has(o.insumo_id)) {
      ctx.ofertas.set(o.insumo_id, Number(o.precio_venta));
    }
  });
  return ctx;
}

/**
 * Datos de un cargo o cuadrilla.
 * @returns {{precio:number, precioHora:number, factor:number, factorMultiplicador:number}}
 */
export function datosCargo(ctx, cargoId, visited = new Set()) {
  if (ctx._cargoMemo.has(cargoId)) return ctx._cargoMemo.get(cargoId);
  const vacio = { precio: 0, precioHora: 0, factor: 1, factorMultiplicador: 1 };
  if (visited.has(cargoId)) return vacio;
  visited.add(cargoId);

  const cargo = ctx.cargos.get(cargoId);
  const integrantes = ctx.integrantes.get(cargoId) || [];
  const factorMult = Number(cargo?.factor_multiplicador) || 1;
  const { smlv, horasMes, horasDia } = ctx;

  let res;
  if (integrantes.length === 0) {
    if (!cargo) return vacio;
    const totalFactor = (Number(cargo.factor_smlv) || 1) * factorMult;
    const mensual = smlv * totalFactor;
    const precioHora = mensual / horasMes + (Number(cargo.recargo_cop) || 0) / horasMes;
    res = { precio: Math.round(escalar(precioHora, cargo.unidad, ctx)), precioHora, factor: totalFactor, factorMultiplicador: factorMult };
  } else {
    let costoHora = 0;
    let sumaFactores = 0;
    integrantes.forEach((d) => {
      const sub = datosCargo(ctx, d.cargo_hijo_id, new Set(visited));
      const f = d.factor_smlv ? Number(d.factor_smlv) : sub.factor;
      costoHora += ((smlv * f) / horasMes) * (Number(d.cantidad) || 0);
      sumaFactores += f;
    });
    const base = costoHora * factorMult;
    let precioHora = base + (Number(cargo?.recargo_cop) || 0) / horasMes;
    const pct = Number(cargo?.recargo_pct) || 0;
    if (pct > 0) precioHora += base * (pct / 100);
    res = { precio: Math.round(escalar(precioHora, cargo?.unidad, ctx)), precioHora, factor: sumaFactores * factorMult, factorMultiplicador: factorMult };
  }
  ctx._cargoMemo.set(cargoId, res);
  return res;
  function escalar(pHora, unidad) {
    const u = norm(unidad || 'mes');
    if (u === 'dia') return pHora * horasDia;
    if (u === 'mes') return pHora * horasMes;
    return pHora;
  }
}

/** Precio de un insumo (precio almacén Kalarti; fallback a oferta marketplace) */
export function precioInsumo(ctx, insumoId) {
  const ins = ctx.insumos.get(insumoId);
  return Number(ins?.precio_unitario) || ctx.ofertas.get(insumoId) || 0;
}

/**
 * Costo unitario de un APU con desglose por bucket.
 * @returns {{total:number, equipo:number, material:number, mano_obra:number, transporte:number, lineas:Array}}
 */
export function costoAPU(ctx, apuId, visited = new Set()) {
  if (!visited.size && ctx._apuMemo.has(apuId)) return ctx._apuMemo.get(apuId);
  const r = { total: 0, equipo: 0, material: 0, mano_obra: 0, transporte: 0, lineas: [] };
  if (visited.has(apuId)) return r;
  visited.add(apuId);

  for (const d of ctx.detalles.get(apuId) || []) {
    const cant = (Number(d.cantidad) || 0) * (1 + (Number(d.desperdicio_pct) || 0) / 100);
    if (d.insumo_id) {
      const ins = ctx.insumos.get(d.insumo_id);
      const precio = precioInsumo(ctx, d.insumo_id) * factorConversion(ins?.unidad, d.unidad_detalle);
      const parcial = cant * precio;
      const b = bucketInsumo(ins?.tipo);
      r[b] += parcial;
      r.lineas.push({ bucket: b, tipo: ins?.tipo || 'MATERIAL', id: d.insumo_id, nombre: ins?.nombre || 'Insumo', unidad: d.unidad_detalle || ins?.unidad || 'UND', cantidad: cant, precio, parcial });
    } else if (d.cargo_id) {
      const cargo = ctx.cargos.get(d.cargo_id);
      const { precioHora } = datosCargo(ctx, d.cargo_id);
      const ud = norm(d.unidad_detalle || 'hr');
      const precio = ud === 'dia' ? precioHora * ctx.horasDia : precioHora;
      const parcial = cant * precio;
      r.mano_obra += parcial;
      r.lineas.push({ bucket: 'mano_obra', tipo: 'MANO DE OBRA', id: d.cargo_id, nombre: cargo?.nombre || 'Cuadrilla', unidad: ud === 'dia' ? 'DIA' : 'HORA', cantidad: cant, precio, parcial });
      const hm = Number(d.herramienta_menor_pct) || 0;
      if (hm > 0) {
        const vhm = parcial * (hm / 100);
        r.equipo += vhm;
        r.lineas.push({ bucket: 'equipo', tipo: 'EQUIPO', id: null, nombre: `Herramienta menor ${hm}% MO`, unidad: '%', cantidad: hm / 100, precio: parcial, parcial: vhm });
      }
    } else if (d.apu_hijo_id) {
      const sub = costoAPU(ctx, d.apu_hijo_id, new Set(visited));
      ['equipo', 'material', 'mano_obra', 'transporte'].forEach((k) => { r[k] += cant * sub[k]; });
      r.lineas.push({ bucket: 'material', tipo: 'BASICO', id: d.apu_hijo_id, nombre: d._nombre_hijo || 'Básico', unidad: d.unidad_detalle || 'UND', cantidad: cant, precio: sub.total, parcial: cant * sub.total, sub: sub.lineas });
    }
  }
  r.total = r.equipo + r.material + r.mano_obra + r.transporte;
  if (visited.size === 1) ctx._apuMemo.set(apuId, r);
  return r;
}

/** Solo mano de obra de un APU */
export function costoMO(ctx, apuId) {
  return costoAPU(ctx, apuId).mano_obra;
}
