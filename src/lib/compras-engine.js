/**
 * Motor de Abastecimiento de Obra — Red logística Kalarti (Fase 20).
 * Sin bodega central: cada obra tiene su bodega y el stock de la red se reasigna entre obras.
 *
 * Funciones puras (sin React ni Supabase):
 *   - requerimientosDesdePresupuesto: explosión de materiales por fecha desde el presupuesto programado.
 *   - resolverAbastecimiento: traslado desde otra obra vs. compra nueva al mejor proveedor.
 *   - fechaPedido, mensajeWhatsApp, linkWhatsApp.
 *   - calcularStockBodegas: réplica local de la vista v_stock_bodega.
 *   - movimientosRecepcion / eventosAgendaOrden: efectos de una orden (inventario y agenda).
 */

import { costoAPU, factorConversion } from './apu-engine.js';

export const FLETE_DEFAULT = { mismo_municipio: 60000, otro_municipio: 180000 };

export const ESTADOS_ORDEN = ['BORRADOR', 'PENDIENTE_CONTACTO', 'CONFIRMADO_CON_PROVEEDOR', 'EN_RUTA', 'RECIBIDO', 'CANCELADO'];

export const ESTADO_ORDEN_LABEL = {
  BORRADOR: 'Borrador',
  PENDIENTE_CONTACTO: 'Pendiente de contacto',
  CONFIRMADO_CON_PROVEEDOR: 'Confirmado',
  EN_RUTA: 'En ruta',
  RECIBIDO: 'Recibido',
  CANCELADO: 'Cancelado',
};

const ENTRADAS = ['ENTRADA', 'TRASLADO_ENTRADA'];
const CERRADAS = ['RECIBIDO', 'ENTREGADO', 'CANCELADO'];

/** Normaliza cadenas para comparación flexible (municipios, nombres) */
export function norm(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const mismoMunicipio = (a, b) => !!norm(a) && norm(a) === norm(b);
const num = (v) => Number(v) || 0;
const redondear = (v, d = 4) => Math.round(num(v) * 10 ** d) / 10 ** d;

/** Lee FLETE_TRASLADO desde global_config ([{clave, valor}]) */
export function leerFlete(config = []) {
  const raw = (config || []).find((c) => c.clave === 'FLETE_TRASLADO')?.valor;
  if (!raw) return { ...FLETE_DEFAULT };
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      mismo_municipio: num(v?.mismo_municipio) || FLETE_DEFAULT.mismo_municipio,
      otro_municipio: num(v?.otro_municipio) || FLETE_DEFAULT.otro_municipio,
    };
  } catch {
    return { ...FLETE_DEFAULT };
  }
}

/** Estimado de flete según municipios de origen y destino */
export function estimarFlete(municipioOrigen, municipioDestino, flete = FLETE_DEFAULT) {
  const f = { ...FLETE_DEFAULT, ...(flete || {}) };
  return mismoMunicipio(municipioOrigen, municipioDestino) ? num(f.mismo_municipio) : num(f.otro_municipio);
}

/* ─── Fechas ─── */

const aFecha = (s) => {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const isoDia = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Fecha en que se debe hacer el pedido: fecha de necesidad − tiempo de entrega (días hábiles, sin domingos).
 * @returns {string|null} YYYY-MM-DD
 */
export function fechaPedido(fechaNecesidad, tiempoEntregaDias = 0) {
  const d = aFecha(fechaNecesidad);
  if (!d) return null;
  let restantes = Math.max(0, Math.ceil(num(tiempoEntregaDias)));
  while (restantes > 0) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0) restantes--;
  }
  if (d.getDay() === 0) d.setDate(d.getDate() - 1); // nunca pedir en domingo
  return isoDia(d);
}

/* ─── 1. Requerimientos desde el presupuesto ─── */

