/**
 * Fase 21 (M1) — Desglose de insumos compuestos a referencias específicas:
 *  1. Acero corrugado figurado FY=420 MPa:
 *     - #4 (1/2") FY=420 MPa -> 50% (longitudinal principal en vigas, columnetas y zapatas)
 *     - #3 (3/8") FY=420 MPa -> 30% (estribos, flejes y retracción/temperatura; 100% en columnetas/vigas cinta 15x15 y APU 3/8")
 *     - #5 (5/8") FY=420 MPa -> 20% (cimentación y vigas de mayor luz)
 *  2. Accesorios CPVC ø 1/2":
 *     - Codo CPVC ø 1/2" 90°
 *     - Tee CPVC ø 1/2"
 *     - Unión CPVC ø 1/2"
 *     - Adaptador macho CPVC ø 1/2"
 *  3. Accesorios CPVC ø 3/4" y PVC presión ø 3/4" / sanitaria ø 3":
 *     - Codo, Tee/Yee y Unión independientes.
 *
 * Incluye actualización de apu_detalle, insumo_cotizaciones, mk_ofertas e inventario_transacciones.
 * Uso: node scripts/catalogo/desglose-insumos.mjs [--apply]
 */
import { conectar, fetchAll } from './lib.mjs';

const APPLY = process.argv.includes('--apply');
const sb = await conectar();

const [insumos, apuDetalles, apus, cotizaciones, ofertas, transacciones] = await Promise.all([
  fetchAll(sb, 'insumos'),
  fetchAll(sb, 'apu_detalle'),
  fetchAll(sb, 'apu'),
  fetchAll(sb, 'insumo_cotizaciones'),
  fetchAll(sb, 'mk_ofertas'),
  fetchAll(sb, 'inventario_transacciones'),
]);

const apuById = new Map(apus.map((a) => [a.id, a]));
const insByCode = new Map(insumos.map((i) => [i.codigo, i]));
const userId = insumos.find((i) => i.user_id)?.user_id || null;

