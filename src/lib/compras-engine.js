/**
 * Motor de Compras Inteligentes y Programación de Órdenes a Proveedores (Fase 18).
 * Ruteo automático al proveedor más económico con fallback por stock y programación por cronograma.
 */

import materialesReferente from './cotizador/materiales_referente.json';

/**
 * Normaliza cadenas para comparación flexible
 */
function norm(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca las mejores cotizaciones y selecciona el proveedor más barato con fallback por stock
 */
export function cotizarInsumoConFallback(insumoNombre, { stockFiltro = null, proveedorExcluido = null } = {}) {
  const nInsumo = norm(insumoNombre);
  if (!nInsumo) return null;

  // Buscar coincidencia en el catálogo de materiales referente
  const mat = materialesReferente.find(m => {
    const nM = norm(m.nombre);
    return nM === nInsumo || nM.includes(nInsumo) || nInsumo.includes(nM);
  });

  if (!mat || !mat.cotizaciones || mat.cotizaciones.length === 0) {
    return {
      nombre: insumoNombre,
      proveedor_seleccionado: 'Ferretería Local (Pasto)',
      precio_compra: 0,
      alternativas: [],
      es_fallback: false
    };
  }

  // Ordenar cotizaciones de menor a mayor precio
  const ordenadas = [...mat.cotizaciones]
    .filter(c => c.valor > 0)
    .sort((a, b) => a.valor - b.valor);

  if (ordenadas.length === 0) {
    return {
      nombre: mat.nombre,
      proveedor_seleccionado: mat.proveedor_mas_barato || 'Comercio Local',
      precio_compra: mat.menor_precio || mat.precio_unitario || 0,
      alternativas: [],
      es_fallback: false
    };
  }

  // Filtrar proveedores excluidos (por ejemplo, si el usuario marca "sin stock")
  let elegida = ordenadas[0];
  let esFallback = false;

  if (proveedorExcluido && ordenadas.length > 1) {
    const alternativa = ordenadas.find(c => norm(c.proveedor) !== norm(proveedorExcluido));
    if (alternativa) {
      elegida = alternativa;
      esFallback = true;
    }
  }

  return {
    nombre: mat.nombre,
    categoria: mat.categoria,
    unidad: mat.unidad,
    proveedor_seleccionado: elegida.proveedor,
    precio_compra: elegida.valor,
    enlace_cotizacion: elegida.link || null,
    alternativas: ordenadas,
    es_fallback: esFallback,
  };
}

/**
 * Genera Órdenes de Compra Automáticas agrupadas por Proveedor y Fecha de Cronograma
 */
export function generarOrdenesCompraProgramadas({
  presupuestoItems = [],
  cronograma = null,
  catalogoMap = {},
  proyectoId = null,
  tiendaId = null,
  puntoVentaId = null,
  fechaBase = new Date().toISOString().split('T')[0],
}) {
  const ordenesPorProveedorYFecha = new Map();

  presupuestoItems.forEach((it, idx) => {
    const apu = catalogoMap[it.apu_id] || {};
    const cantObra = Number(it.cantidad) || 1;
    
    // Obtener fecha programada para esta actividad desde el cronograma
    let fechaActividad = fechaBase;
    if (cronograma && cronograma.tareas && cronograma.tareas[idx]) {
      fechaActividad = cronograma.tareas[idx].fecha_inicio || fechaBase;
    }

    const comps = apu.componentes || [];
    
    comps.forEach(c => {
      // Cotizar el material con el proveedor más económico
      const cot = cotizarInsumoConFallback(c.nombre);
      const provNombre = cot?.proveedor_seleccionado || 'Proveedor General';
      const precioCompra = cot?.precio_compra || c.precio_unitario || 0;
      const cantTotal = Number(c.cantidad) * cantObra;
      const subtotal = Math.round(cantTotal * precioCompra);

      const key = `${provNombre}__${fechaActividad}`;

      if (!ordenesPorProveedorYFecha.has(key)) {
        ordenesPorProveedorYFecha.set(key, {
          id: crypto.randomUUID(),
          numero_orden: `OC-${Math.floor(100000 + Math.random() * 900000)}`,
          proveedor_nombre: provNombre,
          fecha_programada: fechaActividad,
          fecha_entrega_esperada: fechaActividad,
          proyecto_id: proyectoId,
          tienda_id: tiendaId,
          punto_venta_id: puntoVentaId,
          estado: 'pendiente',
          items: [],
          total: 0,
          notas: `Compra automática generada para actividad: ${apu.nombre || 'Obra'}`,
        });
      }

      const orden = ordenesPorProveedorYFecha.get(key);
      orden.items.push({
        insumo_nombre: c.nombre,
        unidad: c.unidad,
        cantidad: cantTotal,
        precio_compra: precioCompra,
        total: subtotal,
      });
      orden.total += subtotal;
    });
  });

  return Array.from(ordenesPorProveedorYFecha.values());
}
