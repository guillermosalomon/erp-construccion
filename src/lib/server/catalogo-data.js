/**
 * Carga de datos del catálogo APU para route handlers (servidor).
 * Lectura con service role si existe; si no, anon key (RLS de lectura pública).
 * Nunca lee tablas internas de proveedores (insumo_cotizaciones).
 */
import { createClient } from '@supabase/supabase-js';
import { crearContexto } from '@/lib/apu-engine';

/** Cliente de solo lectura: service role si existe (servidor), si no la anon key. */
export function crearClienteLectura() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Lee una tabla completa paginando de a 1000 filas. Tolerante a errores (devuelve lo leído). */
export async function leerTodo(sb, tabla, columnas = '*') {
  const PAGE = 1000;
  let out = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(tabla).select(columnas).range(from, from + PAGE - 1);
    if (error) {
      console.warn(`Catálogo: no se pudo leer ${tabla}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    out = out.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

/**
 * Carga APUs, composición, insumos, cargos/cuadrillas y configuración, y arma el contexto del motor.
 * @returns {Promise<{apus:Array, insumos:Array, cargos:Array, cargoDetalles:Array, config:Array, ctx:object}|null>}
 */
export async function cargarDatosCatalogo(sb) {
  if (!sb) return null;
  const [apus, apuDetalles, insumos, cargos, cargoDetalles, config, ofertas] = await Promise.all([
    leerTodo(sb, 'apu', '*'),
    leerTodo(sb, 'apu_detalle'),
    leerTodo(sb, 'insumos'),
    leerTodo(sb, 'cargos'),
    leerTodo(sb, 'cargo_detalle'),
    leerTodo(sb, 'global_config', 'clave, valor'),
    leerTodo(sb, 'mk_ofertas'),
  ]);
  const apuNombre = new Map(apus.map((a) => [a.id, a.nombre]));
  const ctx = crearContexto({
    insumos,
    cargos,
    cargoDetalles,
    apuDetalles: apuDetalles.map((d) => (d.apu_hijo_id ? { ...d, _nombre_hijo: apuNombre.get(d.apu_hijo_id) } : d)),
    config,
    ofertas: ofertas.filter((o) => o.activo),
  });
  return { apus, insumos, cargos, cargoDetalles, config, ctx };
}

/** Convierte las líneas del motor en componentes públicos (sin códigos ni datos de proveedor) */
export function aComponentes(lineas = []) {
  return lineas.map((l) => ({
    bucket: l.bucket,
    tipo: l.tipo,
    nombre: l.nombre,
    unidad: l.unidad,
    cantidad: l.cantidad,
    precio_unitario: Math.round(l.precio),
    parcial: Math.round(l.parcial),
    ...(l.sub ? { subComponentes: aComponentes(l.sub) } : {}),
  }));
}
