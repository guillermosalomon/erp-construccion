const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let _authenticated = false;

async function ensureAuth() {
  if (_authenticated) return;
  await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  _authenticated = true;
}

// ═══════════════════════════════════════════
// CHAT USUARIOS & IDENTIDAD
// ═══════════════════════════════════════════

// Sincronización de identidad: Vincula Personal con Clientes (CRM)
async function syncIdentity(tgId, email, phone, opts = {}) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data.user.id;
  const tgIdStr = tgId ? String(tgId) : null;
  
  // 1. Buscar en Personal
  let persona = null;
  if (tgIdStr) {
    const { data } = await supabase.from('personal').select('*').eq('telegram_id', tgIdStr).maybeSingle();
    persona = data;
  }
  if (!persona && email) {
    const { data } = await supabase.from('personal').select('*').eq('email', email).maybeSingle();
    persona = data;
  }

  // 2. Buscar en Clientes
  let cliente = null;
  if (tgIdStr) {
    const { data } = await supabase.from('clientes').select('*').eq('telegram_id', tgIdStr).maybeSingle();
    cliente = data;
  }
  if (!cliente && email) {
    const { data } = await supabase.from('clientes').select('*').eq('email', email).maybeSingle();
    cliente = data;
  }

  // 3. Cruzar datos si uno existe y el otro no (Auto-complete)
  if (persona && !cliente) {
    // Crear cliente desde personal (Sincronización automática)
    const { data: newClient } = await supabase.from('clientes').insert({
      nombre: persona.nombre,
      email: persona.email,
      telefono: persona.telefono,
      whatsapp: persona.whatsapp,
      telegram_id: persona.telegram_id,
      ciudad: persona.ciudad,
      estado: 'prospecto',
      origen: opts.plataforma || 'telegram',
      creado_por: opts.creado_por || 'Sincronización Automática',
      plataforma: opts.plataforma || 'telegram',
      user_id: uid
    }).select().single();
    cliente = newClient;
  }
  
  // 4. Actualizar telegram_id si falta en alguno
  if (tgIdStr) {
    if (persona && !persona.telegram_id) await supabase.from('personal').update({ telegram_id: tgIdStr }).eq('id', persona.id);
    if (cliente && !cliente.telegram_id) await supabase.from('clientes').update({ telegram_id: tgIdStr, plataforma: 'telegram' }).eq('id', cliente.id);
  }

  return { persona, cliente };
}
async function findOrCreateChatUser(telegramId, nombre, username) {
  await ensureAuth();
  const phone = `tg:${telegramId}`;
  const tgIdStr = String(telegramId);
  
  const { data: existing } = await supabase
    .from('chat_usuarios')
    .select('*')
    .eq('telefono', phone)
    .maybeSingle();
  
  let user = existing;
  if (!existing) {
    const { data: created } = await supabase
      .from('chat_usuarios')
      .insert({ telefono: phone, plataforma: 'telegram', nombre, estado: 'activo', ultimo_contacto: new Date().toISOString() })
      .select()
      .single();
    user = created;
  } else {
    await supabase.from('chat_usuarios')
      .update({ ultimo_contacto: new Date().toISOString(), nombre: nombre || existing.nombre })
      .eq('id', existing.id);
  }

  // Sincronización de Identidad Global
  const { persona, cliente } = await syncIdentity(tgIdStr, user.email, null, {
    nombre: nombre,
    plataforma: 'telegram',
    creado_por: nombre
  });
  
  // Si no hay cliente, crearlo ahora
  if (!cliente) {
    await createOrLinkCRMClient({
      nombre: nombre || persona?.nombre || 'Usuario Telegram',
      telefono: phone,
      telegram_id: tgIdStr,
      whatsapp: username ? `@${username}` : null,
      origen: 'telegram'
    });
  }

  return user;
}

async function vincularEmail(chatUserId, email, telegramId) {
  await ensureAuth();
  const { data: persona } = await supabase.from('personal')
    .select('id, user_id, nombre, app_role')
    .eq('email', email)
    .maybeSingle();
  
  if (!persona) {
    return { ok: false, not_found: true };
  }
  
  const updateChat = { email, user_id: persona.user_id || null };
  await supabase.from('chat_usuarios').update(updateChat).eq('id', chatUserId);
  
  const tgId = telegramId ? String(telegramId) : null;
  if (tgId) {
    await supabase.from('personal').update({ telegram_id: tgId }).eq('id', persona.id);
    // Actualizar email en CRM si existe el cliente por telegram_id
    await supabase.from('clientes').update({ email, estado: 'activo' }).eq('telegram_id', tgId);
  }
  
  return { ok: true, personal: persona, app_role: persona.app_role };
}

