import { conectar, fetchAll } from '../catalogo/lib.mjs';
const sb = await conectar();
const b = await fetchAll(sb, 'bodegas'); console.log('bodegas', b.map((x) => x.nombre + ' · ' + x.municipio));
const { data: s, error } = await sb.from('v_stock_bodega').select('*').limit(3); console.log('v_stock_bodega', error?.message || s.length);
const { data: c, error: e2 } = await sb.from('insumo_cotizaciones').select('id').limit(1); console.log('cotizaciones staff read', e2?.message || c.length);
const { data: g } = await sb.from('global_config').select('clave'); console.log('config', g.map((x) => x.clave));
