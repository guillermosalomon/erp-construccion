// Enlaza registros existentes con `profiles` (identidad unificada) y detecta clientes duplicados.
//
// Uso:
//   node scripts/identidad/enlazar-perfiles.mjs            → DRY-RUN (solo reporta, no escribe)
//   node scripts/identidad/enlazar-perfiles.mjs --apply    → escribe profile_id y fusiona clientes duplicados
//
// Requiere migration-fase20-red-logistica.sql (columnas profile_id / cliente_id) y
// ERP_SCRIPT_EMAIL / ERP_SCRIPT_PASSWORD de un administrador en .env.local.
import { conectar, fetchAll, norm } from '../catalogo/lib.mjs';

const APPLY = process.argv.includes('--apply');
const email = (e) => String(e || '').trim().toLowerCase();
const tel = (t) => { const d = String(t || '').replace(/\D/g, '').slice(-10); return d.length >= 7 ? d : ''; };

const sb = await conectar();
console.log(`\n=== Enlace de perfiles ${APPLY ? '(APLICANDO CAMBIOS)' : '(DRY-RUN: no se escribe nada)'} ===\n`);

async function leer(tabla) {
  try { return await fetchAll(sb, tabla); } catch (e) { console.warn(`⚠️  ${tabla}: ${e.message}`); return []; }
}

const [profiles, personal, clientes, chats, proveedores] = await Promise.all([
  leer('profiles'), leer('personal'), leer('clientes'), leer('chat_usuarios'), leer('erp_proveedores'),
]);
console.log(`profiles=${profiles.length} personal=${personal.length} clientes=${clientes.length} chat_usuarios=${chats.length} erp_proveedores=${proveedores.length}\n`);

const tieneCol = (filas, col) => filas.length === 0 || filas.some((r) => Object.prototype.hasOwnProperty.call(r, col));
const porEmail = new Map();
const porTel = new Map();
const porId = new Map(profiles.map((p) => [p.id, p]));
for (const p of profiles) {
  if (email(p.email)) porEmail.set(email(p.email), p);
  for (const t of [tel(p.telefono), tel(p.whatsapp)]) if (t && !porTel.has(t)) porTel.set(t, p);
}

const resumen = {};
async function enlazar(tabla, filas) {
  const r = { total: filas.length, yaEnlazados: 0, porEmail: 0, porTelefono: 0, porUserId: 0, sinCoincidencia: 0, errores: 0 };
  resumen[tabla] = r;
  if (!tieneCol(filas, 'profile_id')) { console.warn(`⚠️  ${tabla}: falta la columna profile_id (ejecute migration-fase20).`); return; }
  for (const f of filas) {
    if (f.profile_id) { r.yaEnlazados++; continue; }
    let p = null; let via = '';
    if (tabla === 'personal' && f.user_id && porId.has(f.user_id)) { p = porId.get(f.user_id); via = 'porUserId'; }
    if (!p && email(f.email) && porEmail.has(email(f.email))) { p = porEmail.get(email(f.email)); via = 'porEmail'; }
    if (!p) {
      const t = [tel(f.telefono), tel(f.whatsapp), tel(f.celular)].find((x) => x && porTel.has(x));
      if (t) { p = porTel.get(t); via = 'porTelefono'; }
    }
    if (!p) { r.sinCoincidencia++; continue; }
    r[via]++;
    console.log(`  ${tabla}: "${f.nombre || f.email || f.id}" → ${p.email} (${via})`);
    if (APPLY) {
      const { error } = await sb.from(tabla).update({ profile_id: p.id }).eq('id', f.id);
      if (error) { r.errores++; console.warn(`    ✖ ${error.message}`); }
    }
  }
}

console.log('── 1. Enlace por email / teléfono ──');
await enlazar('personal', personal);
await enlazar('clientes', clientes);
await enlazar('chat_usuarios', chats);
await enlazar('erp_proveedores', proveedores);