async function registrarPersonal(chatUserId, email, nombre, telegramId) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data.user.id;
  const id = require('crypto').randomUUID();
  
  const { data, error } = await supabase.from('personal').insert({
    id, nombre, email, telegram_id: String(telegramId || ''),
    app_role: 'cliente', profesion: 'Cliente', user_id: uid
  }).select().single();
  
  if (error) return { ok: false, error: error.message };

  const { data: existingCrm } = await supabase.from('clientes')
    .select('id').eq('email', email).maybeSingle();
  if (!existingCrm) {
    await supabase.from('clientes').insert({
      nombre, email, telegram_id: String(telegramId || ''),
      estado: 'prospecto', origen: 'telegram', user_id: uid
    });
  }
  
  await supabase.from('chat_usuarios')
    .update({ email, user_id: uid })
    .eq('id', chatUserId);
    
  return { ok: true, personal: data };
}

async function getUserRole(chatUserId) {
  await ensureAuth();
  const { data } = await supabase.from('chat_usuarios').select('email').eq('id', chatUserId).single();
  if (!data?.email) return null;
  
  const { data: persona } = await supabase.from('personal')
    .select('nombre, app_role').eq('email', data.email).maybeSingle();
  
  return persona ? { role: persona.app_role, nombre: persona.nombre } : null;
}

async function logMessage(chatUserId, direccion, texto, tipo = 'chat', metadata = {}) {
  await ensureAuth();
  await supabase.from('chat_mensajes').insert({
    chat_usuario_id: chatUserId, direccion, texto, tipo, metadata
  });
}

async function getConversationState(chatUserId) {
  await ensureAuth();
  const { data } = await supabase.from('chat_estado').select('*').eq('chat_usuario_id', chatUserId).maybeSingle();
  return data;
}

async function setConversationState(chatUserId, flujo, paso, dataTemp = {}) {
  await ensureAuth();
  console.log(`[DB] State Update: user=${chatUserId}, paso=${paso}, data=`, dataTemp);
  const { error } = await supabase.from('chat_estado').upsert({
    chat_usuario_id: chatUserId,
    flujo_actual: flujo,
    paso: paso,
    data_temp: dataTemp,
    updated_at: new Date().toISOString()
  });
  if (error) console.error(`[DB] Error saving state:`, error.message);
}

async function clearConversationState(chatUserId) {
  await ensureAuth();
  await supabase.from('chat_estado').delete().eq('chat_usuario_id', chatUserId);
}

// ═══════════════════════════════════════════
// APU QUERIES
// ═══════════════════════════════════════════
async function searchAPUs(query, limit = 5) {
  await ensureAuth();
  const { data } = await supabase.from('apu').select('id, nombre, unidad, rendimiento, codigo, categoria_apu')
    .ilike('nombre', `%${query}%`).limit(limit);
  return data || [];
}

