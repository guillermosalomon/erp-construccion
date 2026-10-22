// Auditoría del catálogo actual usando el motor único (src/lib/apu-engine.js)
import fs from 'fs';
import path from 'path';
import { conectar, fetchAll, DATA } from './lib.mjs';
import { crearContexto, costoAPU } from '../../src/lib/apu-engine.js';

const sb = await conectar();
const [apus, det, insumos, cargos, cargoDetalles, config] = await Promise.all(
  ['apu', 'apu_detalle', 'insumos', 'cargos', 'cargo_detalle', 'global_config'].map((t) => fetchAll(sb, t)));
const ctx = crearContexto({ insumos, cargos, cargoDetalles, apuDetalles: det, config });
const rows = apus.map((a) => ({ a, c: costoAPU(ctx, a.id) }));
rows.sort((x, y) => y.c.total - x.c.total);
console.log('SMLV', ctx.smlv, 'HORAS_MES', ctx.horasMes);
console.log('Top 15 (motor real):');
rows.slice(0, 15).forEach((r) => console.log(' ', Math.round(r.c.total).toLocaleString('es-CO'), r.a.unidad, '|', r.a.nombre.slice(0, 50), '| mat', Math.round(r.c.material), 'mo', Math.round(r.c.mano_obra)));
const cero = rows.filter((r) => r.c.total === 0).length;
console.log('APU costo 0:', cero);
fs.writeFileSync(path.join(DATA, 'auditoria_actual.json'), JSON.stringify(rows.map((r) => ({ codigo: r.a.codigo, nombre: r.a.nombre, unidad: r.a.unidad, total: Math.round(r.c.total) })), null, 1));
