import { conectar } from './lib.mjs';
import { CUADRILLAS_MO, CARGOS_MO } from '../../src/lib/catalogo-taxonomia.js';
const sb = await conectar();
const SMLV = 1750905;
for (const q of CUADRILLAS_MO) {
  const vh = q.integrantes.reduce((t, [h, n]) => { const m = CARGOS_MO.find((x) => x.codigo === h); return t + (SMLV * m.smlv * m.factor / 240) * n; }, 0);
  const f = Math.round((vh * 240 / SMLV) * 10000) / 10000;
  const { error } = await sb.from('cargos').update({ factor_smlv: f, precio_unitario: Math.round(vh) }).eq('codigo', q.codigo);
  console.log(q.codigo, f, Math.round(vh), error?.message || 'ok');
}
