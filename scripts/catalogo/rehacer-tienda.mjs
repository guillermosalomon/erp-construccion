/**
 * Rehace el catálogo de la tienda Kalarti (punto de venta Pasto) con todos los materiales y equipos.
 *   node scripts/catalogo/rehacer-tienda.mjs           → dry-run
 *   node scripts/catalogo/rehacer-tienda.mjs --apply   → aplica
 * - Completa la categoría de los insumos que no la tienen.
 * - Actualiza las ofertas existentes (conserva stock) e inserta las faltantes.
 * - Precio venta = precio almacén Kalarti (insumos.precio_unitario); precio compra = mejor cotización interna.
 * - Elimina tiendas/puntos de venta "Kalarti" duplicados y vacíos.
 */
import { conectar, fetchAll, norm } from './lib.mjs';
import { categoriaInsumo } from './nombres.mjs';

const APPLY = process.argv.includes('--apply');
const sb = await conectar();
const uid = sb.userId;
const chk = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
const lotes = async (rows, n, fn) => { for (let i = 0; i < rows.length; i += n) await fn(rows.slice(i, i + n)); };

const [tiendas, puntos, ofertas, insumos, categorias, cots, pedidos] = await Promise.all(
  ['mk_tiendas', 'mk_puntos_venta', 'mk_ofertas', 'insumos', 'categorias', 'insumo_cotizaciones', 'mk_pedidos'].map((t) => fetchAll(sb, t).catch(() => [])));

// Tienda y punto principal: el que ya tiene ofertas
const conteo = new Map(); ofertas.forEach((o) => conteo.set(o.punto_venta_id, (conteo.get(o.punto_venta_id) || 0) + 1));
const kalartiPuntos = puntos.filter((p) => /KALARTI/i.test(p.nombre)).sort((a, b) => (conteo.get(b.id) || 0) - (conteo.get(a.id) || 0));
const punto = kalartiPuntos[0];
const tienda = tiendas.find((t) => t.id === punto.tienda_id);
console.log(`Punto principal: ${punto.nombre} (${punto.ciudad}) · tienda ${tienda.nombre} · ofertas actuales ${conteo.get(punto.id) || 0}`);

// 1. Categorías de insumo faltantes o con nombres antiguos (se normalizan a la taxonomía del almacén)
const OFICIALES = new Set(['OBRA GRIS', 'DRYWALL Y LIVIANOS', 'PINTURAS Y ESTUCOS', 'PISOS Y ENCHAPES', 'CUBIERTAS', 'METÁLICOS Y PERFILERÍA', 'CARPINTERÍA', 'VIDRIOS Y ALUMINIO', 'HIDROSANITARIOS', 'APARATOS SANITARIOS', 'ILUMINACIÓN', 'ELÉCTRICOS', 'CONTRA INCENDIO', 'VOZ Y DATOS', 'CLIMATIZACIÓN', 'GASES MEDICINALES', 'HERRAMIENTAS Y CONSUMIBLES', 'ESPECIALES', 'MADERAS', 'FERRETERÍA GENERAL', 'EQUIPOS', 'TRANSPORTE', 'MANO DE OBRA']);
const catNombre = new Map(categorias.map((c) => [c.id, c.nombre]));
const catId = new Map(categorias.map((c) => [norm(c.nombre), c.id]));
const sinCat = insumos.filter((i) => !OFICIALES.has(i.categoria || ''));
const updCat = sinCat.map((i) => {
  const cat = i.tipo === 'EQUIPO' ? 'EQUIPOS' : i.tipo === 'TRANSPORTE' ? 'TRANSPORTE' : i.tipo === 'MANO_OBRA' ? 'MANO DE OBRA' : categoriaInsumo(i.categoria || catNombre.get(i.categoria_id) || '', i.nombre);
  i.categoria = cat;
  return i;
});
console.log(`Insumos sin categoría o con categoría antigua: ${sinCat.length}`);