// ── 2. Clientes duplicados (mismo email o teléfono) ──
console.log('\n── 2. Clientes duplicados ──');
const padre = new Map(clientes.map((c) => [c.id, c.id]));
const raiz = (id) => { while (padre.get(id) !== id) id = padre.get(id); return id; };
const unir = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) padre.set(rb, ra); };
const vistos = new Map();
for (const c of clientes) {
  const claves = [email(c.email) && `e:${email(c.email)}`, tel(c.telefono) && `t:${tel(c.telefono)}`, tel(c.whatsapp) && `t:${tel(c.whatsapp)}`].filter(Boolean);
  for (const k of claves) { if (vistos.has(k)) unir(vistos.get(k), c.id); else vistos.set(k, c.id); }
}
const grupos = new Map();
for (const c of clientes) { const r = raiz(c.id); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(c); }
const duplicados = [...grupos.values()].filter((g) => g.length > 1);

const CAMPOS = ['email', 'telefono', 'whatsapp', 'telegram_id', 'empresa', 'nit', 'direccion', 'ciudad', 'notas', 'profile_id'];
let fusionados = 0, erroresFusion = 0;
for (const g of duplicados) {
  // Conserva: el que tenga perfil; si no, el más antiguo
  g.sort((a, b) => (Number(!!b.profile_id) - Number(!!a.profile_id)) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const [keep, ...dups] = g;
  const nombresDistintos = new Set(g.map((c) => norm(c.nombre))).size > 1;
  console.log(`  Grupo (${g.length}): conservar "${keep.nombre}" [${keep.id}] ← ${dups.map((d) => `"${d.nombre}" [${d.id}]`).join(', ')}${nombresDistintos ? '  ⚠️ nombres distintos' : ''}`);
  if (!APPLY) continue;
  try {
    const completar = {};
    for (const campo of CAMPOS) {
      if (!keep[campo] && Object.prototype.hasOwnProperty.call(keep, campo)) {
        const v = dups.map((d) => d[campo]).find(Boolean);
        if (v) completar[campo] = v;
      }
    }
    if (Object.keys(completar).length) {
      const { error } = await sb.from('clientes').update(completar).eq('id', keep.id);
      if (error) throw error;
    }
    const ids = dups.map((d) => d.id);
    // Re-apuntar referencias por cliente_id (tolerante si la columna no existe)
    for (const tabla of ['proyectos', 'marketing_leads', 'chat_usuarios']) {
      const { error } = await sb.from(tabla).update({ cliente_id: keep.id }).in('cliente_id', ids);
      if (error && !/column|schema cache/i.test(error.message)) throw new Error(`${tabla}: ${error.message}`);
    }
    const { error: delErr } = await sb.from('clientes').delete().in('id', ids);
    if (delErr) throw delErr;
    fusionados += ids.length;
  } catch (e) {
    erroresFusion++;
    console.warn(`    ✖ No se fusionó el grupo de "${keep.nombre}": ${e.message}`);
  }
}

// ── Resumen ──
console.log('\n=== RESUMEN ===');
console.table(resumen);
const perfilesSinVinculo = profiles.filter((p) =>
  ![personal, clientes, chats, proveedores].some((lista) => lista.some((r) => r.profile_id === p.id || email(r.email) === email(p.email))));
console.log(`Perfiles sin ningún registro asociado: ${perfilesSinVinculo.length}`);
console.log(`Grupos de clientes duplicados: ${duplicados.length} (${duplicados.reduce((n, g) => n + g.length - 1, 0)} registros sobrantes)`);
if (APPLY) console.log(`Clientes fusionados (eliminados): ${fusionados} · grupos con error: ${erroresFusion}`);
else console.log('\nDRY-RUN: no se escribió nada. Ejecute con --apply para aplicar (haga backup antes).');
console.log('Nota: proyectos.cliente (texto) no se modifica; revise los grupos con nombres distintos.\n');