async function getAPU(apuId, visited = new Set()) {
  await ensureAuth();
  if (visited.has(apuId)) return null;
  visited.add(apuId);

  const { data: apu } = await supabase.from('apu').select('*').eq('id', apuId).single();
  if (!apu) return null;

  const { data: detalles } = await supabase.from('apu_detalle')
    .select('*, insumos(nombre, unidad, precio_unitario), cargos(nombre, precio_unitario, unidad), apu_hijo:apu_hijo_id(nombre)')
    .eq('apu_id', apuId);

  // Traer ofertas de mercado para fallbacks
  const { data: ofertas } = await supabase.from('mk_ofertas').select('*');

  let costoTotal = 0;
  const detallesCalculados = [];

  for (const det of (detalles || [])) {
    let subtotal = 0;
    let nombre = 'Desconocido';
    let precio_un = 0;

    const factor = (det.cantidad || 0) * (1 + (det.desperdicio_pct || 0) / 100);
    const hmFactor = 1 + (det.herramienta_menor_pct || 0) / 100;

    if (det.insumo_id) {
      nombre = det.insumos?.nombre || 'Insumo s/n';
      precio_un = Number(det.insumos?.precio_unitario) || 0;
      if (precio_un === 0) {
        // Fallback a mercado
        const mk = (ofertas || []).filter(o => o.insumo_id === det.insumo_id).sort((a,b) => (a.precio_venta||0) - (b.precio_venta||0))[0];
        precio_un = mk ? Number(mk.precio_venta) : 0;
      }
      subtotal = factor * precio_un;
    } 
    else if (det.cargo_id) {
      nombre = det.cargos?.nombre || 'Cargo s/n';
      let p_base = Number(det.cargos?.precio_unitario) || 0;
      const uCargo = (det.cargos?.unidad || 'día').toLowerCase();
      const uDet = (det.unidad_detalle || 'hr').toLowerCase();
      
      let p_hr = p_base;
      if (uCargo === 'mes') p_hr = p_base / 192;
      else if (uCargo === 'día' || uCargo === 'dia') p_hr = p_base / 8;

      if (uDet === 'hora' || uDet === 'hr') precio_un = p_hr;
      else if (uDet === 'día' || uDet === 'dia') precio_un = p_hr * 8;
      else precio_un = p_hr;

      subtotal = factor * precio_un * hmFactor;
    }
    else if (det.apu_hijo_id) {
      nombre = det.apu_hijo?.nombre ? `[APU] ${det.apu_hijo.nombre}` : 'Sub-APU';
      const subApu = await getAPU(det.apu_hijo_id, new Set(visited));
      if (subApu) {
        precio_un = Number(subApu.costoTotal) || 0;
        subtotal = factor * precio_un;
      }
    }

    costoTotal += (subtotal || 0);
    detallesCalculados.push({
      ...det,
      nombre_componente: nombre,
      precio_unitario: precio_un,
      subtotal: subtotal || 0
    });
  }

  apu.detalles = detallesCalculados;
  apu.costoTotal = costoTotal;
  return apu;
}

async function getAPUsByCategory(categoria, limit = 10) {
  await ensureAuth();
  const { data } = await supabase.from('apu').select('id, nombre, unidad, codigo, categoria_apu')
    .ilike('categoria_apu', `%${categoria}%`).limit(limit);
  return data || [];
}

async function getCategories() {
  await ensureAuth();
  const { data } = await supabase.from('apu').select('categoria_apu');
  return [...new Set((data || []).map(d => d.categoria_apu).filter(Boolean))].sort();
}

// ═══════════════════════════════════════════
// INSUMOS
// ═══════════════════════════════════════════
async function searchInsumos(query, limit = 5) {
  await ensureAuth();
  const { data } = await supabase.from('insumos').select('id, nombre, unidad, precio_unitario, categoria, tipo')
    .ilike('nombre', `%${query}%`).limit(limit);
  return data || [];
}

// ═══════════════════════════════════════════
// COTIZACIONES
// ═══════════════════════════════════════════
async function createCotizacion(chatUserId, items, total, clienteNombre = null) {
  await ensureAuth();
  const { data } = await supabase.from('chat_cotizaciones').insert({
    chat_usuario_id: chatUserId, items, total, estado: 'enviada', cliente_nombre: clienteNombre
  }).select().single();
  return data;
}

async function getCotizaciones(chatUserId) {
  await ensureAuth();
  const { data } = await supabase.from('chat_cotizaciones').select('*')
    .eq('chat_usuario_id', chatUserId).order('created_at', { ascending: false }).limit(5);
  return data || [];
}

// ═══════════════════════════════════════════
// PROYECTOS
// ═══════════════════════════════════════════
async function getProyectos() {
  await ensureAuth();
  const { data } = await supabase.from('proyectos').select('id, nombre, estado, ubicacion').limit(20);
  return data || [];
}

async function createProyecto(nombre, ubicacion, latLng, cliente, tipoObra, opts = {}) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data.user.id;
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  const ts = Date.now().toString().slice(-4);
  const codigo = 'TG-' + nombre.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() + '-' + ts + rand;
  const ubicFinal = latLng 
    ? `${ubicacion || ''} (GPS: ${latLng.latitude}, ${latLng.longitude})`.trim()
    : (ubicacion || '');
  const insertData = {
    nombre, 
    ubicacion: ubicFinal, 
    estado: 'PLANEACION', 
    user_id: uid, 
    codigo,
    cliente: cliente || null,
    tipo_obra: tipoObra || 'residencial',
    aiu_admin: 10,
    aiu_imprev: 5,
    aiu_utilidad: 5,
    aiu_iva: 19,
    aiu_retefuente: 0,
    // Auditoría
    creado_por: opts.creado_por || null,
    plataforma_origen: opts.plataforma || 'telegram',
  };
  if (opts.cliente_id) insertData.cliente_id = opts.cliente_id;

  const { data, error } = await supabase.from('proyectos').insert(insertData).select().single();
  if (error) {
    console.error('❌ Error creando proyecto:', error.message, error.details, error.hint);
    return { error: error.message };
  }
  
  // Nota: Los clientes se gestionan en la tabla 'clientes' (CRM), NO en 'personal'
  // La creación CRM se maneja en findOrCreateChatUser y en el flujo de /nuevoproyecto

  // Auto-promover cliente a 'activo' en CRM
  if (opts.cliente_id) {
    await supabase.from('clientes').update({ estado: 'activo', updated_at: new Date().toISOString() }).eq('id', opts.cliente_id);
    console.log(`📇 CRM: Cliente ${cliente} promovido a activo (proyecto: ${nombre})`);
  }

  return data;
}