// 2. Ofertas
const mejorCompra = new Map();
cots.filter((c) => c.vigente !== false).forEach((c) => { const v = Number(c.precio_compra); if (v > 0 && (!mejorCompra.has(c.insumo_id) || v < mejorCompra.get(c.insumo_id))) mejorCompra.set(c.insumo_id, v); });
const vendibles = insumos.filter((i) => ['MATERIAL', 'EQUIPO'].includes(i.tipo) && Number(i.precio_unitario) > 0);
const existentes = new Map(ofertas.filter((o) => o.punto_venta_id === punto.id).map((o) => [o.insumo_id, o]));
const hoy = new Date().toISOString().slice(0, 10);
const fila = (i) => ({
  insumo_id: i.id, tienda_id: tienda.id, punto_venta_id: punto.id,
  nombre_comercial: i.nombre, tipo: i.tipo, categoria: i.categoria, unidad: i.unidad,
  precio_venta: Number(i.precio_unitario), precio_compra: mejorCompra.get(i.id) ?? null,
  tienda_nombre: 'Kalarti', ciudad: punto.ciudad || 'Pasto', publicado_marketplace: true, activo: true,
  fecha_actualizacion_precio: hoy,
});
const actualizar = vendibles.filter((i) => existentes.has(i.id)).map((i) => ({ id: existentes.get(i.id).id, ...fila(i), stock_disponible: existentes.get(i.id).stock_disponible ?? 0, user_id: existentes.get(i.id).user_id || uid }));
const insertar = vendibles.filter((i) => !existentes.has(i.id)).map((i) => ({ ...fila(i), stock_disponible: 0, user_id: uid }));
const vendIds = new Set(vendibles.map((i) => i.id));
const desactivar = [...existentes.values()].filter((o) => !vendIds.has(o.insumo_id));
const porCat = {}; vendibles.forEach((i) => { porCat[i.categoria] = (porCat[i.categoria] || 0) + 1; });
console.log(`Ofertas: actualizar ${actualizar.length} · crear ${insertar.length} · desactivar ${desactivar.length} · total tienda ${vendibles.length}`);
console.log('Por categoría:', porCat);

// 3. Duplicados vacíos de tienda/punto Kalarti
const usadosPedido = JSON.stringify(pedidos);
const puntosVacios = kalartiPuntos.slice(1).filter((p) => !conteo.get(p.id) && !usadosPedido.includes(p.id));
const tiendasVacias = tiendas.filter((t) => /KALARTI/i.test(t.nombre) && t.id !== tienda.id && !ofertas.some((o) => o.tienda_id === t.id) && !puntos.some((p) => p.tienda_id === t.id && !puntosVacios.includes(p)) && !usadosPedido.includes(t.id));
console.log(`Duplicados a eliminar: ${puntosVacios.length} puntos, ${tiendasVacias.length} tiendas`);

if (!APPLY) { console.log('\nDRY-RUN. Use --apply para aplicar.'); process.exit(0); }

await lotes(updCat, 200, async (b) => {
  for (const i of b) chk(await sb.from('insumos').update({ categoria: i.categoria, categoria_id: catId.get(norm(i.categoria)) || i.categoria_id || null }).eq('id', i.id), 'insumo cat');
});
await lotes(actualizar, 200, async (b) => { chk(await sb.from('mk_ofertas').upsert(b), 'ofertas upd'); });
await lotes(insertar, 200, async (b) => { chk(await sb.from('mk_ofertas').insert(b), 'ofertas ins'); });
if (desactivar.length) chk(await sb.from('mk_ofertas').update({ activo: false, publicado_marketplace: false }).in('id', desactivar.map((o) => o.id)), 'ofertas off');
if (puntosVacios.length) chk(await sb.from('mk_puntos_venta').delete().in('id', puntosVacios.map((p) => p.id)), 'puntos del');
if (tiendasVacias.length) chk(await sb.from('mk_tiendas').delete().in('id', tiendasVacias.map((t) => t.id)), 'tiendas del');
chk(await sb.from('mk_tiendas').update({ nombre: 'Kalarti' }).eq('id', tienda.id), 'tienda');
console.log('✅ Tienda Kalarti actualizada.');