// 1. Catálogo de referencias específicas a garantizar en `insumos`
const NUEVOS_INSUMOS = [
  // Aceros figurados por calibre
  { codigo: 'KMT-AC03', nombre: 'Acero corrugado figurado #3 (3/8") FY=420 MPa', unidad: 'KG', tipo: 'MATERIAL', categoria: 'OBRA GRIS', precio_unitario: 5400, precio_compra: 4700 },
  { codigo: 'KMT-AC04', nombre: 'Acero corrugado figurado #4 (1/2") FY=420 MPa', unidad: 'KG', tipo: 'MATERIAL', categoria: 'OBRA GRIS', precio_unitario: 5400, precio_compra: 4700 },
  { codigo: 'KMT-AC05', nombre: 'Acero corrugado figurado #5 (5/8") FY=420 MPa', unidad: 'KG', tipo: 'MATERIAL', categoria: 'OBRA GRIS', precio_unitario: 5400, precio_compra: 4700 },
  // Accesorios CPVC ø 1/2"
  { codigo: 'KMT-CPVC12-CO', nombre: 'Codo CPVC ø 1/2" 90°', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 3800, precio_compra: 3300 },
  { codigo: 'KMT-CPVC12-TE', nombre: 'Tee CPVC ø 1/2"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 4900, precio_compra: 4260 },
  { codigo: 'KMT-CPVC12-UN', nombre: 'Unión CPVC ø 1/2"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 2900, precio_compra: 2520 },
  { codigo: 'KMT-CPVC12-AD', nombre: 'Adaptador macho CPVC ø 1/2"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 7800, precio_compra: 6780 },
  // Accesorios CPVC ø 3/4"
  { codigo: 'KMT-CPVC34-CO', nombre: 'Codo CPVC ø 3/4" 90°', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 5200, precio_compra: 4520 },
  { codigo: 'KMT-CPVC34-TE', nombre: 'Tee CPVC ø 3/4"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 6800, precio_compra: 5910 },
  { codigo: 'KMT-CPVC34-UN', nombre: 'Unión CPVC ø 3/4"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 4100, precio_compra: 3565 },
  // Accesorios PVC presión ø 3/4"
  { codigo: 'KMT-PVCP34-CO', nombre: 'Codo PVC presión 90° ø 3/4"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 1900, precio_compra: 1650 },
  { codigo: 'KMT-PVCP34-TE', nombre: 'Tee PVC presión ø 3/4"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 2400, precio_compra: 2085 },
  { codigo: 'KMT-PVCP34-UN', nombre: 'Unión PVC presión ø 3/4"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 1400, precio_compra: 1215 },
  // Accesorios PVC sanitaria ø 3"
  { codigo: 'KMT-PVCS03-CO', nombre: 'Codo PVC sanitario 90° ø 3"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 9800, precio_compra: 8520 },
  { codigo: 'KMT-PVCS03-YE', nombre: 'Yee PVC sanitaria ø 3"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 12500, precio_compra: 10870 },
  { codigo: 'KMT-PVCS03-TE', nombre: 'Tee PVC sanitaria ø 3"', unidad: 'UND', tipo: 'MATERIAL', categoria: 'HIDROSANITARIOS', precio_unitario: 11200, precio_compra: 9740 },
];

const idPorCodigo = new Map();
for (const item of NUEVOS_INSUMOS) {
  const ex = insByCode.get(item.codigo) || insumos.find((i) => i.nombre.toLowerCase() === item.nombre.toLowerCase());
  if (ex) {
    idPorCodigo.set(item.codigo, ex.id);
    console.log(`[EXISTE] ${item.codigo} -> ${ex.id} (${ex.nombre})`);
  } else {
    console.log(`[CREAR]  ${item.codigo} -> ${item.nombre} ($${item.precio_unitario}/${item.unidad})`);
    if (APPLY) {
      const { data, error } = await sb.from('insumos').insert({
        codigo: item.codigo,
        nombre: item.nombre,
        unidad: item.unidad,
        tipo: item.tipo,
        categoria: item.categoria,
        precio_unitario: item.precio_unitario,
        user_id: userId,
      }).select().single();
      if (error) throw error;
      idPorCodigo.set(item.codigo, data.id);
    } else {
      idPorCodigo.set(item.codigo, `sim-${item.codigo}`);
    }
  }
}

// 2. Reglas de partición de insumos compuestos
const IDS_ACERO_COMPUESTO = new Set([
  'bdbe14d1-1696-4b83-8d0e-68c5fcabfae9', // KMT-0132 Acero corrugado figurado FY=420 MPA #3, #4, #5
  '8d2246ff-102f-4bdd-8f2f-b2719fa142d5', // INS-011 Acero corrugado figurado FY=420 MPA #3, #4, #5
  '3784d44e-489a-4c8b-a92f-f9cb778689d3', // INS-MAT-0004 Acero figurado fy 60.000 PSI
]);

function repartirAcero(apuNombre, cantTotal) {
  const n = String(apuNombre || '').toLowerCase();
  // Casos 100% #3 (3/8"): columnetas/vigas cinta de confinamiento 15x15 y APU específico de 3/8"
  if (n.includes('3/8') || n.includes('columneta') || n.includes('viga cinta')) {
    return [{ codigo: 'KMT-AC03', cantidad: cantTotal }];
  }
  // Proporción estándar residencial NSR-10: #4 (50%), #3 (30%), #5 (20%)
  return [
    { codigo: 'KMT-AC04', cantidad: Math.round(cantTotal * 0.50 * 10000) / 10000 },
    { codigo: 'KMT-AC03', cantidad: Math.round(cantTotal * 0.30 * 10000) / 10000 },
    { codigo: 'KMT-AC05', cantidad: Math.round(cantTotal * 0.20 * 10000) / 10000 },
  ];
}

function repartirCpvc12(apuNombre, cantTotal) {
  const n = String(apuNombre || '').toLowerCase();
  if (n.includes('llave de paso')) {
    // 1 unión + 1 adaptador macho por cada 2 und
    const f = cantTotal / 2;
    return [
      { codigo: 'KMT-CPVC12-UN', cantidad: Math.round(1.0 * f * 10000) / 10000 },
      { codigo: 'KMT-CPVC12-AD', cantidad: Math.round(1.0 * f * 10000) / 10000 },
    ];
  }
  if (n.includes('punto hidr') || n.includes('calentador')) {
    // Por punto (2.5 und ref): 60% codo 90°, 20% tee, 20% adaptador macho
    return [
      { codigo: 'KMT-CPVC12-CO', cantidad: Math.round(cantTotal * 0.60 * 10000) / 10000 },
      { codigo: 'KMT-CPVC12-TE', cantidad: Math.round(cantTotal * 0.20 * 10000) / 10000 },
      { codigo: 'KMT-CPVC12-AD', cantidad: Math.round(cantTotal * 0.20 * 10000) / 10000 },
    ];
  }
  // Tubería CPVC 1/2" (0.45 und/ml): 4/9 codo, 2/9 tee, 3/9 unión (0.20 + 0.10 + 0.15 = 0.45)
  return [
    { codigo: 'KMT-CPVC12-CO', cantidad: Math.round((cantTotal * 20) / 45 * 10000) / 10000 },
    { codigo: 'KMT-CPVC12-TE', cantidad: Math.round((cantTotal * 10) / 45 * 10000) / 10000 },
    { codigo: 'KMT-CPVC12-UN', cantidad: Math.round((cantTotal * 15) / 45 * 10000) / 10000 },
  ];
}

function repartirGenerico3(codigos, cantTotal) {
  return [
    { codigo: codigos[0], cantidad: Math.round(cantTotal * 0.50 * 10000) / 10000 },
    { codigo: codigos[1], cantidad: Math.round(cantTotal * 0.30 * 10000) / 10000 },
    { codigo: codigos[2], cantidad: Math.round(cantTotal * 0.20 * 10000) / 10000 },
  ];
}

const cambiosDetalle = [];
for (const d of apuDetalles) {
  if (!d.insumo_id) continue;
  const apu = apuById.get(d.apu_id);
  const cant = Number(d.cantidad) || 0;
  let partes = null;

  if (IDS_ACERO_COMPUESTO.has(d.insumo_id)) {
    // En INS-MAT-0004 (cajas de inspección) la cantidad estaba en toneladas (0.005 -> 5 kg)
    const cantKg = d.insumo_id === '3784d44e-489a-4c8b-a92f-f9cb778689d3' && cant < 0.1 ? Math.round(cant * 1000 * 100) / 100 : cant;
    partes = repartirAcero(apu?.nombre, cantKg);
  } else if (d.insumo_id === 'c647d89f-3c5a-4e16-a176-851b5da964c9' || d.insumo_id === '5500fa67-be37-4bd0-b1a4-d006fe7df8c1') {
    const cantUnd = d.insumo_id === '5500fa67-be37-4bd0-b1a4-d006fe7df8c1' && cant === 1 ? 2.5 : cant;
    partes = repartirCpvc12(apu?.nombre, cantUnd);
  } else if (d.insumo_id === 'ad3b835a-d2f7-49dd-b0d8-3513b2cfcb5e') {
    partes = repartirGenerico3(['KMT-CPVC34-CO', 'KMT-CPVC34-TE', 'KMT-CPVC34-UN'], cant);
  } else if (d.insumo_id === '8c8481bf-a055-4ead-8f98-66612a1bfc98' || d.insumo_id === '10984aa7-0105-4727-80b5-e41438681c5f') {
    partes = String(apu?.nombre || '').toLowerCase().includes('codo')
      ? [{ codigo: 'KMT-PVCP34-CO', cantidad: cant }]
      : repartirGenerico3(['KMT-PVCP34-CO', 'KMT-PVCP34-TE', 'KMT-PVCP34-UN'], cant);
  } else if (d.insumo_id === '4e333d39-971c-43a0-b181-1fb22ffe798b' || d.insumo_id === 'd92c2f9e-2d70-4e37-86f2-fef0bb6fbcf2') {
    partes = String(apu?.nombre || '').toLowerCase().includes('codo')
      ? [{ codigo: 'KMT-PVCS03-CO', cantidad: cant }]
      : repartirGenerico3(['KMT-PVCS03-CO', 'KMT-PVCS03-YE', 'KMT-PVCS03-TE'], cant);
  }

  if (partes && partes.length > 0) {
    cambiosDetalle.push({ d, apuNombre: apu?.nombre, partes });
  }
}

console.log(`\nLíneas apu_detalle a desglosar: ${cambiosDetalle.length}`);
for (const c of cambiosDetalle) {
  console.log(` - APU "${c.apuNombre}" (antes cant=${c.d.cantidad}) => ${c.partes.map((p) => `${p.codigo}:${p.cantidad}`).join(' + ')}`);
}

if (APPLY) {
  // Actualizar apu_detalle: la primera parte actualiza la fila existente y las demás se insertan
  for (const c of cambiosDetalle) {
    const [primera, ...resto] = c.partes;
    const { error: e1 } = await sb.from('apu_detalle').update({
      insumo_id: idPorCodigo.get(primera.codigo),
      cantidad: primera.cantidad,
      unidad_detalle: null,
    }).eq('id', c.d.id);
    if (e1) throw e1;

    if (resto.length > 0) {
      const nuevos = resto.map((p) => ({
        apu_id: c.d.apu_id,
        insumo_id: idPorCodigo.get(p.codigo),
        cargo_id: null,
        apu_hijo_id: null,
        cantidad: p.cantidad,
        desperdicio_pct: c.d.desperdicio_pct || 0,
        herramienta_menor_pct: 0,
        user_id: c.d.user_id || userId,
      }));
      const { error: e2 } = await sb.from('apu_detalle').insert(nuevos);
      if (e2) throw e2;
    }
  }

  // Cotizaciones y ofertas POS para las nuevas referencias específicas
  const provBase = cotizaciones.find((c) => c.insumo_id === 'bdbe14d1-1696-4b83-8d0e-68c5fcabfae9') || cotizaciones[0];
  const ofertaBasePasto = ofertas.find((o) => o.ciudad === 'Pasto' && o.origen === 'CATALOGO');
  const ofertaBaseRic = ofertas.find((o) => o.ciudad === 'Ricaurte' && o.origen === 'CATALOGO');

  for (const item of NUEVOS_INSUMOS) {
    const insId = idPorCodigo.get(item.codigo);
    if (!cotizaciones.some((c) => c.insumo_id === insId) && provBase) {
      await sb.from('insumo_cotizaciones').insert({
        insumo_id: insId,
        proveedor_id: provBase.proveedor_id,
        proveedor_nombre: provBase.proveedor_nombre,
        precio_compra: item.precio_compra,
        tiempo_entrega_dias: 2,
        vigente: true,
      });
    }
    if (!ofertas.some((o) => o.insumo_id === insId && o.ciudad === 'Pasto') && ofertaBasePasto) {
      await sb.from('mk_ofertas').insert({
        insumo_id: insId,
        tienda_id: ofertaBasePasto.tienda_id,
        punto_venta_id: ofertaBasePasto.punto_venta_id,
        nombre_comercial: item.nombre,
        tipo: item.tipo,
        categoria: item.categoria,
        unidad: item.unidad,
        precio_venta: item.precio_unitario,
        stock_disponible: 50,
        tienda_nombre: ofertaBasePasto.tienda_nombre,
        ciudad: 'Pasto',
        publicado_marketplace: true,
        activo: true,
        origen: 'CATALOGO',
        user_id: ofertaBasePasto.user_id,
      });
    }
    if (!ofertas.some((o) => o.insumo_id === insId && o.ciudad === 'Ricaurte') && ofertaBaseRic) {
      await sb.from('mk_ofertas').insert({
        insumo_id: insId,
        tienda_id: ofertaBaseRic.tienda_id,
        punto_venta_id: ofertaBaseRic.punto_venta_id,
        nombre_comercial: item.nombre,
        tipo: item.tipo,
        categoria: item.categoria,
        unidad: item.unidad,
        precio_venta: Math.round(item.precio_unitario * 1.12),
        stock_disponible: 0,
        tienda_nombre: ofertaBaseRic.tienda_nombre,
        ciudad: 'Ricaurte',
        publicado_marketplace: false,
        activo: true,
        origen: 'CATALOGO',
        user_id: ofertaBaseRic.user_id,
      });
    }
  }

  // Actualizar las transacciones existentes de Casa Ricaurte para que apunten a las referencias específicas:
  // 1) Entrada manual de +5 KG de acero -> Acero corrugado figurado #4 (1/2") FY=420 MPa (así suma en CUBIERTO de inmediato)
  const txAcero = transacciones.find((t) => t.id === '9493da83-f523-4833-99b8-a2154d81a9c4');
  if (txAcero) {
    await sb.from('inventario_transacciones').update({ insumo_id: idPorCodigo.get('KMT-AC04') }).eq('id', txAcero.id);
    console.log('Transacción +5 KG acero vinculada a KMT-AC04 (#4 1/2")');
  }

  // 2) Entrada de 54.4895 UND de Accesorios CPVC 1/2" y sus 2 consumos -> desglosados en Codo (23.662), Tee (9.331), Unión (11.4965) y Adaptador macho (10)
  const txCpvcEntrada = transacciones.find((t) => t.id === '2baea50c-5cf6-4657-8b72-359102fd1840');
  if (txCpvcEntrada) {
    await sb.from('inventario_transacciones').update({
      insumo_id: idPorCodigo.get('KMT-CPVC12-CO'),
      cantidad: 23.662,
      costo_unitario: 3800,
    }).eq('id', txCpvcEntrada.id);

    const extras = [
      { codigo: 'KMT-CPVC12-TE', cantidad: 9.331, cu: 4900 },
      { codigo: 'KMT-CPVC12-UN', cantidad: 11.4965, cu: 2900 },
      { codigo: 'KMT-CPVC12-AD', cantidad: 10, cu: 7800 },
    ];
    for (const ex of extras) {
      const insId = idPorCodigo.get(ex.codigo);
      const yaExiste = transacciones.some((t) => t.bodega_id === txCpvcEntrada.bodega_id && t.insumo_id === insId && t.tipo === 'ENTRADA');
      if (!yaExiste) {
        await sb.from('inventario_transacciones').insert({
          bodega_id: txCpvcEntrada.bodega_id,
          insumo_id: insId,
          tipo: 'ENTRADA',
          origen: 'COMPRA',
          cantidad: ex.cantidad,
          costo_unitario: ex.cu,
          costo_real: Math.round(ex.cantidad * ex.cu),
          motivo: txCpvcEntrada.motivo || 'Recepción inicial desglosada CPVC ø 1/2"',
          user_id: txCpvcEntrada.user_id,
        });
      }
    }
    // Consumos (-2 y -2) -> Codo CPVC ø 1/2" 90°
    for (const cid of ['fe4f93da-c157-422a-b5a6-02c7e628a502', '6bc3ced8-9ec9-4594-bb4c-54875d3dcad4']) {
      await sb.from('inventario_transacciones').update({ insumo_id: idPorCodigo.get('KMT-CPVC12-CO') }).eq('id', cid);
    }
    console.log('Transacciones CPVC ø 1/2" en Casa Ricaurte desglosadas en Codo, Tee, Unión y Adaptador macho.');
  }

  // Despublicar del marketplace los insumos compuestos antiguos que quedaron sin uso
  for (const oldId of [...IDS_ACERO_COMPUESTO, 'c647d89f-3c5a-4e16-a176-851b5da964c9', '5500fa67-be37-4bd0-b1a4-d006fe7df8c1', 'ad3b835a-d2f7-49dd-b0d8-3513b2cfcb5e', '8c8481bf-a055-4ead-8f98-66612a1bfc98', '10984aa7-0105-4727-80b5-e41438681c5f', '4e333d39-971c-43a0-b181-1fb22ffe798b', 'd92c2f9e-2d70-4e37-86f2-fef0bb6fbcf2']) {
    await sb.from('mk_ofertas').update({ activo: false, publicado_marketplace: false }).eq('insumo_id', oldId);
  }

  console.log('\nDesglose aplicado exitosamente.');
} else {
  console.log('\n(dry-run) Ejecuta con --apply para aplicar los cambios.');
}
