/**
 * Identidad unificada: `profiles` es la persona única (web + ERP).
 * personal / clientes / erp_proveedores / chat_usuarios se enlazan con `profile_id`;
 * marketing_leads y chat_usuarios guardan `cliente_id` al convertirse en cliente.
 *
 * Todas las funciones son tolerantes: si las columnas nuevas (migration-fase20) aún
 * no existen, reintentan sin ellas o devuelven un error legible sin romper el flujo.
 */
import { supabase } from './supabase';

export const ROLES_PERFIL = ['ADMIN', 'STAFF', 'RESIDENTE', 'CUADRILLA', 'VENDEDOR', 'CLIENTE', 'PROFESIONAL', 'CONSTRUCTOR', 'COMERCIO', 'PROVEEDOR'];

export const normEmail = (e) => String(e || '').trim().toLowerCase();
/** Últimos 10 dígitos del teléfono (ignora indicativo +57, espacios, guiones). */
export const digitos = (t) => String(t || '').replace(/\D/g, '').slice(-10);

const esColumnaFaltante = (err) =>
  !!err && /column|schema cache|does not exist|PGRST204/i.test(`${err.message || ''} ${err.code || ''}`);

/** Quita del payload las claves indicadas (para reintentar sin columnas nuevas). */
const sin = (obj, claves) => {
  const out = { ...obj };
  claves.forEach((k) => delete out[k]);
  return out;
};

const COLS_PERFIL_NUEVAS = [
  'telefono', 'whatsapp', 'documento', 'ciudad', 'empresa', 'roles', 'avatar_url', 'activo',
  'tipo_registro', 'estado_verificacion', 'pais', 'profesion', 'acepta_habeas_data', 'fecha_habeas_data',
];

/** Une roles sin duplicados, en mayúsculas. */
export function unirRoles(...listas) {
  const set = new Set();
  listas.flat().forEach((r) => { if (r) set.add(String(r).toUpperCase()); });
  return [...set];
}

/**
 * Crea o completa el perfil del usuario autenticado.
 * No sobrescribe el rol principal de un perfil existente (lo administra el ERP),
 * solo agrega el rol de metadata a `roles` y rellena datos de contacto vacíos.
 */
