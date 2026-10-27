/**
 * Sincroniza la tabla `categorias` con los capítulos de APU, las categorías de insumos
 * y las nuevas categorías requeridas: CARPINTERÍA METÁLICA y VENTANERÍA Y VIDRIOS.
 * Además vincula `insumos.categoria_id` y `apu.categoria_id` con su registro en `categorias`.
 */
import { conectar, fetchAll, norm } from './lib.mjs';
import { CAPITULOS_APU } from '../../src/lib/catalogo-taxonomia.js';

const sb = await conectar();
const [cats, insumos, apus] = await Promise.all([
  fetchAll(sb, 'categorias'),
  fetchAll(sb, 'insumos'),
  fetchAll(sb, 'apu'),
]);

const userId = cats.find((c) => c.user_id)?.user_id || insumos.find((i) => i.user_id)?.user_id || null;

// Mapa por nombre normalizado (sin tildes, mayúsculas) -> categoría preferida
const porNorm = new Map();
for (const c of cats) {
  const k = norm(c.nombre);
  // Preferir la versión con tildes si hay duplicado sin tilde
  if (!porNorm.has(k) || (c.nombre !== k && porNorm.get(k).nombre === k)) {
    porNorm.set(k, c);
  }
}

const DESEADAS = [
  ...CAPITULOS_APU.map((c, idx) => ({ nombre: c.nombre, aplica_a: 'APU', orden: (idx + 1) * 10 })),
  { nombre: 'CARPINTERÍA METÁLICA', aplica_a: 'AMBOS', orden: 175 },
  { nombre: 'VENTANERÍA Y VIDRIOS', aplica_a: 'AMBOS', orden: 176 },
  { nombre: 'OBRA GRIS', aplica_a: 'INSUMO', orden: 300 },
  { nombre: 'HIDROSANITARIOS', aplica_a: 'INSUMO', orden: 310 },
  { nombre: 'ELÉCTRICOS', aplica_a: 'INSUMO', orden: 320 },
  { nombre: 'ILUMINACIÓN', aplica_a: 'INSUMO', orden: 330 },
  { nombre: 'CLIMATIZACIÓN', aplica_a: 'INSUMO', orden: 340 },
  { nombre: 'CONTRA INCENDIO', aplica_a: 'INSUMO', orden: 350 },
  { nombre: 'METÁLICOS Y PERFILERÍA', aplica_a: 'INSUMO', orden: 360 },
  { nombre: 'MADERAS', aplica_a: 'INSUMO', orden: 370 },
  { nombre: 'VIDRIOS Y ALUMINIO', aplica_a: 'INSUMO', orden: 380 },
  { nombre: 'DRYWALL Y LIVIANOS', aplica_a: 'INSUMO', orden: 390 },
  { nombre: 'PINTURAS Y ESTUCOS', aplica_a: 'INSUMO', orden: 400 },
  { nombre: 'FERRETERÍA GENERAL', aplica_a: 'INSUMO', orden: 410 },
  { nombre: 'HERRAMIENTAS Y CONSUMIBLES', aplica_a: 'INSUMO', orden: 420 },
  { nombre: 'EQUIPOS', aplica_a: 'INSUMO', orden: 430 },
  { nombre: 'ESPECIALES', aplica_a: 'INSUMO', orden: 440 },
  { nombre: 'TRANSPORTE', aplica_a: 'INSUMO', orden: 450 },
  { nombre: 'MANO DE OBRA', aplica_a: 'INSUMO', orden: 460 },
];

// Combinar ámbitos si una categoría está en ambos
const deseadaMap = new Map();
for (const d of DESEADAS) {
  const k = norm(d.nombre);
  if (deseadaMap.has(k)) {
    deseadaMap.get(k).aplica_a = 'AMBOS';
  } else {
    deseadaMap.set(k, { ...d });
  }
}

let creadas = 0;
let actualizadas = 0;
for (const [k, d] of deseadaMap.entries()) {
  const ex = porNorm.get(k);
  const metaDesc = `AMBITO:${d.aplica_a}|ORDEN:${d.orden}`;
  if (!ex) {
    const { data, error } = await sb.from('categorias').insert({
      nombre: d.nombre,
      descripcion: metaDesc,
      user_id: userId,
    }).select().single();
    if (error) throw error;
    porNorm.set(k, data);
    creadas++;
  } else if (ex.nombre !== d.nombre || !ex.descripcion) {
    const { data, error } = await sb.from('categorias').update({
      nombre: d.nombre,
      descripcion: ex.descripcion || metaDesc,
    }).eq('id', ex.id).select().single();
    if (!error && data) porNorm.set(k, data);
    actualizadas++;
  }
}

// Vincular insumos.categoria_id según insumos.categoria
const gruposInsumo = new Map();
for (const i of insumos) {
  if (!i.categoria) continue;
  const cat = porNorm.get(norm(i.categoria));
  if (cat && i.categoria_id !== cat.id) {
    if (!gruposInsumo.has(cat.id)) gruposInsumo.set(cat.id, []);
    gruposInsumo.get(cat.id).push(i.id);
  }
}
let insVinculados = 0;
for (const [catId, ids] of gruposInsumo.entries()) {
  for (let p = 0; p < ids.length; p += 200) {
    const chunk = ids.slice(p, p + 200);
    const { error } = await sb.from('insumos').update({ categoria_id: catId }).in('id', chunk);
    if (error) throw error;
    insVinculados += chunk.length;
  }
}

// Vincular apu.categoria_id según apu.categoria_apu
const gruposApu = new Map();
for (const a of apus) {
  if (!a.categoria_apu) continue;
  const cat = porNorm.get(norm(a.categoria_apu));
  if (cat && a.categoria_id !== cat.id) {
    if (!gruposApu.has(cat.id)) gruposApu.set(cat.id, []);
    gruposApu.get(cat.id).push(a.id);
  }
}
let apuVinculados = 0;
for (const [catId, ids] of gruposApu.entries()) {
  for (let p = 0; p < ids.length; p += 200) {
    const chunk = ids.slice(p, p + 200);
    const { error } = await sb.from('apu').update({ categoria_id: catId }).in('id', chunk);
    if (error) throw error;
    apuVinculados += chunk.length;
  }
}

// Asegurar MO_ZONAS en global_config
const { data: moCfg } = await sb.from('global_config').select('*').eq('clave', 'MO_ZONAS');
if (!moCfg || moCfg.length === 0) {
  await sb.from('global_config').insert({
    clave: 'MO_ZONAS',
    valor: JSON.stringify({ ricaurte: { factor_general: 1.10 }, tumaco: { factor_general: 1.20 } }),
  });
  console.log('MO_ZONAS inicializado en global_config.');
}

console.log(`Categorías creadas: ${creadas}, actualizadas: ${actualizadas}, insumos vinculados: ${insVinculados}, APUs vinculados: ${apuVinculados}`);
