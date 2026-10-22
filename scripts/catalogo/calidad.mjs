// Resumen de calidad del staging: ratios vs referente, estados ALTO/BAJO
import fs from 'fs';
import path from 'path';
import { DATA } from './lib.mjs';
const s = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogo_staging.json'), 'utf8'));
const r = s.apus.filter((a) => a.ref_directo && a.costo_nuevo);
const ratios = r.map((a) => a.costo_nuevo / a.ref_directo).sort((a, b) => a - b);
const p = (q) => ratios[Math.floor(r.length * q)].toFixed(2);
console.log('APU con referente', r.length, 'ratio p10', p(0.1), 'p50', p(0.5), 'p90', p(0.9), 'p97', p(0.97));
const lim = Number(process.argv[2] || 40);
console.log('--- Ratio fuera de [0.8, 1.4]');
r.filter((a) => a.costo_nuevo / a.ref_directo > 1.4 || a.costo_nuevo / a.ref_directo < 0.8).slice(0, lim)
  .forEach((a) => console.log(' ', (a.costo_nuevo / a.ref_directo).toFixed(2), a.codigo, a.nombre.slice(0, 50), a.unidad, Math.round(a.ref_directo), '->', a.costo_nuevo));
console.log('--- ALTO / BAJO');
s.apus.filter((a) => ['ALTO', 'BAJO', 'COSTO 0'].includes(a.estado)).slice(0, lim)
  .forEach((a) => console.log(' ', a.estado, a.codigo, a.nombre.slice(0, 45), a.unidad, a.costo_anterior, '->', a.costo_nuevo, a.origen));
