// Utilidades compartidas para scripts de catálogo (Node ESM)
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');
export const DATA = path.join(__dirname, 'data');
const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(ROOT, '.env.local'), quiet: true });
const { createClient } = require('@supabase/supabase-js');

export async function conectar() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const email = process.env.ERP_SCRIPT_EMAIL, password = process.env.ERP_SCRIPT_PASSWORD;
  if (!email || !password) throw new Error('Defina ERP_SCRIPT_EMAIL y ERP_SCRIPT_PASSWORD en .env.local');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  sb.userId = data.user.id;
  return sb;
}

export async function fetchAll(sb, table, select = '*') {
  let out = [], from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(select).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out = out.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

export const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/["'´`]/g, '').replace(/[^A-Z0-9/.]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Repara texto UTF-8 doblemente codificado (ELÃ‰CTRICAS → ELÉCTRICAS) */
export function fixMojibake(s) {
  if (!s || !/[ÃÂ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff));
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return out;
  } catch { return s; }
}

export const UNIDADES = {
  M2: 'M2', 'M²': 'M2', MT2: 'M2', M3: 'M3', 'M³': 'M3', MT3: 'M3', ML: 'ML', M: 'ML', MT: 'ML', MTS: 'ML',
  UN: 'UND', UND: 'UND', UNIDAD: 'UND', U: 'UND', PAR: 'PAR', KG: 'KG', KGS: 'KG', LB: 'LB',
  GL: 'GL', GLB: 'GL', GLOBAL: 'GL', GLN: 'GAL', GAL: 'GAL', GALON: 'GAL', LT: 'LT', LTS: 'LT', L: 'LT',
  BTO: 'BTO', BULTO: 'BTO', HR: 'HORA', HORA: 'HORA', H: 'HORA', DIA: 'DIA', 'DÍA': 'DIA', PTO: 'PTO', SAL: 'SAL',
  ROLLO: 'ROLLO', CAJA: 'CAJA', VIAJE: 'VIAJE', '%': '%',
};
export const unidad = (u) => { const k = String(u || '').toUpperCase().replace(/\./g, '').trim(); return UNIDADES[k] || k || 'UND'; };
