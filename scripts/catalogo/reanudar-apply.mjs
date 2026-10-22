// Reanuda --apply desde el paso "Presupuestos: reapuntar duplicados" usando catalogo_staging.json
import fs from 'fs';
import path from 'path';
import { conectar, fetchAll, DATA, norm } from './lib.mjs';

const st = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogo_staging.json'), 'utf8'));
const sb = await conectar();
const uid = sb.userId;
const isUuid = (x) => /^[0-9a-f-]{36}$/i.test(String(x));
const chk = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const lotes = async (rows, n, fn) => { for (let i = 0; i < rows.length; i += n) await fn(rows.slice(i, i + n)); };

const apusDb = await fetchAll(sb, 'apu', 'id, codigo');
const idPorCodigo = new Map(apusDb.map((a) => [a.codigo, a.id]));
const idApu = new Map(st.apus.map((s) => [s.sid, isUuid(s.sid) ? s.sid : idPorCodigo.get(s.codigo)]));
const pItems = await fetchAll(sb, 'presupuesto_items', 'id, apu_id');
const enPresupuesto = new Set(pItems.map((p) => p.apu_id));
const remap = new Map(st.remapApu);

// 1. Reapuntar presupuestos
let n = 0;
for (const [viejo, nuevo] of remap) {
  if (!isUuid(viejo)) continue;
  let destino = nuevo; while (remap.has(destino)) destino = remap.get(destino);
  const id = idApu.get(destino) || (isUuid(destino) ? destino : null);
  if (!id) { console.log('⚠️ sin destino para', viejo); continue; }
  const r = chk(await sb.from('presupuesto_items').update({ apu_id: id }).eq('apu_id', viejo).select('id'), 'presupuesto remap');
  n += r.length;
}
console.log(`✅ Ítems de presupuesto reapuntados: ${n}`);

// 2. Eliminar APU
const pItems2 = await fetchAll(sb, 'presupuesto_items', 'id, apu_id');
const usados2 = new Set(pItems2.map((p) => p.apu_id));
const elim = st.apusEliminar.map((e) => e.id).filter((id) => isUuid(id) && !usados2.has(id));
await lotes(elim, 100, async (b) => {
  chk(await sb.from('apu_detalle').delete().in('apu_id', b), 'det elim');
  chk(await sb.from('apu_detalle').delete().in('apu_hijo_id', b), 'det hijo elim');
  chk(await sb.from('apu').delete().in('id', b), 'apu elim');
});
console.log(`✅ APU eliminados: ${elim.length} (de ${st.apusEliminar.length})`);

// 3. Eliminar insumos
const insElim = st.insumosEliminar.map((x) => x.id).filter(isUuid);
await lotes(insElim, 100, async (b) => { chk(await sb.from('apu_detalle').delete().in('insumo_id', b), 'det ins elim'); chk(await sb.from('insumos').delete().in('id', b), 'insumos elim'); });
console.log(`✅ Insumos eliminados: ${insElim.length}`);

// 4. Cotizaciones internas
const { error: errCot } = await sb.from('insumo_cotizaciones').select('id').limit(1);
if (errCot) { console.log('⚠️ Tabla insumo_cotizaciones no existe: ejecute migration-fase19-catalogo.sql y vuelva a correr este script.'); process.exit(0); }
const insDb = await fetchAll(sb, 'insumos', 'id, codigo');
const idInsPorCodigo = new Map(insDb.map((i) => [i.codigo, i.id]));
const proveedores = await fetchAll(sb, 'erp_proveedores', 'id, nombre').catch(() => []);
const provId = new Map(proveedores.map((p) => [norm(p.nombre), p.id]));
const cots = st.insumos.flatMap((s) => {
  const insumoId = isUuid(s.sid) ? s.sid : idInsPorCodigo.get(s.codigo);
  return (s.cotizaciones || []).map((c) => ({ insumo_id: insumoId, proveedor_id: provId.get(norm(c.proveedor)) || null, proveedor_nombre: c.proveedor, precio_compra: c.valor, referencia: c.referencia || null, vigente: true, user_id: uid }));
}).filter((c) => c.insumo_id);
const ids = [...new Set(cots.map((c) => c.insumo_id))];
await lotes(ids, 200, async (b) => { chk(await sb.from('insumo_cotizaciones').delete().in('insumo_id', b), 'cot del'); });
await lotes(cots, 500, async (b) => { chk(await sb.from('insumo_cotizaciones').insert(b), 'cot ins'); });
console.log(`✅ Cotizaciones internas: ${cots.length}`);
console.log('🎉 Aplicación completada.');
