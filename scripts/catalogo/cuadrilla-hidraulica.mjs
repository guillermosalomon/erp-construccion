/**
 * Cuadrilla de redes hidráulicas (CUA-HI) y reasignación de tareas hidrosanitarias fuera de cerrajería (CUA-CE).
 * Dry-run por defecto; --apply escribe en Supabase.
 *  - Crea CUA-HI (oficial plomero + ayudante) si no existe.
 *  - APUs que hoy usan CUA-CE pero son hidráulicos/sanitarios → CUA-HI (y capítulo HIDROSANITARIAS si estaban mal clasificados).
 *  - Salidas eléctricas con CUA-CE → capítulo ELÉCTRICAS y cuadrilla CUA-OC.
 *  - CUA-CE queda solo para carpintería metálica, ventanería, cubiertas ligeras, puertas y estructura de acero.
 */
import { conectar, fetchAll, norm } from './lib.mjs';
const APPLY = process.argv.includes('--apply');
const sb = await conectar();
const SMLV = 1750905;
const [apus, det, cargos, cdet] = await Promise.all(['apu', 'apu_detalle', 'cargos', 'cargo_detalle'].map((t) => fetchAll(sb, t)));
const porCod = new Map(cargos.map((c) => [c.codigo, c]));
const CE = porCod.get('CUA-CE'); const OC = porCod.get('CUA-OC');
const ofi = porCod.get('MO-OFI'); const ayu = porCod.get('MO-AYU');
if (!CE || !OC || !ofi || !ayu) throw new Error('Faltan cargos base (CUA-CE, CUA-OC, MO-OFI, MO-AYU)');

const vh = (SMLV * (1.5 * 1.71 + 1 * 1.77)) / 240;
let HI = porCod.get('CUA-HI');
if (!HI) {
  console.log('Crear CUA-HI "Cuadrilla redes hidráulicas" valor hora', Math.round(vh));
  if (APPLY) {
    const { data, error } = await sb.from('cargos').insert({ codigo: 'CUA-HI', nombre: 'Cuadrilla redes hidráulicas', unidad: 'Hora', categoria: 'cuadrilla', factor_smlv: Math.round((vh * 240 / SMLV) * 10000) / 10000, factor_multiplicador: 1, precio_unitario: Math.round(vh), recargo_cop: 0, recargo_pct: 0, user_id: CE.user_id }).select().single();
    if (error) throw error; HI = data;
    const { error: e2 } = await sb.from('cargo_detalle').insert([
      { cargo_padre_id: HI.id, cargo_hijo_id: ofi.id, cantidad: 1, user_id: CE.user_id },
      { cargo_padre_id: HI.id, cargo_hijo_id: ayu.id, cantidad: 1, user_id: CE.user_id },
    ]);
    if (e2) throw e2;
  }
}

const HIDRO = /tuber[ií]a (pvc|cpvc)|llave de paso|v[aá]lvula|calentador|punto (sanitario|hidr)|acometida hidr|hidroneum|trampa de grasa|s[eé]ptico|bajante|red de descole|succi[oó]n|lavamanos|lavaplatos|sanitario|ducha|accesorios hidr/i;
const ELEC = /^salida (de )?(iluminaci|tomacorriente)/i;
const CAP_MAL = new Set(['ESTRUCTURA METÁLICA', 'ESTRUCTURA EN CONCRETO', 'AIRE ACONDICIONADO', 'PISOS Y ENCHAPES']);
const porId = new Map(apus.map((a) => [a.id, a]));
const lineasCE = det.filter((d) => d.cargo_id === CE.id);
const cambios = [];
for (const d of lineasCE) {
  const a = porId.get(d.apu_id); if (!a) continue;
  const n = String(a.nombre || '');
  if (ELEC.test(n)) cambios.push({ d, a, destino: OC, cat: 'ELÉCTRICAS' });
  else if (HIDRO.test(n) && !/mes[oó]n/i.test(n)) cambios.push({ d, a, destino: HI || { id: '(nuevo)' }, cat: CAP_MAL.has(a.categoria_apu) ? 'HIDROSANITARIAS' : null });
}
console.log(`APUs con CUA-CE: ${lineasCE.length} | a reasignar: ${cambios.length}`);
cambios.forEach((c) => console.log(` - ${c.a.categoria_apu} | ${c.a.nombre} -> ${c.destino.codigo || 'CUA-HI'}${c.cat ? ' + capítulo ' + c.cat : ''}`));
if (APPLY) {
  for (const c of cambios) {
    let r = await sb.from('apu_detalle').update({ cargo_id: c.destino.id }).eq('id', c.d.id); if (r.error) throw r.error;
    if (c.cat) { r = await sb.from('apu').update({ categoria_apu: c.cat }).eq('id', c.a.id); if (r.error) throw r.error; }
  }
  console.log('Aplicado.');
} else console.log('(dry-run) usa --apply para escribir');