// Crear o vincular cliente en CRM
async function createOrLinkCRMClient({ nombre, telefono, email, whatsapp, telegram_id, origen, creado_por, plataforma }) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data.user.id;

  // Buscar si ya existe por nombre, telefono o telegram_id
  let existing = null;
  if (telegram_id) {
    const { data } = await supabase.from('clientes').select('id, nombre')
      .eq('telegram_id', telegram_id).maybeSingle();
    existing = data;
  }
  if (!existing && telefono) {
    const { data } = await supabase.from('clientes').select('id, nombre')
      .eq('telefono', telefono).maybeSingle();
    existing = data;
  }
  if (!existing && nombre) {
    const { data } = await supabase.from('clientes').select('id, nombre')
      .ilike('nombre', nombre).maybeSingle();
    existing = data;
  }

  if (existing) {
    // Actualizar campos vacíos
    const updates = {};
    if (telegram_id && !existing.telegram_id) updates.telegram_id = telegram_id;
    if (telefono && !existing.telefono) updates.telefono = telefono;
    if (email && !existing.email) updates.email = email;
    if (Object.keys(updates).length > 0) {
      await supabase.from('clientes').update(updates).eq('id', existing.id);
    }
    return { id: existing.id, nombre: existing.nombre, created: false };
  }

  // Crear nuevo cliente
  const insertData = {
    nombre: nombre || 'Cliente Sin Nombre',
    estado: 'prospecto',
    origen: origen || 'telegram',
    creado_por: creado_por || 'Bot Telegram',
    plataforma: plataforma || 'telegram',
    user_id: uid
  };
  if (telefono) insertData.telefono = telefono;
  if (email) insertData.email = email;
  if (whatsapp) insertData.whatsapp = whatsapp;
  if (telegram_id) insertData.telegram_id = telegram_id;

  try {
    const { data, error } = await supabase.from('clientes').insert(insertData).select().single();
    if (error) throw error;
    console.log(`📇 CRM: Nuevo cliente creado: ${nombre} (id: ${data.id})`);
    return { id: data.id, nombre: data.nombre, created: true };
  } catch (e) {
    console.error('Error en CRM:', e.message);
    return { error: e.message };
  }
}

// Actualizar datos de cliente CRM
async function updateCRMClient(clienteId, updates) {
  await ensureAuth();
  const { error } = await supabase.from('clientes').update({
    ...updates,
    updated_at: new Date().toISOString()
  }).eq('id', clienteId);
  if (error) console.error('Error actualizando cliente CRM:', error.message);
  return !error;
}

async function getPersonal() {
  await ensureAuth();
  const { data } = await supabase.from('personal').select('*').limit(50);
  return data || [];
}

async function createPersonal(nombre, email, app_role, profesion) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data.user.id;
  const { data, error } = await supabase.from('personal').insert({
    id: require('crypto').randomUUID(), nombre, email, app_role, profesion, user_id: uid
  }).select().single();
  return { data, error };
}

async function searchPersonal(query) {
  await ensureAuth();
  const { data } = await supabase.from('personal').select('*').ilike('nombre', `%${query}%`).limit(10);
  return data || [];
}

async function getCargos() {
  await ensureAuth();
  const { data } = await supabase.from('cargos').select('*').limit(50);
  return data || [];
}

// ═══════════════════════════════════════════
// ASISTENCIA (Entrada/Salida)
// ═══════════════════════════════════════════
async function registrarEntrada(chatUserId, proyectoId, proyectoNombre, nota) {
  await ensureAuth();
  const { data, error } = await supabase.from('chat_asistencia').insert({
    chat_usuario_id: chatUserId,
    proyecto_id: proyectoId,
    proyecto_nombre: proyectoNombre,
    tipo: 'entrada',
    hora: new Date().toISOString(),
    nota: nota || null
  }).select().single();
  if (error) return { error: error.message };
  return { data };
}

