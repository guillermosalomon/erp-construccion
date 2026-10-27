import { conectar } from './lib.mjs';
const sb = await conectar();
const { data } = await sb.from('profiles').select('id,email,role,nombre'); console.log(data);
const { data: p } = await sb.from('personal').select('email,app_role,nombre'); console.log(p);
