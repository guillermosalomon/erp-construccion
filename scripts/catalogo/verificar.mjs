// Verificación post-aplicación: costos con el motor único sobre los datos reales de Supabase
import { conectar, fetchAll } from './lib.mjs';
import { crearContexto, costoAPU } from '../../src/lib/apu-engine.js';

const sb = await conectar();
const [apus, det, insumos, cargos, cargoDetalles, config, proyectos, items] = await Promise.all(
  ['apu', 'apu_detalle', 'insumos', 'cargos', 'cargo_detalle', 'global_config', 'proyectos', 'presupuesto_items'].map((t) => fetchAll(sb, t)));
const ctx = crearContexto({ insumos, cargos, cargoDetalles, apuDetalles: det, config });
console.log(`SMLV ${ctx.smlv} · HORAS_MES ${ctx.horasMes} · APU ${apus.length} · detalle ${det.length} · insumos ${insumos.length}`);
const ceros = apus.filter((a) => costoAPU(ctx, a.id).total === 0);
console.log('APU con costo 0:', ceros.length, ceros.slice(0, 5).map((a) => a.codigo + ' ' + a.nombre));
const sinCodigoNuevo = apus.filter((a) => !/^\d{2}\.\d{3}$/.test(a.codigo));
console.log('APU sin código CC.NNN:', sinCodigoNuevo.length);
const huerfanos = items.filter((i) => !apus.some((a) => a.id === i.apu_id));
console.log('Ítems de presupuesto sin APU:', huerfanos.length);
for (const p of proyectos) {
  const its = items.filter((i) => i.proyecto_id === p.id);
  const cd = its.reduce((t, i) => t + costoAPU(ctx, i.apu_id).total * (Number(i.cantidad) || 0), 0);
  console.log(`🏗️ ${p.nombre}: ${its.length} ítems · costo directo ${Math.round(cd).toLocaleString('es-CO')}`);
}
const cua = cargos.filter((c) => /^CUA-/.test(c.codigo));
const { datosCargo } = await import('../../src/lib/apu-engine.js');
cua.forEach((c) => console.log(`   ${c.codigo} ${c.nombre}: ${Math.round(datosCargo(ctx, c.id).precioHora).toLocaleString('es-CO')}/h`));