export async function sincronizarPerfil(authUser, metadata = {}) {
  if (!supabase || !authUser?.id) return null;
  const meta = { ...(authUser.user_metadata || {}), ...metadata };
  const metaRole = String(meta.role || 'CLIENTE').toUpperCase();
  const nombre = meta.nombre || (authUser.email || '').split('@')[0];

  const { data: actual, error: errSel } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (errSel) { console.warn('profiles no disponible:', errSel.message); return null; }

  const contacto = {
    telefono: meta.telefono || null,
    whatsapp: meta.whatsapp || meta.telefono || null,
    ciudad: meta.ciudad || null,
    documento: meta.cedula || meta.documento || null,
    empresa: meta.empresa || null,
    pais: meta.pais || 'Colombia',
    profesion: meta.profesion || null,
    tipo_registro: meta.tipo_registro || metaRole,
    ...(meta.acepta_habeas_data ? { acepta_habeas_data: true, fecha_habeas_data: new Date().toISOString() } : {}),
  };

  let payload;
  if (!actual) {
    payload = { id: authUser.id, email: authUser.email, nombre, role: metaRole, roles: [metaRole], ...contacto };
  } else {
    payload = { id: authUser.id };
    if (!actual.email && authUser.email) payload.email = authUser.email;
    if (!actual.nombre) payload.nombre = nombre;
    if (!actual.role) payload.role = metaRole;
    const roles = unirRoles(actual.roles || [], actual.role || [], metaRole);
    if (!Array.isArray(actual.roles) || roles.length !== actual.roles.length) payload.roles = roles;
    Object.entries(contacto).forEach(([k, v]) => { if (v && !actual[k]) payload[k] = v; });
    if (Object.keys(payload).length === 1) return actual;
  }

  let { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().maybeSingle();
  if (error && esColumnaFaltante(error)) {
    ({ data, error } = await supabase.from('profiles').upsert(sin(payload, COLS_PERFIL_NUEVAS), { onConflict: 'id' }).select().maybeSingle());
  }
  if (error) console.warn('No se pudo sincronizar profiles:', error.message);
  return data || actual || payload;
}

/** Actualiza un registro intentando con profile_id; si la columna no existe, lo ignora. */
async function actualizarTolerante(tabla, id, cambios) {
  const { error } = await supabase.from(tabla).update(cambios).eq('id', id);
  if (error && !esColumnaFaltante(error)) throw error;
  return !error;
}

/** Inserta intentando con columnas nuevas; si faltan, reintenta sin ellas. */
async function insertarTolerante(tabla, payload, columnasOpcionales = ['profile_id']) {
  let { data, error } = await supabase.from(tabla).insert(payload).select().maybeSingle();
  if (error && esColumnaFaltante(error)) {
    ({ data, error } = await supabase.from(tabla).insert(sin(payload, columnasOpcionales)).select().maybeSingle());
  }
  if (error) throw error;
  return data;
}

/**
 * Asegura el registro de `personal` del staff enlazado por profile_id
 * (busca por profile_id, user_id y por último email).
 */
export async function asegurarPersonal(authUser, metadata = {}) {
  if (!supabase || !authUser?.id) return null;
  const meta = { ...(authUser.user_metadata || {}), ...metadata };
  const role = String(meta.role || 'CUADRILLA').toUpperCase();
  let existente = null;

  const porPerfil = await supabase.from('personal').select('*').eq('profile_id', authUser.id).limit(1);
  if (!porPerfil.error && porPerfil.data?.length) existente = porPerfil.data[0];
  if (!existente) {
    const porUser = await supabase.from('personal').select('*').eq('user_id', authUser.id).limit(1);
    if (!porUser.error && porUser.data?.length) existente = porUser.data[0];
  }
  if (!existente && authUser.email) {
    const porEmail = await supabase.from('personal').select('*').ilike('email', normEmail(authUser.email)).limit(1);
    if (!porEmail.error && porEmail.data?.length) existente = porEmail.data[0];
  }

  if (existente) {
    const cambios = {};
    if (!existente.profile_id) cambios.profile_id = authUser.id;
    if (!existente.user_id) cambios.user_id = authUser.id;
    if (Object.keys(cambios).length) {
      try { await actualizarTolerante('personal', existente.id, cambios); } catch (e) { console.warn('personal: no se pudo enlazar perfil', e.message); }
    }
    return { ...existente, ...cambios };
  }

  const nombreCompleto = meta.nombre || authUser.email.split('@')[0];
  const parts = nombreCompleto.split(' ');
  const cargosIds = Array.isArray(meta.cargos_ids) ? meta.cargos_ids : [];
  const ciudadVal = meta.ciudad || '';
  return insertarTolerante('personal', {
    email: authUser.email,
    nombre: nombreCompleto,
    nombres: parts[0] || '',
    apellidos: parts.slice(1).join(' ') || '',
    telefono: meta.telefono || null,
    whatsapp: meta.whatsapp || meta.telefono || null,
    profesion: meta.profesion || '',
    app_role: role.toLowerCase(),
    cargo_id: cargosIds[0] || meta.cargo_id || null,
    cargos_ids: cargosIds,
    tipo_documento: meta.tipo_documento || 'CC',
    cedula: meta.cedula || '',
    ciudad: ciudadVal,
    pais: meta.pais || 'Colombia',
    plan: meta.plan || 'free',
    tarifa_referencia: meta.tarifa_referencia ? Number(meta.tarifa_referencia) : null,
    tarifa_unidad: meta.tarifa_unidad || 'Día',
    municipios_cobertura: Array.isArray(meta.municipios_cobertura)
      ? meta.municipios_cobertura
      : (ciudadVal ? [ciudadVal] : ['Pasto']),
    disponible_red_talento: meta.disponible_red_talento !== undefined
      ? Boolean(meta.disponible_red_talento)
      : (meta.tipo_registro === 'PROFESIONAL' || role === 'PROFESIONAL'),
    anos_experiencia: meta.anos_experiencia ? Number(meta.anos_experiencia) : 0,
    resumen_experiencia: meta.resumen_experiencia || null,
    user_id: authUser.id,
    profile_id: authUser.id,
  }, [
    'profile_id', 'tipo_documento', 'cedula', 'pais', 'plan', 'cargos_ids',
    'tarifa_referencia', 'tarifa_unidad', 'municipios_cobertura',
    'disponible_red_talento', 'anos_experiencia', 'resumen_experiencia',
  ]);
}

/**
 * Busca un cliente existente por profile_id, email o teléfono (dígitos).
 * Devuelve el primero que coincida o null.
 */
export async function buscarClienteExistente({ profileId, email, telefono, whatsapp } = {}) {
  if (!supabase) return null;
  if (profileId) {
    const r = await supabase.from('clientes').select('*').eq('profile_id', profileId).limit(1);
    if (!r.error && r.data?.length) return r.data[0];
  }
  const em = normEmail(email);
  if (em) {
    const r = await supabase.from('clientes').select('*').ilike('email', em).limit(1);
    if (!r.error && r.data?.length) return r.data[0];
  }
  const tels = [digitos(telefono), digitos(whatsapp)].filter((d) => d.length >= 7);
  if (tels.length) {
    const { data } = await supabase.from('clientes').select('*').or('telefono.not.is.null,whatsapp.not.is.null').limit(5000);
    const hit = (data || []).find((c) => tels.includes(digitos(c.telefono)) || tels.includes(digitos(c.whatsapp)));
    if (hit) return hit;
  }
  return null;
}

/** Asegura un cliente CRM enlazado al perfil (rol CLIENTE de la web). */
export async function asegurarClienteDePerfil(authUser, metadata = {}) {
  if (!supabase || !authUser?.id) return null;
  const meta = { ...(authUser.user_metadata || {}), ...metadata };
  const existente = await buscarClienteExistente({ profileId: authUser.id, email: authUser.email, telefono: meta.telefono, whatsapp: meta.whatsapp });
  if (existente) {
    if (!existente.profile_id) {
      try { await actualizarTolerante('clientes', existente.id, { profile_id: authUser.id }); } catch (e) { console.warn('clientes: no se pudo enlazar perfil', e.message); }
    }
    return existente;
  }
  return insertarTolerante('clientes', {
    nombre: meta.nombre || authUser.email.split('@')[0],
    email: authUser.email,
    telefono: meta.telefono || null,
    whatsapp: meta.whatsapp || null,
    ciudad: meta.ciudad || null,
    estado: 'activo',
    origen: 'web',
    plataforma: 'web',
    profile_id: authUser.id,
  }, ['profile_id', 'plataforma']);
}

/** Sincronización completa al iniciar sesión / registrarse. Nunca lanza. */
export async function sincronizarIdentidad(authUser, metadata = {}) {
  try {
    const meta = { ...(authUser?.user_metadata || {}), ...metadata };
    const perfil = await sincronizarPerfil(authUser, meta);
    const role = String(meta.role || perfil?.role || 'CLIENTE').toUpperCase();
    const tipoReg = String(meta.tipo_registro || perfil?.tipo_registro || role).toUpperCase();

    if (tipoReg === 'CONSTRUCTOR' || (role === 'ADMIN' && meta.empresa)) {
      try {
        await supabase.rpc('crear_organizacion', {
          p_nombre: meta.empresa || meta.nombre || 'Constructora',
          p_nit: meta.nit || meta.cedula || null,
          p_tipo: 'CONSTRUCTORA',
          p_municipio: meta.ciudad || 'Pasto',
        });
      } catch {
        // Tolerante si migration-fase22a aún no se ha corrido
      }
      await asegurarPersonal(authUser, { ...meta, role: 'ADMIN' });
    } else if (tipoReg === 'COMERCIO' || role === 'TIENDA') {
      try {
        const { data: tiendaExist } = await supabase
          .from('mk_tiendas')
          .select('id')
          .eq('user_id', authUser.id)
          .limit(1);
        if (!tiendaExist?.length) {
          await insertarTolerante('mk_tiendas', {
            nombre: meta.empresa || meta.nombre || 'Mi Ferretería',
            nit: meta.nit || meta.cedula || null,
            ciudad: meta.ciudad || 'Pasto',
            telefono: meta.telefono || meta.whatsapp || null,
            email: authUser.email,
            user_id: authUser.id,
            activa: true,
          }, ['nit', 'ciudad']);
        }
      } catch (e) {
        console.warn('mk_tiendas onboarding:', e?.message);
      }
      await asegurarPersonal(authUser, { ...meta, role: 'TIENDA' });
    } else if (tipoReg === 'PROVEEDOR') {
      try {
        const { data: provExist } = await supabase
          .from('erp_proveedores')
          .select('id')
          .eq('profile_id', authUser.id)
          .limit(1);
        if (!provExist?.length) {
          await insertarTolerante('erp_proveedores', {
            nombre: meta.empresa || meta.nombre || 'Proveedor Kalarti',
            nit: meta.nit || meta.cedula || null,
            ciudad: meta.ciudad || 'Pasto',
            telefono: meta.telefono || meta.whatsapp || null,
            email: authUser.email,
            activo: true,
            user_id: authUser.id,
            profile_id: authUser.id,
          }, ['profile_id', 'nit']);
        }
      } catch (e) {
        console.warn('erp_proveedores onboarding:', e?.message);
      }
      await asegurarPersonal(authUser, { ...meta, role: 'TIENDA' });
    } else if (role === 'CLIENTE' && tipoReg !== 'PROFESIONAL') {
      await asegurarClienteDePerfil(authUser, meta);
    } else {
      await asegurarPersonal(authUser, meta);
    }
    return perfil;
  } catch (e) {
    console.warn('Sincronización de identidad (no bloqueante):', e?.message || e);
    return null;
  }
}

/** Enlaza un registro (personal, clientes, erp_proveedores, chat_usuarios) a un perfil. */
export async function vincularPerfil(tabla, id, profileId) {
  const permitidas = ['personal', 'clientes', 'erp_proveedores', 'chat_usuarios'];
  if (!permitidas.includes(tabla)) throw new Error('Tabla no permitida');
  const { error } = await supabase.from(tabla).update({ profile_id: profileId || null }).eq('id', id);
  if (error) {
    if (esColumnaFaltante(error)) throw new Error('Falta la columna profile_id. Ejecute migration-fase20-red-logistica.sql.');
    throw error;
  }
  return true;
}

/**
 * Convierte un lead (marketing_leads) o contacto de chat (chat_usuarios) en cliente,
 * reutilizando el cliente existente por email/teléfono y guardando `cliente_id` en el origen.
 * @returns {{ cliente: object, reutilizado: boolean, enlazado: boolean }}
 */
export async function convertirEnCliente(tablaOrigen, fila) {
  if (!['marketing_leads', 'chat_usuarios'].includes(tablaOrigen)) throw new Error('Origen no permitido');
  const telefono = fila.telefono || fila.celular || fila.phone || null;
  const whatsapp = fila.whatsapp || null;
  let cliente = await buscarClienteExistente({ profileId: fila.profile_id, email: fila.email, telefono, whatsapp });
  const reutilizado = !!cliente;
  if (!cliente) {
    const esChat = tablaOrigen === 'chat_usuarios';
    const plataforma = esChat ? (fila.plataforma || (fila.telegram_id ? 'telegram' : 'whatsapp')) : 'web';
    cliente = await insertarTolerante('clientes', {
      nombre: fila.nombre || fila.email || telefono || 'Sin nombre',
      email: fila.email || null,
      telefono,
      whatsapp: whatsapp || (plataforma === 'whatsapp' ? telefono : null),
      telegram_id: fila.telegram_id ? String(fila.telegram_id) : null,
      ciudad: fila.ciudad || null,
      notas: fila.mensaje || fila.servicio ? [fila.servicio, fila.mensaje].filter(Boolean).join(' — ') : null,
      estado: 'prospecto',
      origen: ['telegram', 'whatsapp', 'web'].includes(plataforma) ? plataforma : 'manual',
      plataforma,
      profile_id: fila.profile_id || null,
    }, ['profile_id', 'plataforma', 'telegram_id']);
  }
  let enlazado = false;
  try { enlazado = await actualizarTolerante(tablaOrigen, fila.id, { cliente_id: cliente.id }); } catch (e) { console.warn(`${tablaOrigen}: no se pudo guardar cliente_id`, e.message); }
  return { cliente, reutilizado, enlazado };
}

/** Lectura tolerante: devuelve [] si la tabla no existe o RLS lo impide. */
async function leer(tabla, columnas = '*') {
  const { data, error } = await supabase.from(tabla).select(columnas).limit(5000);
  if (error) { console.warn(`${tabla}:`, error.message); return []; }
  return data || [];
}

/** Carga perfiles y registros enlazables para la vista Usuarios y perfiles. */
export async function cargarDirectorio() {
  if (!supabase) return { perfiles: [], personal: [], clientes: [], proveedores: [], chats: [], proyectos: [], pedidos: [] };
  const [perfiles, personal, clientes, proveedores, chats, proyectos, pedidos] = await Promise.all([
    leer('profiles'),
    leer('personal'),
    leer('clientes'),
    leer('erp_proveedores'),
    leer('chat_usuarios'),
    leer('proyectos'),
    leer('mk_pedidos', 'id, comprador_id, total, estado'),
  ]);
  return { perfiles, personal, clientes, proveedores, chats, proyectos, pedidos };
}

/** Guarda cambios de un perfil (tolerante a columnas faltantes). */
export async function guardarPerfil(id, cambios) {
  let { error } = await supabase.from('profiles').update(cambios).eq('id', id);
  if (error && esColumnaFaltante(error)) {
    ({ error } = await supabase.from('profiles').update(sin(cambios, COLS_PERFIL_NUEVAS)).eq('id', id));
    if (!error) return { ok: true, parcial: true };
  }
  if (error) throw error;
  return { ok: true, parcial: false };
}
