import { conectar, fetchAll } from './lib.mjs';
// Zona de prueba: crea (o con --quitar elimina) el POS "KALARTI Ricaurte (PRUEBA)" con precios +12% sobre Pasto.
// Las ofertas NO se publican en el marketplace (publicado_marketplace=false): solo afectan el costeo por zona.
const sb = await conectar();
const NOMBRE = 'KALARTI Ricaurte (PRUEBA)';
const { data: pvs } = await sb.from('mk_puntos_venta').select('*').eq('nombre', NOMBRE);
if (process.argv.includes('--quitar')) {
  for (const p of pvs || []) { await sb.from('mk_ofertas').delete().eq('punto_venta_id', p.id); await sb.from('mk_puntos_venta').delete().eq('id', p.id); }
  console.log('Zona de prueba eliminada'); process.exit(0);
}
const { data: base } = await sb.from('mk_puntos_venta').select('*').eq('nombre', 'KALARTI Pasto').single();
let pv = pvs?.[0];
if (!pv) {
  const r = await sb.from('mk_puntos_venta').insert({ tienda_id: base.tienda_id, nombre: NOMBRE, ciudad: 'Ricaurte', direccion: 'Prueba', activo: true, user_id: base.user_id }).select().single();
  if (r.error) throw r.error; pv = r.data;
}
const ofs = await fetchAll(sb, 'mk_ofertas', '*');
const sel = ofs.filter(o => o.origen === 'CATALOGO' && o.punto_venta_id === base.id && /cemento|arena|triturado|gravilla|ladrillo|bloque|varilla|acero corrugado/i.test(o.nombre_comercial || ''));
const filas = sel.map(({ id, created_at, updated_at, ...o }) => ({ ...o, punto_venta_id: pv.id, ciudad: 'Ricaurte', precio_venta: Math.round(Number(o.precio_venta) * 1.12), publicado_marketplace: false, stock_disponible: 0 }));
await sb.from('mk_ofertas').delete().eq('punto_venta_id', pv.id);
const { error } = await sb.from('mk_ofertas').insert(filas);
if (error) throw error;
console.log('Ofertas Ricaurte creadas:', filas.length);
