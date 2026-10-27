import { conectar } from '../catalogo/lib.mjs';
const sb = await conectar();
for (const [t, c] of [['bodegas','municipio'],['mk_pedidos','metodo_pago'],['pos_agenda','ambito'],['profiles','roles'],['erp_ordenes_compra','costo_transporte']]) {
  const { error, data } = await sb.from(t).select(c).limit(3); console.log(t, c, error ? 'FALTA: ' + error.message : 'OK ' + JSON.stringify(data));
}
const { data: v, error: ev } = await sb.from('v_stock_bodega').select('*').limit(1); console.log('v_stock_bodega', ev ? 'FALTA ' + ev.message : 'OK');
