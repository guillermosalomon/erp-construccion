/**
 * Motor de Precios de Mercado — Kalarti ERP
 * 
 * Recalcula precios de insumos basado en ofertas reales del marketplace.
 * Genera proyecciones a 3, 6 meses y 1, 4 años.
 */

/**
 * Recalcula precios de mercado para un insumo específico
 * @param {string} insumoId - ID del insumo
 * @param {Array} ofertas - Todas las ofertas activas
 * @param {string} ciudadConstructor - Ciudad del constructor para "más cercano"
 * @returns {object} Precios calculados
 */
export function calcularPrecioMercado(insumoId, ofertas, ciudadConstructor = '', marca = '') {
  const ofertasActivas = ofertas.filter(o =>
    o.insumo_id === insumoId && o.activo !== false && o.publicado_marketplace && (!marca || o.marca === marca)
  );

  if (ofertasActivas.length === 0) return null;

  const precios = ofertasActivas.map(o => Number(o.precio_venta));

  // Precio promedio del sector
  const promedio = precios.reduce((s, p) => s + p, 0) / precios.length;

  // Precio más bajo
  const masBAjo = Math.min(...precios);

  // Precio más alto (para rango)
  const masAlto = Math.max(...precios);

  // Precio más cercano (por ciudad)
  const mismaCiudad = ofertasActivas.filter(o =>
    (o.ciudad || '').toLowerCase() === ciudadConstructor.toLowerCase()
  );
  const masCercano = mismaCiudad.length > 0
    ? mismaCiudad.reduce((s, o) => s + Number(o.precio_venta), 0) / mismaCiudad.length
    : promedio;

  return {
    precio_mercado: Math.round(promedio),
    precio_mas_bajo: Math.round(masBAjo),
    precio_mas_alto: Math.round(masAlto),
    precio_mas_cercano: Math.round(masCercano),
    num_ofertas: ofertasActivas.length,
    ofertas_ciudad: mismaCiudad.length,
  };
}

/**
 * Calcula el % de diferencia entre precio manual y precio de mercado
 * @param {number} precioManual - Precio actual del insumo
 * @param {number} precioMercado - Precio promedio del mercado
 * @returns {object} { porcentaje, direccion, clase }
 */
export function calcularDiferencia(precioManual, precioMercado) {
  if (!precioManual || !precioMercado) return { porcentaje: 0, direccion: 'igual', clase: 'neutral' };

  const diff = ((precioMercado - precioManual) / precioManual) * 100;
  const porcentaje = Math.round(diff * 10) / 10; // 1 decimal

  return {
    porcentaje,
    direccion: porcentaje > 0 ? 'arriba' : porcentaje < 0 ? 'abajo' : 'igual',
    clase: Math.abs(porcentaje) > 10 ? 'alto' : Math.abs(porcentaje) > 5 ? 'medio' : 'bajo',
    icono: porcentaje > 5 ? '📈' : porcentaje < -5 ? '📉' : '➡️',
  };
}

/**
 * Proyección de precios a futuro basada en tendencia histórica
 * Usa una tasa de inflación base + variación del sector
 * @param {number} precioActual - Precio actual
 * @param {number} inflacionAnual - Tasa de inflación anual (decimal, ej: 0.06 para 6%)
 * @returns {object} Proyecciones
 */
export function proyectarPrecios(precioActual, inflacionAnual = 0.06) {
  if (!precioActual) return null;

  const tasaMensual = Math.pow(1 + inflacionAnual, 1 / 12) - 1;

  return {
    actual: Math.round(precioActual),
    meses_3: Math.round(precioActual * Math.pow(1 + tasaMensual, 3)),
    meses_6: Math.round(precioActual * Math.pow(1 + tasaMensual, 6)),
    anio_1: Math.round(precioActual * (1 + inflacionAnual)),
    anios_4: Math.round(precioActual * Math.pow(1 + inflacionAnual, 4)),
  };
}

/**
 * Recalcula precios de mercado para TODOS los insumos
 * @param {Array} insumos - Lista de insumos
 * @param {Array} ofertas - Lista de ofertas
 * @param {string} ciudadConstructor - Ciudad del constructor
 * @returns {Array} Insumos actualizados con precios de mercado
 */
export function recalcularTodosLosPrecios(insumos, ofertas, ciudadConstructor = '') {
  return insumos.map(insumo => {
    const mercado = calcularPrecioMercado(insumo.id, ofertas, ciudadConstructor);

    if (!mercado) return insumo;

    const fuentePreferida = insumo.precio_fuente || 'mercado_promedio';
    let precioAuto = insumo.precio_unitario;

    switch (fuentePreferida) {
      case 'mercado_promedio': precioAuto = mercado.precio_mercado; break;
      case 'mercado_bajo': precioAuto = mercado.precio_mas_bajo; break;
      case 'mercado_cercano': precioAuto = mercado.precio_mas_cercano; break;
      case 'manual': precioAuto = insumo.precio_unitario; break;
      default: precioAuto = mercado.precio_mercado;
    }

    return {
      ...insumo,
      precio_mercado: mercado.precio_mercado,
      precio_mas_bajo: mercado.precio_mas_bajo,
      precio_mas_cercano: mercado.precio_mas_cercano,
      num_ofertas: mercado.num_ofertas,
      // Solo actualizar precio_unitario si la fuente NO es manual
      ...(fuentePreferida !== 'manual' ? { precio_unitario: precioAuto } : {}),
    };
  });
}