async function registrarSalida(chatUserId, proyectoId, proyectoNombre, nota) {
  await ensureAuth();
  const { data, error } = await supabase.from('chat_asistencia').insert({
    chat_usuario_id: chatUserId,
    proyecto_id: proyectoId,
    proyecto_nombre: proyectoNombre,
    tipo: 'salida',
    hora: new Date().toISOString(),
    nota: nota || null
  }).select().single();
  if (error) return { error: error.message };
  return { data };
}

async function getAsistenciaHoy(chatUserId) {
  await ensureAuth();
  const hoy = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('chat_asistencia').select('*')
    .eq('chat_usuario_id', chatUserId)
    .gte('hora', hoy + 'T00:00:00')
    .lte('hora', hoy + 'T23:59:59')
    .order('hora', { ascending: true });
  return data || [];
}

// ═══════════════════════════════════════════
// INFORMES / AVANCES
// ═══════════════════════════════════════════
async function registrarAvance(chatUserId, proyectoId, proyectoNombre, actividad, cantidad, unidad, nota) {
  await ensureAuth();
  const { data, error } = await supabase.from('chat_avances').insert({
    chat_usuario_id: chatUserId,
    proyecto_id: proyectoId,
    proyecto_nombre: proyectoNombre,
    actividad,
    cantidad: parseFloat(cantidad) || 0,
    unidad: unidad || '',
    nota: nota || null,
    fecha: new Date().toISOString()
  }).select().single();
  if (error) return { error: error.message };
  return { data };
}

async function getAvancesHoy(proyectoId) {
  await ensureAuth();
  const hoy = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('chat_avances').select('*')
    .eq('proyecto_id', proyectoId)
    .gte('fecha', hoy + 'T00:00:00')
    .order('fecha', { ascending: false });
  return data || [];
}

async function getAvancesRecientes(chatUserId, limit = 5) {
  await ensureAuth();
  const { data } = await supabase.from('chat_avances').select('*')
    .eq('chat_usuario_id', chatUserId)
    .order('fecha', { ascending: false }).limit(limit);
  return data || [];
}

async function crearInformeDiario(chatUserId, proyectoId, proyectoNombre, contenido) {
  await ensureAuth();
  const { data, error } = await supabase.from('chat_informes').insert({
    chat_usuario_id: chatUserId,
    proyecto_id: proyectoId,
    proyecto_nombre: proyectoNombre,
    contenido,
    fecha: new Date().toISOString()
  }).select().single();
  if (error) return { error: error.message };
  return { data };
}

// ═══════════════════════════════════════════
// PRESUPUESTO ITEMS (desde cotización)
// ═══════════════════════════════════════════
async function createPresupuestoItems(proyectoId, items) {
  await ensureAuth();
  const uid = (await supabase.auth.getUser()).data?.user?.id || null;
  const rows = items.map((item, i) => ({
    proyecto_id: proyectoId,
    apu_id: item.apu_id,
    cantidad: item.cantidad,
    capitulo: 'GENERAL',
    orden: i,
    num_cuadrillas: 1,
    user_id: uid,
  }));
  const { data, error } = await supabase.from('presupuesto_items').insert(rows).select();
  if (error) return { error: error.message };
  return { data };
}

async function searchClientes(query, limit = 5) {
  await ensureAuth();
  const { data } = await supabase.from('clientes')
    .select('id, nombre, email, telefono, empresa')
    .ilike('nombre', `%${query}%`)
    .order('nombre', { ascending: true })
    .limit(limit);
  return data || [];
}

async function getCliente(id) {
  await ensureAuth();
  const { data } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
  return data;
}

module.exports = {
  ensureAuth,
  syncIdentity,
  findOrCreateChatUser,
  getUserRole,
  vincularEmail,
  registrarPersonal,
  createCotizacion,
  getCotizaciones,
  setConversationState,
  getConversationState,
  clearConversationState,
  logMessage,
  getCategories,
  getAPUsByCategory,
  getAPU,
  searchAPUs,
  searchInsumos,
  getProyectos,
  createProyecto,
  createOrLinkCRMClient,
  updateCRMClient,
  registrarEntrada,
  registrarSalida,
  getAsistenciaHoy,
  registrarAvance,
  getAvancesHoy,
  getAvancesRecientes,
  crearInformeDiario,
  createPresupuestoItems,
  getPersonal,
  searchClientes,
  getCliente
};
