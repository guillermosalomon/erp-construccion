import { conectar, fetchAll } from './lib.mjs';
const sb = await conectar();
const [t, p, o, i] = await Promise.all(['mk_tiendas', 'mk_puntos_venta', 'mk_ofertas', 'insumos'].map((x) => fetchAll(sb, x)));
console.log('tiendas', t.map((x) => x.id + ' ' + x.nombre));
console.log('puntos', p.map((x) => x.id + ' ' + x.nombre + ' ' + x.ciudad + ' tienda ' + x.tienda_id));
const by = {}; o.forEach((x) => { const k = x.punto_venta_id; by[k] = (by[k] || 0) + 1; }); console.log('ofertas por punto', by, 'sin categoria', o.filter((x) => !x.categoria).length, 'columnas', Object.keys(o[0] || {}));
const tipos = {}; i.forEach((x) => { const k = x.tipo + '|' + (x.categoria ? 'cat' : 'SIN') + '|' + (Number(x.precio_unitario) > 0 ? 'precio' : '0'); tipos[k] = (tipos[k] || 0) + 1; }); console.log('insumos', tipos);
const ins = new Set(i.map((x) => x.id)); console.log('ofertas con insumo inexistente', o.filter((x) => !ins.has(x.insumo_id)).length);
