// Uso: node scripts/catalogo/ver-apu.mjs "<texto en nombre>"
import fs from 'fs';
import path from 'path';
import { DATA } from './lib.mjs';
const s = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogo_staging.json'), 'utf8'));
const ins = new Map(s.insumos.map((i) => [i.sid, i]));
const cg = new Map(s.cargos.map((c) => [c.codigo, c]));
const ap = new Map(s.apus.map((a) => [a.sid, a]));
const q = (process.argv[2] || '').toUpperCase();
for (const a of s.apus.filter((x) => x.nombre.toUpperCase().includes(q) || x.codigo === q).slice(0, 4)) {
  console.log(`\n## ${a.codigo} ${a.nombre} [${a.unidad}] ${a.costo_anterior} -> ${a.costo_nuevo} (ref ${Math.round(a.ref_directo || 0)}) ${a.origen}`);
  for (const l of a.lineas) {
    if (l.insumo) { const i = ins.get(l.insumo); console.log(`   INS ${i?.nombre} [${i?.unidad} $${i?.precio_unitario} ant:${i?.precio_anterior} ${i?.accion}] x ${l.cantidad} ${l.unidad_detalle || ''}`); }
    else if (l.cargo) console.log(`   CUA ${l.cargo} x ${l.cantidad} h hm ${l.herramienta_menor_pct || 0}`);
    else if (l.cargo_id) console.log(`   CARGO ${l.cargo_id} x ${l.cantidad}`);
    else console.log(`   HIJO ${ap.get(l.hijo)?.nombre} x ${l.cantidad} (${ap.get(l.hijo)?.costo_nuevo})`);
  }
}