/**
 * Explota los APU (con básicos recursivos) × cantidad de cada ítem con fecha_inicio,
 * solo líneas de material, agrupadas por insumo y fecha de necesidad.
 * @param {{items:Array, ctx:object, apus?:Array}} p
 * @returns {Array<{key, insumo_id, nombre, unidad, tipo, categoria, cantidad, fecha_necesidad, precio_referencia, actividades:Array}>}
 */
export function requerimientosDesdePresupuesto({ items = [], ctx, apus = [] } = {}) {
  if (!ctx) return [];
  const apuMap = new Map((apus || []).map((a) => [a.id, a]));
  const grupos = new Map();

  const agregar = (linea, mult, item, fecha) => {
    const ins = ctx.insumos.get(linea.id);
    const factor = factorConversion(ins?.unidad, linea.unidad);
    const cantidad = num(linea.cantidad) * mult * factor;
    if (cantidad <= 0) return;
    const key = `${linea.id}__${fecha}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        key,
        insumo_id: linea.id,
        nombre: ins?.nombre || linea.nombre,
        unidad: ins?.unidad || linea.unidad || 'UND',
        tipo: ins?.tipo || 'MATERIAL',
        categoria: ins?.categoria || null,
        cantidad: 0,
        fecha_necesidad: fecha,
        precio_referencia: num(ins?.precio_unitario),
        actividades: [],
      });
    }
    const g = grupos.get(key);
    g.cantidad += cantidad;
    const act = g.actividades.find((a) => a.presupuesto_item_id === item.id);
    if (act) act.cantidad += cantidad;
    else {
      g.actividades.push({
        presupuesto_item_id: item.id,
        nombre: item.descripcion || item.nombre || apuMap.get(item.apu_id)?.nombre || 'Actividad',
        cantidad,
      });
    }
  };

  const recorrer = (lineas, mult, item, fecha, profundidad = 0) => {
    if (profundidad > 10) return;
    for (const l of lineas || []) {
      if (l.tipo === 'BASICO') {
        recorrer(l.sub, mult * num(l.cantidad), item, fecha, profundidad + 1);
      } else if (l.bucket === 'material' && l.id) {
        agregar(l, mult, item, fecha);
      }
    }
  };

  for (const item of items || []) {
    if (!item?.fecha_inicio || !item.apu_id) continue;
    const cant = num(item.cantidad);
    if (cant <= 0) continue;
    const r = costoAPU(ctx, item.apu_id);
    recorrer(r.lineas, cant, item, String(item.fecha_inicio).slice(0, 10));
  }

  return Array.from(grupos.values())
    .map((g) => ({ ...g, cantidad: redondear(g.cantidad) }))
    .sort((a, b) => (a.fecha_necesidad < b.fecha_necesidad ? -1 : a.fecha_necesidad > b.fecha_necesidad ? 1 : a.nombre.localeCompare(b.nombre)));
}

/* ─── 2. Traslado vs. compra ─── */

/**
 * Mejor cotización vigente para un insumo, priorizando stock y cobertura del municipio destino.
 */
export function mejorCotizacion({ insumoId, cantidad = 0, municipioDestino, cotizaciones = [], proveedores = [] }) {
  const provMap = new Map((proveedores || []).map((p) => [p.id, p]));
  const candidatas = (cotizaciones || [])
    .filter((c) => c.insumo_id === insumoId && c.vigente !== false && num(c.precio_compra) > 0)
    .map((c) => {
      const prov = provMap.get(c.proveedor_id) || null;
      const cobertura = Array.isArray(prov?.cobertura_municipios) ? prov.cobertura_municipios.filter(Boolean) : [];
      const cubre = !municipioDestino || cobertura.length === 0 || cobertura.some((m) => mismoMunicipio(m, municipioDestino));
      const conStock = c.stock === null || c.stock === undefined || num(c.stock) > 0;
      return { c, prov, cubre, conStock };
    });
  if (candidatas.length === 0) return null;

  const niveles = [
    candidatas.filter((x) => x.conStock && x.cubre),
    candidatas.filter((x) => x.conStock),
    candidatas.filter((x) => x.cubre),
    candidatas,
  ];
  const pool = niveles.find((n) => n.length > 0);
  // Desempate: menor precio; a igual precio, quien tenga stock suficiente
  pool.sort((a, b) => {
    const d = num(a.c.precio_compra) - num(b.c.precio_compra);
    if (d !== 0) return d;
    const sa = a.c.stock === null || a.c.stock === undefined ? 0 : num(a.c.stock) >= cantidad ? -1 : 1;
    const sb = b.c.stock === null || b.c.stock === undefined ? 0 : num(b.c.stock) >= cantidad ? -1 : 1;
    return sa - sb;
  });
  const { c, prov, cubre, conStock } = pool[0];
  return {
    cotizacion_id: c.id,
    proveedor_id: c.proveedor_id || null,
    proveedor_nombre: prov?.nombre || c.proveedor_nombre || 'Proveedor',
    precio: num(c.precio_compra),
    stock: c.stock ?? null,
    tiempo_entrega_dias: num(c.tiempo_entrega_dias ?? prov?.tiempo_entrega_dias ?? 2),
    whatsapp: prov?.whatsapp || prov?.telefono || null,
    contacto: prov?.contacto || null,
    ciudad: prov?.ciudad || null,
    cubre_municipio: cubre,
    con_stock: conStock,
    alternativas: candidatas.length,
  };
}

/**
 * Recomienda cómo abastecer un requerimiento en la bodega destino.
 * Prioridad 1: disponible en otras obras (traslado) si cuesta igual o menos que comprar.
 * @returns {{recomendacion:'TRASLADO'|'COMPRA'|'SIN_FUENTE', traslado:object|null, compra:object|null, faltante:object|null, comparativo:object}}
 */
export function resolverAbastecimiento({
  requerimiento,
  bodegaDestino,
  stock = [],
  cotizaciones = [],
  proveedores = [],
  flete = FLETE_DEFAULT,
} = {}) {
  const cantidad = num(requerimiento?.cantidad);
  const insumoId = requerimiento?.insumo_id;
  const municipioDestino = bodegaDestino?.municipio || null;

  // Opción traslado: la mejor obra de origen (no la destino) con disponible > 0
  const origenes = (stock || [])
    .filter((s) => s.insumo_id === insumoId && s.bodega_id !== bodegaDestino?.id && num(s.disponible) > 0)
    .map((s) => {
      const cant = Math.min(num(s.disponible), cantidad);
      const costoMaterial = num(s.costo_unitario) * cant;
      const fleteEst = estimarFlete(s.municipio, municipioDestino, flete);
      return {
        bodega_origen_id: s.bodega_id,
        proyecto_origen_id: s.proyecto_id || null,
        municipio: s.municipio || null,
        disponible: num(s.disponible),
        cantidad: redondear(cant),
        costo_unitario: num(s.costo_unitario),
        costo_material: Math.round(costoMaterial),
        flete: fleteEst,
        total: Math.round(costoMaterial + fleteEst),
        cubre_total: cant >= cantidad,
      };
    })
    .sort((a, b) => (b.cubre_total - a.cubre_total) || (a.total / (a.cantidad || 1)) - (b.total / (b.cantidad || 1)));
  const traslado = origenes[0] || null;

  // Opción compra: mejor proveedor (fallback a precio de referencia del insumo)
  const cot = mejorCotizacion({ insumoId, cantidad, municipioDestino, cotizaciones, proveedores });
  const precioCompra = cot?.precio || num(requerimiento?.precio_referencia);
  const armarCompra = (cant) => (precioCompra > 0 || cot
    ? {
        ...(cot || { proveedor_id: null, proveedor_nombre: 'Sin cotización', tiempo_entrega_dias: 2, whatsapp: null }),
        precio: precioCompra,
        sin_cotizacion: !cot,
        cantidad: redondear(cant),
        total: Math.round(precioCompra * cant),
      }
    : null);
  const compra = armarCompra(cantidad);

  // Comparativo sobre la misma cantidad que cubre el traslado
  let recomendacion = 'SIN_FUENTE';
  let comparativo = { cantidad, traslado: null, compra: compra?.total ?? null, ahorro: 0 };
  let faltante = null;
  if (traslado) {
    const compraMismaCant = Math.round(precioCompra * traslado.cantidad);
    const sinCompra = !compra || precioCompra <= 0;
    comparativo = {
      cantidad: traslado.cantidad,
      traslado: traslado.total,
      compra: sinCompra ? null : compraMismaCant,
      ahorro: sinCompra ? 0 : compraMismaCant - traslado.total,
    };
    if (sinCompra || traslado.total <= compraMismaCant) {
      recomendacion = 'TRASLADO';
      const resto = redondear(cantidad - traslado.cantidad);
      if (resto > 0) faltante = { cantidad: resto, compra: armarCompra(resto) };
    } else {
      recomendacion = 'COMPRA';
    }
  } else if (compra) {
    recomendacion = 'COMPRA';
  }

  return { recomendacion, traslado, compra, faltante, comparativo };
}

/* ─── 3. WhatsApp ─── */

const fmtCant = (v) => {
  const n = num(v);
  return Number.isInteger(n) ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};

/**
 * "Hola [Proveedor], requiero despachar [X und producto] a la dirección [dirección, municipio]. Confírmame disponibilidad. OC [numero]."
 * @param {{proveedor:string, items?:Array<{cantidad,unidad,nombre}>, cantidad?, unidad?, producto?, direccion?, municipio?, numeroOrden?}} p
 */
export function mensajeWhatsApp({ proveedor, items, cantidad, unidad, producto, direccion, municipio, numeroOrden } = {}) {
  const lista = (items && items.length ? items : [{ cantidad, unidad, nombre: producto }])
    .map((i) => `${fmtCant(i.cantidad)} ${i.unidad || 'und'} ${i.nombre || ''}`.trim())
    .join(', ');
  const destino = [direccion, municipio].filter(Boolean).join(', ') || 'la obra';
  const oc = numeroOrden ? ` OC ${numeroOrden}.` : '';
  return `Hola ${proveedor || ''}, requiero despachar ${lista} a la dirección ${destino}. Confírmame disponibilidad.${oc}`.replace(/\s+,/g, ',').replace(/ {2,}/g, ' ');
}

/** https://wa.me/57<dígitos>?text=... (null si no hay teléfono) */
export function linkWhatsApp(phone, text = '') {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('57') && digits.length === 12) digits = digits.slice(2);
  return `https://wa.me/57${digits}?text=${encodeURIComponent(text)}`;
}

/* ─── 4. Stock por bodega (réplica de v_stock_bodega) ─── */

/**
 * @returns {Array<{bodega_id, proyecto_id, municipio, insumo_id, insumo, unidad, existente, comprometido, disponible, costo_unitario}>}
 */
export function calcularStockBodegas({ inventario = [], ordenes = [], insumos = [], bodegas = [] } = {}) {
  const insMap = new Map((insumos || []).map((i) => [i.id, i]));
  const bodMap = new Map((bodegas || []).map((b) => [b.id, b]));
  const acc = new Map();
  for (const t of inventario || []) {
    if (!t?.bodega_id || !t.insumo_id) continue;
    const key = `${t.bodega_id}__${t.insumo_id}`;
    if (!acc.has(key)) acc.set(key, { bodega_id: t.bodega_id, insumo_id: t.insumo_id, existente: 0, cantEntradas: 0, valorEntradas: 0 });
    const a = acc.get(key);
    const cant = num(t.cantidad);
    if (ENTRADAS.includes(String(t.tipo))) {
      a.existente += cant;
      a.cantEntradas += cant;
      const cu = t.costo_unitario !== null && t.costo_unitario !== undefined && t.costo_unitario !== ''
        ? num(t.costo_unitario)
        : cant ? num(t.costo_real) / cant : 0;
      a.valorEntradas += cant * cu;
    } else {
      a.existente -= cant;
    }
  }
  const comp = new Map();
  for (const oc of ordenes || []) {
    if (oc?.tipo !== 'TRASLADO' || CERRADAS.includes(oc.estado) || !oc.bodega_origen_id) continue;
    for (const it of oc.items || []) {
      if (!it?.insumo_id) continue;
      const key = `${oc.bodega_origen_id}__${it.insumo_id}`;
      comp.set(key, (comp.get(key) || 0) + num(it.cantidad));
    }
  }
  return Array.from(acc.entries()).map(([key, a]) => {
    const ins = insMap.get(a.insumo_id);
    const bod = bodMap.get(a.bodega_id);
    const comprometido = comp.get(key) || 0;
    const promedio = a.cantEntradas > 0 ? a.valorEntradas / a.cantEntradas : 0;
    return {
      bodega_id: a.bodega_id,
      proyecto_id: bod?.proyecto_id || null,
      municipio: bod?.municipio || null,
      insumo_id: a.insumo_id,
      insumo: ins?.nombre || 'Insumo',
      unidad: ins?.unidad || 'UND',
      existente: redondear(a.existente),
      comprometido: redondear(comprometido),
      disponible: redondear(a.existente - comprometido),
      costo_unitario: promedio || num(ins?.precio_unitario),
    };
  });
}

/* ─── 5. Efectos de una orden ─── */

/** Número de orden legible: OC-AAMMDD-XXXX / TR-AAMMDD-XXXX */
/**
 * Material ya consumido (imputado a partidas) por insumo en una bodega de obra.
 * Cuenta como abastecido: lo instalado cubrió su requerimiento aunque ya no esté en existencias.
 * @returns {Map<string, number>} insumo_id → cantidad consumida
 */
export function consumosPorInsumo({ inventario = [], bodegaId } = {}) {
  const out = new Map();
  if (!bodegaId) return out;
  (inventario || []).forEach((t) => {
    if (t.bodega_id !== bodegaId || String(t.tipo) !== 'CONSUMO' || !t.insumo_id) return;
    out.set(t.insumo_id, (out.get(t.insumo_id) || 0) + Math.abs(Number(t.cantidad) || 0));
  });
  return out;
}

export function generarNumeroOrden(prefijo = 'OC') {
  const d = new Date();
  const fecha = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefijo}-${fecha}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Movimientos de inventario al recibir una orden.
 * Compra → ENTRADA en destino al precio de compra.
 * Traslado → TRASLADO_SALIDA en origen (100 % del costo original) + TRASLADO_ENTRADA en destino al mismo costo, con traslado_ref compartido.
 * El flete queda en la orden (costo_transporte), no en el costo del material.
 */
export function movimientosRecepcion(orden, { trasladoRef = null, newId = () => crypto.randomUUID() } = {}) {
  if (!orden) return [];
  const items = (orden.items || []).filter((i) => i?.insumo_id && num(i.cantidad) > 0);
  const numero = orden.numero_orden || '';
  if (orden.tipo === 'TRASLADO') {
    const ref = trasladoRef || newId();
    return items.flatMap((i) => [
      {
        id: newId(), bodega_id: orden.bodega_origen_id, insumo_id: i.insumo_id, tipo: 'TRASLADO_SALIDA',
        cantidad: num(i.cantidad), costo_unitario: num(i.precio), costo_real: Math.round(num(i.precio) * num(i.cantidad)),
        orden_compra_id: orden.id, traslado_ref: ref, origen: 'TRASLADO',
        motivo: `Traslado ${numero} hacia otra obra`,
      },
      {
        id: newId(), bodega_id: orden.bodega_destino_id, insumo_id: i.insumo_id, tipo: 'TRASLADO_ENTRADA',
        cantidad: num(i.cantidad), costo_unitario: num(i.precio), costo_real: Math.round(num(i.precio) * num(i.cantidad)),
        orden_compra_id: orden.id, traslado_ref: ref, origen: 'TRASLADO',
        motivo: `Traslado ${numero} recibido`,
      },
    ]);
  }
  return items.map((i) => ({
    id: newId(), bodega_id: orden.bodega_destino_id, insumo_id: i.insumo_id, tipo: 'ENTRADA',
    cantidad: num(i.cantidad), costo_unitario: num(i.precio), costo_real: Math.round(num(i.precio) * num(i.cantidad)),
    orden_compra_id: orden.id, origen: 'COMPRA', distribuidor: orden.proveedor_nombre || null,
    motivo: `Recepción ${numero}`,
  }));
}

/**
 * Eventos de agenda (ámbito OBRA) para una orden.
 * Compra → LLAMAR_PROVEEDOR (fecha de pedido) + RECEPCION (fecha de necesidad).
 * Traslado → TRASLADO_RETIRO (obra origen) + TRASLADO_RECEPCION (obra destino).
 */
export function eventosAgendaOrden(orden, { bodegas = [], newId = () => crypto.randomUUID() } = {}) {
  if (!orden) return [];
  const bod = (id) => (bodegas || []).find((b) => b.id === id) || null;
  const destino = bod(orden.bodega_destino_id);
  const resumen = (orden.items || []).map((i) => `${fmtCant(i.cantidad)} ${i.unidad || ''} ${i.nombre || ''}`.trim()).join(', ');
  const base = {
    ambito: 'OBRA',
    orden_compra_id: orden.id,
    relacion_id: orden.id,
    estado: 'pendiente',
    prioridad: 'alta',
    datos: { numero_orden: orden.numero_orden, tipo_orden: orden.tipo },
  };
  if (orden.tipo === 'TRASLADO') {
    const origen = bod(orden.bodega_origen_id);
    return [
      {
        ...base, id: newId(), tipo: 'TRASLADO_RETIRO', proyecto_id: origen?.proyecto_id || null, bodega_id: orden.bodega_origen_id,
        titulo: `Retiro por traslado ${orden.numero_orden}`,
        descripcion: `Entregar ${resumen} para ${destino?.nombre || 'otra obra'}.`,
        fecha_programada: orden.fecha_programada, direccion: origen?.direccion || origen?.municipio || null,
        contacto_nombre: orden.transportador || null,
      },
      {
        ...base, id: newId(), tipo: 'TRASLADO_RECEPCION', proyecto_id: orden.proyecto_id || destino?.proyecto_id || null, bodega_id: orden.bodega_destino_id,
        titulo: `Recepción de traslado ${orden.numero_orden}`,
        descripcion: `Recibir ${resumen} desde ${origen?.nombre || 'otra obra'}.`,
        fecha_programada: orden.fecha_entrega_esperada || orden.fecha_programada, direccion: orden.direccion_entrega || null,
        contacto_nombre: orden.transportador || null,
      },
    ];
  }
  return [
    {
      ...base, id: newId(), tipo: 'LLAMAR_PROVEEDOR', proyecto_id: orden.proyecto_id || null, bodega_id: orden.bodega_destino_id,
      proveedor_id: orden.proveedor_id || null,
      titulo: `Pedir a ${orden.proveedor_nombre} (${orden.numero_orden})`,
      descripcion: `Confirmar despacho de ${resumen}.`,
      fecha_programada: orden.fecha_programada, contacto_nombre: orden.proveedor_nombre, contacto_telefono: orden.contacto_whatsapp || null,
      direccion: orden.direccion_entrega || null,
    },
    {
      ...base, id: newId(), tipo: 'RECEPCION', proyecto_id: orden.proyecto_id || null, bodega_id: orden.bodega_destino_id,
      proveedor_id: orden.proveedor_id || null,
      titulo: `Recepción ${orden.numero_orden} — ${orden.proveedor_nombre}`,
      descripcion: `Recibir ${resumen} en obra.`,
      fecha_programada: orden.fecha_entrega_esperada || orden.fecha_programada, contacto_nombre: orden.proveedor_nombre,
      contacto_telefono: orden.contacto_whatsapp || null, direccion: orden.direccion_entrega || null,
    },
  ];
}
