/**
 * telegram-bot/bot.js — ERP Construcción Telegram Bot v2
 * Flujos: /start, /login, /cotizar, /insumos, /categorias, /proyectos,
 *         /nuevoproyecto, /entrada, /salida, /avance, /informe, /personal, /ayuda
 */
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const copilotCliente = require('./copilot/cliente');
const copilotCuadrilla = require('./copilot/cuadrilla');
const ai = require('./copilot/ai');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
if (!TOKEN) { console.error('❌ Set TELEGRAM_BOT_TOKEN'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 Bot ERP Construcción v2 iniciado...');

// Helper para enviar mensajes y registrarlos en el historial del ERP
async function sendReply(chatId, text, options = {}) {
  try {
    const res = await bot.sendMessage(chatId, text, options);
    // Intentar registrar el mensaje saliente en el historial
    db.findOrCreateChatUser(chatId, 'Usuario', '').then(u => {
      db.logMessage(u.id, 'out', text).catch(e => console.warn('[Bot] Error logging out message:', e.message));
    }).catch(() => {});
    return res;
  } catch (err) {
    console.error('[Bot] Error sending message:', err.message);
    throw err;
  }
}

bot.on('contact', async (msg) => {
  try {
    const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
    const st = await db.getConversationState(u.id);
    const contact = msg.contact;
    const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Cliente';
    const phone = contact.phone_number;
    const creadoPor = msg.from.first_name || msg.from.username || 'Telegram';

    if (st?.flujo_actual === 'crear_proyecto' && st.paso === 2) {
      // Dentro del flujo de proyecto → crear cliente y avanzar a ubicación
      const res = await db.createOrLinkCRMClient({
        nombre: name,
        telefono: phone,
        whatsapp: phone,
        origen: 'telegram',
        plataforma: 'telegram',
        creado_por: creadoPor
      });
      const dt = st.data_temp || {};
      const updatedDt = { ...dt, cliente: name, cliente_id: res.id };
      await db.setConversationState(u.id, 'crear_proyecto', 3, updatedDt);
      await bot.sendMessage(msg.chat.id, `✅ Cliente registrado desde contacto: *${name}*\n📞 Tel: ${phone}\n\n📍 ¿Ubicación del proyecto?\n\nEscribe la dirección o envía tu 📌 ubicación GPS`, { parse_mode: 'Markdown' });
    } else {
      // Fuera de flujo → agregar al CRM directamente
      const res = await db.createOrLinkCRMClient({
        nombre: name,
        telefono: phone,
        whatsapp: phone,
        origen: 'telegram',
        plataforma: 'telegram',
        creado_por: creadoPor
      });
      const statusMsg = res.created ? '✅ Cliente agregado al CRM' : '🔗 Cliente ya existente en CRM';
      await bot.sendMessage(msg.chat.id, `${statusMsg}:\n\n👤 *${name}*\n📞 ${phone}`, { parse_mode: 'Markdown' });
    }
  } catch (e) {
    console.error('Contact handler error:', e.message);
  }
});

const fmt = n => '$ ' + Number(n||0).toLocaleString('es-CO', {maximumFractionDigits:0});
const esc = t => String(t||'').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

// ═══ RBAC: Role-Based Access Control ═══
// Roles: admin (todo), operativo (campo+lectura), bodega (lectura+inventario), cuadrilla (entrada/salida/avance), null (solo lectura)
const PERMS = {
  // Lectura libre (sin vincular)
  read:     ['admin','operativo','bodega','cuadrilla','tienda','cliente', null],
  // Seguimiento de proyectos (cliente puede ver sus proyectos)
  track:    ['admin','operativo','cliente'],
  // Campo: entrada/salida/avance/informe
  field:    ['admin','operativo','cuadrilla'],
  // Gestión: crear proyectos, personal
  manage:   ['admin','operativo'],
  // Admin: todo
  admin:    ['admin'],
};

async function checkAccess(chatUserId, level) {
  const userInfo = await db.getUserRole(chatUserId);
  if (!userInfo) {
    // Not linked = only read access
    return level === 'read' ? { ok: true, role: null, nombre: 'Invitado' } : { ok: false, role: null };
  }
  const allowed = PERMS[level] || [];
  return { ok: allowed.includes(userInfo.role), role: userInfo.role, nombre: userInfo.nombre };
}

async function requireLinked(chatId, chatUserId) {
  const access = await checkAccess(chatUserId, 'field');
  if (!access.ok) {
    await bot.sendMessage(chatId, '🔒 Necesitas vincular tu cuenta primero.\n\nUsa /login tu@email.com');
    return false;
  }
  return access;
}

async function requireRole(chatId, chatUserId, level) {
  const access = await checkAccess(chatUserId, level);
  if (!access.ok) {
    const roleNames = { admin: 'Administrador', manage: 'Operativo o Admin', field: 'Cuadrilla o superior' };
    await bot.sendMessage(chatId, `🚫 Acceso denegado.\nNecesitas rol: *${roleNames[level] || level}*\n\nTu rol actual: _${access.role || 'Sin vincular'}_`, {parse_mode:'Markdown'});
    return false;
  }
  return access;
}

// ─── /start ───
bot.onText(/\/start/, async (msg) => {
  try {
    const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
    const userInfo = await db.getUserRole(u.id);
    
    if (!userInfo) {
      // Not linked — Cliente/Visitante mode
      return sendReply(msg.chat.id, copilotCliente.getWelcome(msg.from.first_name), { parse_mode: 'Markdown' });
    }
    
    const role = userInfo.role || 'cuadrilla';
    
    if (role === 'cuadrilla') {
      return sendReply(msg.chat.id, copilotCuadrilla.getWelcome(msg.from.first_name), { parse_mode: 'Markdown' });
    }

    const roleEmoji = {admin:'🔑',operativo:'🏗️',cuadrilla:'📲',bodega:'📦',cliente:'👁️',tienda:'🛒'};
    let menu = `${roleEmoji[role]||'👤'} *${userInfo.nombre}* — ${role.toUpperCase()}\n\n`;
    
    if (role === 'admin' || role === 'operativo') {
      menu += '📊 /reporte — Resumen del día\n📋 /proyectos — Ver proyectos\n🆕 /nuevoproyecto — Crear proyecto\n👷 /personal — Ver personal\n';
    }
    if (['admin','operativo','cuadrilla'].includes(role)) {
      menu += '✅ /entrada — Check-in obra\n🔴 /salida — Check-out\n📈 /avance — Reportar avance\n📝 /informe — Informe diario\n';
    }
    menu += '💰 /cotizar — Cotizar obra\n🔍 /insumos — Buscar materiales\n📁 /categorias — Categorías APU\n🔗 /login — Vincular cuenta\n❓ /ayuda — Comandos';
    
    await sendReply(msg.chat.id, menu, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] Error in /start:', err.message);
    bot.sendMessage(msg.chat.id, '❌ Lo siento, hubo un error al iniciar el bot. Por favor intenta de nuevo.');
  }
});

// ─── /login [email] ───
bot.onText(/\/login(.*)/, async (msg, match) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const email = (match[1]||'').trim();
  if (!email || !email.includes('@')) {
    await db.setConversationState(u.id, 'login', 0);
    return bot.sendMessage(msg.chat.id, '🔗 Escribe tu email para vincular o registrarte:\n\nEjemplo: tu@email.com');
  }
  const res = await db.vincularEmail(u.id, email, msg.from.id);
  if (res.ok) {
    const name = res.personal?.nombre || email;
    const role = res.app_role || 'cuadrilla';
    const roleEmoji = {admin:'🔑 Admin',operativo:'🏗️ Operativo',bodega:'📦 Bodega',cuadrilla:'📲 Cuadrilla',tienda:'🛒 Tienda',cliente:'👁️ Cliente'};
    await bot.sendMessage(msg.chat.id, `✅ ¡Cuenta vinculada!\n👤 ${name}\n📧 ${email}\n🎭 Rol: ${roleEmoji[role]||role}\n\nAhora puedes usar los comandos según tu rol.`);
  } else if (res.not_found) {
    // Email not registered — offer to create account
    await db.setConversationState(u.id, 'registro', 1, { email });
    await bot.sendMessage(msg.chat.id, `📋 El email *${email}* no está registrado en el ERP.\n\n¿Deseas registrarte? Escribe tu *nombre completo*:`, {parse_mode:'Markdown'});
  } else {
    await bot.sendMessage(msg.chat.id, `❌ ${res.error || 'Error vinculando.'}`);
  }
});

// ─── /cotizar (guided flow for everyone) ───
bot.onText(/\/cotizar/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  await db.setConversationState(u.id, 'cot_tipo', 0, { items: [] });
  const tipos = Object.entries(copilotCliente.TIPOS_PROYECTO).map(([k, v]) => `${k}. ${v.label}`).join('\n');
  await bot.sendMessage(msg.chat.id,
    `💰 *Cotización de Proyecto*\n\n¿Qué tipo de proyecto necesitas?\n\n${tipos}\n\n_Escribe el número:_`,
    { parse_mode: 'Markdown' });
});

// ─── /insumos [query] ───
bot.onText(/\/insumos(.*)/, async (msg, match) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const q = (match[1]||'').trim();
  if (!q) {
    await db.setConversationState(u.id, 'buscar_insumo', 0);
    return bot.sendMessage(msg.chat.id, '🔍 ¿Qué insumo buscas?\nEjemplo: cemento');
  }
  await showInsumos(msg.chat.id, q);
});

// ─── /categorias ───
bot.onText(/\/categorias/, async (msg) => {
  const cats = await db.getCategories();
  if (!cats.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay categorías.');
  const kb = cats.map(c => ([{ text: `📁 ${c}`, callback_data: `cat:${c.substring(0,60)}` }]));
  await bot.sendMessage(msg.chat.id, '📁 *Categorías de APU:*', { parse_mode:'Markdown', reply_markup:{inline_keyboard:kb} });
});

// ─── /proyectos ───
bot.onText(/\/proyectos/, async (msg) => {
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '📋 No hay proyectos. Usa /nuevoproyecto');
  let txt = '📋 *Proyectos:*\n\n';
  ps.forEach(p => {
    const e = p.estado==='activo'?'🟢':p.estado==='pausado'?'🟡':'⚪';
    txt += `${e} *${p.nombre}*\n   📍 ${p.ubicacion||'Sin ubicación'}\n\n`;
  });
  await bot.sendMessage(msg.chat.id, txt, { parse_mode:'Markdown' });
});

// ─── /nuevoproyecto (clients and up can create) ───
bot.onText(/\/nuevoproyecto/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  await db.setConversationState(u.id, 'crear_proyecto', 1, { cliente_telegram: msg.from.first_name });
  await bot.sendMessage(msg.chat.id, '🆕 *Crear nuevo proyecto*\n\n📝 ¿Cuál es el nombre del proyecto?', {parse_mode:'Markdown'});
});

// ─── /entrada (FIELD role required) ───
bot.onText(/\/entrada/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'field');
  if (!access) return;
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay proyectos activos.');
  const kb = ps.filter(p=>p.estado==='activo').map(p => ([{ text: `🏗️ ${p.nombre}`, callback_data: `ent:${p.id.substring(0,30)}:${p.nombre.substring(0,25)}` }]));
  await bot.sendMessage(msg.chat.id, '✅ *Registrar entrada*\n¿En qué proyecto?', {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
});

// ─── /salida (FIELD role required) ───
bot.onText(/\/salida/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'field');
  if (!access) return;
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay proyectos activos.');
  const kb = ps.filter(p=>p.estado==='activo').map(p => ([{ text: `🏗️ ${p.nombre}`, callback_data: `sal:${p.id.substring(0,30)}:${p.nombre.substring(0,25)}` }]));
  await bot.sendMessage(msg.chat.id, '🔴 *Registrar salida*\n¿De qué proyecto?', {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
});

// ─── /avance (FIELD role required) ───
bot.onText(/\/avance/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'field');
  if (!access) return;
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay proyectos.');
  const kb = ps.filter(p=>p.estado==='activo').map(p => ([{ text: `📈 ${p.nombre}`, callback_data: `ava:${p.id.substring(0,30)}:${p.nombre.substring(0,25)}` }]));
  await bot.sendMessage(msg.chat.id, '📈 *Reportar avance*\n¿En qué proyecto?', {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
});

// ─── /informe (FIELD role required) ───
bot.onText(/\/informe/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'field');
  if (!access) return;
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay proyectos.');
  const kb = ps.filter(p=>p.estado==='activo').map(p => ([{ text: `📝 ${p.nombre}`, callback_data: `inf:${p.id.substring(0,30)}:${p.nombre.substring(0,25)}` }]));
  await bot.sendMessage(msg.chat.id, '📝 *Informe diario*\n¿De qué proyecto?', {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
});

// ─── /pedido (FIELD role required) ───
bot.onText(/\/pedido/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'field');
  if (!access) return;
  const ps = await db.getProyectos();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '⚠️ No hay proyectos activos.');
  const kb = ps.filter(p=>p.estado==='activo').map(p => ([{ text: `📦 ${p.nombre}`, callback_data: `ped:${p.id.substring(0,30)}:${p.nombre.substring(0,25)}` }]));
  await bot.sendMessage(msg.chat.id, '📦 *Solicitar Materiales*\n¿Para qué proyecto?', {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
});

// ─── /personal (MANAGE role required) ───
bot.onText(/\/personal/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const access = await requireRole(msg.chat.id, u.id, 'manage');
  if (!access) return;
  const ps = await db.getPersonal();
  if (!ps.length) return bot.sendMessage(msg.chat.id, '👷 No hay personal registrado.');
  let txt = '👷 *Personal:*\n\n';
  ps.slice(0,15).forEach(p => { txt += `• *${p.nombre}* — ${p.profesion||''} ${p.rol_proyecto?'('+p.rol_proyecto+')':''}\n`; });
  if (ps.length > 15) txt += `\n_...y ${ps.length-15} más_`;
  await bot.sendMessage(msg.chat.id, txt, {parse_mode:'Markdown'});
});

// ─── /ver (ver presupuesto en cotización) ───
bot.onText(/\/ver/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const st = await db.getConversationState(u.id);
  if (st?.flujo_actual?.startsWith('cot_') || st?.flujo_actual === 'cot_buscar') {
    await copilotCliente.showPresupuesto(bot, msg.chat.id, st.data_temp || {});
  } else {
    await bot.sendMessage(msg.chat.id, '⚠️ No hay cotización activa. Usa /cotizar para comenzar.');
  }
});

// ─── /listo (finalizar cotización) ───
bot.onText(/\/listo/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const st = await db.getConversationState(u.id);
  if (st?.flujo_actual?.startsWith('cot_')) {
    const dt = st.data_temp || {};
    const items = dt.items || [];
    if (!items.length) {
      return bot.sendMessage(msg.chat.id, '⚠️ Agrega al menos una actividad al presupuesto.');
    }
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
    
    // Guardar cotización en DB
    await db.createCotizacion(u.id, items, total);
    
    // Mantener items en estado para poder crear proyecto después
    await db.setConversationState(u.id, 'cot_finalizar', 0, dt);
    
    await bot.sendMessage(msg.chat.id,
      `✅ *¡Cotización guardada!*\n\n` +
      `🧾 ${items.length} actividades\n` +
      `💰 Total: *${fmt(total)}*\n` +
      `🏗️ Tipo: ${dt.tipo_label || 'Obra'}\n\n` +
      `¿Deseas crear un proyecto con este presupuesto?`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '🏗️ Sí, crear proyecto', callback_data: 'cot_crear_proyecto' }],
          [{ text: '✅ No, ya terminé', callback_data: 'cot_solo_guardar' }],
        ]}
      });
  } else {
    await bot.sendMessage(msg.chat.id, '⚠️ No hay cotización activa. Usa /cotizar para comenzar.');
  }
});

// ─── /cancelar ───
bot.onText(/\/cancelar/, async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  await db.clearConversationState(u.id);
  await bot.sendMessage(msg.chat.id, '❌ Operación cancelada.');
});

// ─── /ayuda ───
bot.onText(/\/ayuda/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    '🏗️ *Comandos:*\n\n' +
    '📊 /cotizar — Cotizar APUs\n🔍 /insumos — Buscar materiales\n📁 /categorias — Categorías\n' +
    '📋 /proyectos — Ver proyectos\n🆕 /nuevoproyecto — Crear proyecto\n' +
    '✅ /entrada — Check-in obra\n🔴 /salida — Check-out obra\n' +
    '📈 /avance — Reportar avance\n📝 /informe — Informe diario\n' +
    '📦 /pedido — Solicitar materiales a bodega\n' +
    '👷 /personal — Ver personal\n🔗 /login — Vincular cuenta\n' +
    '🛒 /micotizacion — Ver cotización\n❌ /cancelar — Cancelar', {parse_mode:'Markdown'});
});

// ═══════════════════════════════════════════
// CALLBACK QUERIES (inline buttons)
// ═══════════════════════════════════════════
bot.on('callback_query', async (q) => {
  const u = await db.findOrCreateChatUser(q.from.id, q.from.first_name, q.from.username);
  const d = q.data;
  const cid = q.message.chat.id;
  try {
    if (d === 'cot_ver_categorias') {
      const cats = await db.getCategories();
      const kb = cats.map(c => ([{ text: `📁 ${c}`, callback_data: `cat:${c}` }]));
      return bot.sendMessage(cid, '📁 *Selecciona una categoría:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
    }
    if (d === 'cot_ver_presupuesto') {
      const st = await db.getConversationState(u.id);
      return copilotCliente.showPresupuesto(bot, cid, st?.data_temp || {});
    }

    if (d.startsWith('cat:')) {
      const apus = await db.getAPUsByCategory(d.replace('cat:',''), 10);
      if (!apus.length) return bot.answerCallbackQuery(q.id, {text:'Vacía'});
      const kb = apus.map(a => ([{text:`${a.nombre} (${a.unidad})`, callback_data:`apu:${a.id.substring(0,60)}`}]));
      await bot.editMessageText(`📁 *${d.replace('cat:','')}:*`, {chat_id:cid, message_id:q.message.message_id, parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
    }
    else if (d.startsWith('apu:')) {
      const apu = await db.getAPU(d.replace('apu:',''));
      if (!apu) return bot.answerCallbackQuery(q.id, {text:'No encontrado'});
      await showAPUDetail(cid, apu);
      await bot.answerCallbackQuery(q.id);
    }
    else if (d.startsWith('addcot:')) {
      const apu = await db.getAPU(d.replace('addcot:',''));
      if (!apu) return;
      const st = await db.getConversationState(u.id);
      await db.setConversationState(u.id, 'cot_cantidad', 0, {
        apu_id:apu.id, apu_nombre:apu.nombre, apu_unidad:apu.unidad,
        items: st?.data_temp?.items || []
      });
      await bot.sendMessage(cid, `📏 *${apu.nombre}*\n¿Cuántos *${apu.unidad}*?`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Copilot: APU seleccionado en cotización guiada ───
    else if (d.startsWith('cotapu:')) {
      await copilotCliente.handleAPUCallback(bot, q, u, d.replace('cotapu:', ''));
    }
    // ─── Cotización → Crear Proyecto ───
    else if (d === 'cot_crear_proyecto') {
      await copilotCliente.handleConvertToProject(bot, cid, u);
      await bot.answerCallbackQuery(q.id);
    }
    else if (d === 'cot_solo_guardar') {
      await db.clearConversationState(u.id);
      await bot.sendMessage(cid, '✅ Cotización guardada en el CRM.\n\nPuedes crear un proyecto después con /nuevoproyecto\n/cotizar — Nueva cotización');
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Proyecto: Selección de cliente ───
    else if (d === 'proj_client:search') {
      const st = await db.getConversationState(u.id);
      const dt = st?.data_temp || {};
      await db.setConversationState(u.id, 'crear_proyecto', 2, dt);
      await bot.sendMessage(cid, '🔍 *Buscar Cliente*\n\nEscribe el nombre del cliente para buscarlo en el CRM o compártenos un contacto:', { parse_mode: 'Markdown' });
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Proyecto: Seleccionar cliente buscado ───
    else if (d.startsWith('proj_sel_client:')) {
      const cid_crm = d.replace('proj_sel_client:', '');
      const st = await db.getConversationState(u.id);
      if (!st || st.flujo_actual !== 'crear_proyecto') return bot.answerCallbackQuery(q.id);
      
      const cliente = await db.getCliente(cid_crm);
      const updatedDt = { ...st.data_temp, cliente: cliente?.nombre, cliente_id: cid_crm };
      await db.setConversationState(u.id, 'crear_proyecto', 3, updatedDt);
      
      await bot.sendMessage(cid, `✅ Cliente seleccionado: *${cliente?.nombre}*\n\n📍 ¿Ubicación del proyecto?\n\nEscribe la dirección o envía tu 📌 ubicación GPS`, { parse_mode: 'Markdown' });
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Proyecto: Crear nuevo cliente desde búsqueda ───
    else if (d.startsWith('proj_new_client:')) {
      const nombre = d.replace('proj_new_client:', '');
      const st = await db.getConversationState(u.id);
      if (!st || st.flujo_actual !== 'crear_proyecto') return bot.answerCallbackQuery(q.id);
      
      const creadoPor = q.from.first_name || q.from.username || 'Telegram';
      const res = await db.createOrLinkCRMClient({ nombre, origen: 'telegram', plataforma: 'telegram', creado_por: creadoPor });
      const updatedDt = { ...st.data_temp, cliente: nombre, cliente_id: res.id };
      await db.setConversationState(u.id, 'crear_proyecto', 3, updatedDt);
      
      await bot.sendMessage(cid, `👤 Cliente *${nombre}* creado en CRM.\n\n📍 ¿Ubicación del proyecto?\n\nEscribe la dirección o envía tu 📌 ubicación GPS`, { parse_mode: 'Markdown' });
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Proyecto: Info opcional del cliente ───
    else if (d.startsWith('proj_info:')) {
      const action = d.replace('proj_info:', '');
      const st = await db.getConversationState(u.id);
      if (!st || st.flujo_actual !== 'crear_proyecto') return bot.answerCallbackQuery(q.id);
      const dt = st.data_temp;

      if (action === 'email') {
        await db.setConversationState(u.id, 'crear_proyecto', 4, dt);
        await bot.sendMessage(cid, '📧 Escribe el email del cliente:', { parse_mode: 'Markdown' });
      }
      else if (action === 'phone') {
        await db.setConversationState(u.id, 'crear_proyecto', 5, dt);
        await bot.sendMessage(cid, '📱 Escribe el teléfono del cliente:', { parse_mode: 'Markdown' });
      }
      if (action === 'skip') {
        const currentSt = await db.getConversationState(u.id);
        const currentDt = currentSt?.data_temp || dt;
        console.log('[Bot] Skipping info. Preserving DT:', currentDt);
        await db.setConversationState(u.id, 'crear_proyecto', 3, currentDt);
        await bot.sendMessage(cid, "📍 ¿Ubicación del proyecto?\n\nEscribe la dirección o envía tu 📌 ubicación GPS", { parse_mode: 'Markdown' });
      }
      await bot.answerCallbackQuery(q.id);
    }
    else if (d === 'enviar_cot') {
      const st = await db.getConversationState(u.id);
      if (!st?.data_temp?.items?.length) return;
      const total = st.data_temp.items.reduce((s,i)=>s+i.subtotal,0);
      await db.createCotizacion(u.id, st.data_temp.items, total);
      await bot.sendMessage(cid, `✅ *Cotización guardada*\nTotal: ${fmt(total)}`, {parse_mode:'Markdown'});
      await db.clearConversationState(u.id);
      await bot.answerCallbackQuery(q.id, {text:'✅ Guardada'});
    }
    else if (d === 'mas_items') {
      const st = await db.getConversationState(u.id);
      await db.setConversationState(u.id, 'cotizar_buscar', 0, st?.data_temp||{});
      await bot.sendMessage(cid, '🔍 ¿Qué más cotizar?');
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Entrada ───
    else if (d.startsWith('ent:')) {
      const [,pid,pname] = d.split(':');
      await db.setConversationState(u.id, 'entrada_nota', 0, {proyecto_id:pid, proyecto_nombre:pname});
      await bot.sendMessage(cid, `📍 *Entrada en: ${pname}*\n\nPor favor envía tu ubicación GPS 📌 para registrar la entrada.`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Salida ───
    else if (d.startsWith('sal:')) {
      const [,pid,pname] = d.split(':');
      await db.setConversationState(u.id, 'salida_nota', 0, {proyecto_id:pid, proyecto_nombre:pname});
      await bot.sendMessage(cid, `📍 *Salida de: ${pname}*\n\nPor favor envía tu ubicación GPS 📌 para registrar la salida.`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Avance (select project) ───
    else if (d.startsWith('ava:')) {
      const [,pid,pname] = d.split(':');
      await db.setConversationState(u.id, 'avance_actividad', 0, {proyecto_id:pid, proyecto_nombre:pname});
      await bot.sendMessage(cid, `📈 *Avance en: ${pname}*\n\n¿Qué actividad realizaste?\nEj: _Mampostería planta 1 - 80 M2_`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Informe (select project) ───
    else if (d.startsWith('inf:')) {
      const [,pid,pname] = d.split(':');
      await db.setConversationState(u.id, 'informe_contenido', 0, {proyecto_id:pid, proyecto_nombre:pname});
      await bot.sendMessage(cid, `📝 *Informe para: ${pname}*\n\nEscribe tu informe diario:`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
    // ─── Pedido (select project) ───
    else if (d.startsWith('ped:')) {
      const [,pid,pname] = d.split(':');
      await db.setConversationState(u.id, 'pedido_material', 0, {proyecto_id:pid, proyecto_nombre:pname});
      await bot.sendMessage(cid, `📦 *Pedido para: ${pname}*\n\n¿Qué material necesitas?\nEj: _Cemento, Varilla 1/2, Arena_`, {parse_mode:'Markdown'});
      await bot.answerCallbackQuery(q.id);
    }
  } catch(e) { console.error('CB error:', e.message); bot.answerCallbackQuery(q.id, {text:'Error'}); }
});

// ═══════════════════════════════════════════
// LOCATION MESSAGES (GPS)
// ═══════════════════════════════════════════
bot.on('location', async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const st = await db.getConversationState(u.id);
  const loc = msg.location;
  const gpsText = `📍 GPS: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
  
  // Si estamos creando proyecto paso 3 (ubicación GPS), usar la ubicación GPS
  if (st?.flujo_actual === 'crear_proyecto' && st.paso === 3) {
    const dt = st.data_temp;
    const res = await db.createProyecto(dt.nombre, '', loc, dt.cliente, dt.tipo_obra, { creado_por: dt.tg_name || msg.from.first_name, plataforma: 'telegram', cliente_id: dt.cliente_id });
    if (res.error) await bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    else await bot.sendMessage(msg.chat.id, `✅ *Proyecto creado:*\n🏗️ ${dt.nombre}\n👤 Cliente: ${dt.cliente || 'N/A'}\n${gpsText}\n🔗 [Ver en Google Maps](https://maps.google.com/?q=${loc.latitude},${loc.longitude})`, {parse_mode:'Markdown', disable_web_page_preview: true});
    await db.clearConversationState(u.id);
    return;
  }

  // Si estamos creando proyecto desde cotización (ubicación GPS)
  if (st?.flujo_actual === 'cot_proyecto_ubicacion') {
    const dt = st.data_temp;
    const items = dt.items || [];
    const clientName = u.nombre || msg.from.first_name || 'Cliente Telegram';
    const ubicacion = `GPS: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
    const res = await db.createProyecto(dt.proyecto_nombre, ubicacion, loc, clientName, dt.tipo_obra, { creado_por: clientName, plataforma: 'telegram' });
    if (res.error) {
      await db.clearConversationState(u.id);
      return bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    }
    const presRes = await db.createPresupuestoItems(res.id, items);
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    await db.clearConversationState(u.id);
    
    let response = `✅ *¡Proyecto y presupuesto creados!*\n\n🏗️ *${dt.proyecto_nombre}*\n👤 Cliente: ${clientName}\n${gpsText}\n🔗 [Ver en Maps](https://maps.google.com/?q=${loc.latitude},${loc.longitude})\n\n💰 *Total: ${fmt(total)}* (${items.length} ítems)\n\n_Tu proyecto ya está visible en el ERP web._`;
    if (presRes?.error) response += `\n⚠️ Error guardando ítems: ${presRes.error}`;
    try { await bot.sendMessage(msg.chat.id, response, {parse_mode:'Markdown', disable_web_page_preview: true}); }
    catch { await bot.sendMessage(msg.chat.id, response); }
    return;
  }
  
  // Si estamos registrando entrada, agregar GPS
  if (st?.flujo_actual === 'entrada_nota') {
    const res = await db.registrarEntrada(u.id, st.data_temp.proyecto_id, st.data_temp.proyecto_nombre, gpsText);
    const hora = new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    if (res.error) await bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    else await bot.sendMessage(msg.chat.id, `✅ *Entrada registrada*\n🏗️ ${st.data_temp.proyecto_nombre}\n🕐 ${hora}\n${gpsText}`, {parse_mode:'Markdown'});
    await db.clearConversationState(u.id);
    return;
  }

  // Si estamos registrando salida, agregar GPS
  if (st?.flujo_actual === 'salida_nota') {
    const res = await db.registrarSalida(u.id, st.data_temp.proyecto_id, st.data_temp.proyecto_nombre, gpsText);
    const hora = new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    if (res.error) await bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    else await bot.sendMessage(msg.chat.id, `🔴 *Salida registrada*\n🏗️ ${st.data_temp.proyecto_nombre}\n🕐 ${hora}\n${gpsText}`, {parse_mode:'Markdown'});
    await db.clearConversationState(u.id);
    return;
  }
  
  await bot.sendMessage(msg.chat.id, `📍 Ubicación recibida: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}\n\nPara usar GPS, primero inicia un flujo con /nuevoproyecto o /entrada`);
});

// ═══════════════════════════════════════════
// VOICE MESSAGES (Audio / Voice Notes)
// ═══════════════════════════════════════════
async function handleVoiceMessage(msg) {
  const chatId = msg.chat.id;
  const voice = msg.voice || msg.audio;
  if (!voice) return;
  
  try {
    const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
    await bot.sendChatAction(chatId, 'typing');
    console.log(`🎤 Audio recibido: file_id=${voice.file_id}, mime=${voice.mime_type}, duration=${voice.duration}s`);
    
    const fileLink = await bot.getFileLink(voice.file_id);
    console.log(`🎤 Descargando: ${fileLink}`);
    const resp = await fetch(fileLink);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} descargando audio`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    console.log(`🎤 Audio descargado: ${buffer.length} bytes`);
    
    const userInfo = await db.getUserRole(u.id) || { role: 'cliente', nombre: msg.from.first_name };
    const mimeType = voice.mime_type || 'audio/ogg';
    const aiResponse = await ai.processAudioMessage(buffer, mimeType, userInfo);
    
    try {
      await bot.sendMessage(chatId, `🎤 *Nota de voz procesada:*\n\n${aiResponse}`, { parse_mode: 'Markdown' });
    } catch (mkErr) {
      await bot.sendMessage(chatId, `🎤 Nota de voz procesada:\n\n${aiResponse}`);
    }
  } catch (e) {
    console.error('Voice handler error:', e);
    await bot.sendMessage(chatId, "❌ No pude procesar tu nota de voz. ¿Puedes intentar escribirme?");
  }
}

bot.on('voice', handleVoiceMessage);
bot.on('audio', handleVoiceMessage);

// ═══════════════════════════════════════════
// FREE TEXT (state machine)
// ═══════════════════════════════════════════
bot.on('message', async (msg) => {
  try {
    if (!msg.text) return;
  
  const txt = msg.text.trim();

  // ─── Skip commands — already handled by bot.onText() ───
  // Only allow category commands (e.g. /ESTUCO_Y_PINTURA) to pass through
  if (txt.startsWith('/')) {
    // Check if it's a category command
    if (txt.length > 1) {
      const possibleCat = txt.substring(1).replace(/_/g, ' ').toUpperCase();
      const allCats = await db.getCategories();
      if (allCats.map(c => c.toUpperCase()).includes(possibleCat)) {
        const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
        const apus = await db.getAPUsByCategory(possibleCat, 15);
        if (apus.length > 0) {
          const kb = apus.map(a => ([{text:`${a.nombre} (${a.unidad})`, callback_data:`apu:${a.id.substring(0,60)}`}]));
          return bot.sendMessage(msg.chat.id, `📁 *${possibleCat}:*`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
        }
      }
    }
    return; // Skip ALL other commands
  }

  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  if (!u) return;

  await db.logMessage(u.id, 'in', txt);
  const st = await db.getConversationState(u.id);

  if (st?.flujo_actual) {
    console.log(`[Bot] Message Handler - State: ${st.flujo_actual}, Paso: ${st.paso}, Txt: ${txt.substring(0,30)}`);
  }

  // Login (email input)
  if (st?.flujo_actual === 'login') {
    if (txt.includes('@')) {
      const res = await db.vincularEmail(u.id, txt, msg.from.id);
      if (res.ok) {
        const roleEmoji = {admin:'🔑 Admin',operativo:'🏗️ Operativo',bodega:'📦 Bodega',cuadrilla:'📲 Cuadrilla',tienda:'🛒 Tienda',cliente:'👁️ Cliente'};
        await bot.sendMessage(msg.chat.id, `✅ Vinculado: ${txt}\n👤 ${res.personal?.nombre || ''}\n🎭 Rol: ${roleEmoji[res.app_role]||res.app_role}`);
        await db.clearConversationState(u.id);
      } else if (res.not_found) {
        // Not registered → ask name
        await db.setConversationState(u.id, 'registro', 1, { email: txt });
        await bot.sendMessage(msg.chat.id, `📋 *${txt}* no está registrado.\n\n¿Deseas crear una cuenta? Escribe tu *nombre completo*:\n\n_O usa /cancelar para salir_`, {parse_mode:'Markdown'});
      } else {
        await bot.sendMessage(msg.chat.id, `❌ ${res.error || 'Error'}`);
        await db.clearConversationState(u.id);
      }
    } else { await bot.sendMessage(msg.chat.id, '⚠️ Escribe un email válido. Ej: tu@correo.com'); }
    return;
  }

  // Registro: nombre completo (paso 1)
  if (st?.flujo_actual === 'registro' && st.paso === 1) {
    const nombre = txt;
    if (nombre.length < 3) {
      await bot.sendMessage(msg.chat.id, '⚠️ Escribe tu nombre completo (mínimo 3 caracteres).');
      return;
    }
    const res = await db.registrarPersonal(u.id, st.data_temp.email, nombre, msg.from.id);
    if (res.ok) {
      await bot.sendMessage(msg.chat.id, `✅ *¡Cuenta creada y vinculada!*\n\n👤 ${nombre}\n📧 ${st.data_temp.email}\n🎭 Rol: 👁️ Cliente\n\nUsa /start para ver tu menú.`, {parse_mode:'Markdown'});
    } else {
      await bot.sendMessage(msg.chat.id, `❌ Error al registrar: ${res.error}`);
    }
    await db.clearConversationState(u.id);
    return;
  }

  // Copilot Cliente: cotización guiada (cot_tipo, cot_buscar, cot_cantidad)
  if (st?.flujo_actual?.startsWith('cot_')) {
    const handled = await copilotCliente.handleCotizarFlow(bot, msg, u, st, txt);
    if (handled !== false) return;
  }

  // Copilot Cliente: project creation from cotización
  if (st?.flujo_actual === 'cot_proyecto_nombre' || st?.flujo_actual === 'cot_proyecto_ubicacion') {
    const handled = await copilotCliente.handleProjectCreationFlow(bot, msg, u, st, txt);
    if (handled !== false) return;
  }

  // Copilot Cuadrilla: avances, pedidos, informes, entrada_nota
  if (st?.flujo_actual?.startsWith('avance_') || 
      st?.flujo_actual?.startsWith('pedido_') || 
      st?.flujo_actual === 'informe_contenido' ||
      st?.flujo_actual === 'entrada_nota' || 
      st?.flujo_actual === 'salida_nota') {
    const handled = await copilotCuadrilla.handleCuadrillaFlow(bot, msg, u, st, txt);
    if (handled !== false) return;
  }

  // Buscar insumo
  if (st?.flujo_actual === 'buscar_insumo') {
    await showInsumos(msg.chat.id, txt);
    await db.clearConversationState(u.id);
    return;
  }

  // ── Crear proyecto paso 1 (nombre del proyecto) ──
  if (st?.flujo_actual === 'crear_proyecto' && String(st.paso) === '1') {
    const dt = { nombre: txt, tg_name: msg.from.first_name, tg_id: String(msg.from.id), tg_username: msg.from.username || '' };
    await db.setConversationState(u.id, 'crear_proyecto', 2, dt);
    await bot.sendMessage(msg.chat.id, 
      `👤 *Nombre del cliente:*\n\nEscribe el nombre o 📎 *comparte un contacto* de tu agenda.`,
      { parse_mode: 'Markdown' });
    return;
  }

  // ── Crear proyecto paso 2b (Búsqueda de cliente) ──
  if (st?.flujo_actual === 'crear_proyecto' && st.paso === 2) {
    const dt = st.data_temp || {};
    // Buscar clientes en CRM
    const results = await db.searchClientes(txt);
    
    if (results.length > 0) {
      const kb = results.map(c => ([{ text: `👤 ${c.nombre} (${c.empresa || 'CRM'})`, callback_data: `proj_sel_client:${c.id}` }]));
      kb.push([{ text: `🆕 Crear con este nombre únicamente`, callback_data: `proj_new_client:${txt.substring(0, 40)}` }]);
      
      await bot.sendMessage(msg.chat.id, `🔍 He encontrado estos clientes en el CRM:\n\nSi es uno de ellos, selecciónalo. Si no, usa el botón de abajo para crearlo.`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: kb }
      });
    } else {
      await bot.sendMessage(msg.chat.id, `❓ No encontré clientes con el nombre *"${txt}"*.\n\n¿Deseas crear un nuevo cliente con este nombre?`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: `✅ Sí, crear "${txt}"`, callback_data: `proj_new_client:${txt.substring(0, 40)}` }],
          [{ text: '❌ Cancelar', callback_data: 'cancelar' }]
        ]}
      });
    }
    return;
  }

  // ── Crear proyecto paso 2c (captura de email) ──
  if (st?.flujo_actual === 'crear_proyecto' && st.paso === 4) {
    const dt = st.data_temp;
    if (dt.cliente_id) await db.updateCRMClient(dt.cliente_id, { email: txt, estado: 'activo' });
    // Vincular con personal si existe
    await db.vincularEmail(u.id, txt, dt.tg_id);
    await db.setConversationState(u.id, 'crear_proyecto', 6, { ...dt, email: txt });
    await bot.sendMessage(msg.chat.id,
      `✅ Email guardado: ${txt}\n\n¿Algo más?`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '📱 Agregar teléfono', callback_data: 'proj_info:phone' }],
        [{ text: '⏭️ Continuar a ubicación', callback_data: 'proj_info:skip' }],
      ]}});
    return;
  }

  // ── Crear proyecto paso 2d (captura de teléfono) ──
  if (st?.flujo_actual === 'crear_proyecto' && st.paso === 5) {
    const dt = st.data_temp;
    if (dt.cliente_id) await db.updateCRMClient(dt.cliente_id, { telefono: txt });
    await db.setConversationState(u.id, 'crear_proyecto', 6, { ...dt, telefono: txt });
    await bot.sendMessage(msg.chat.id,
      `✅ Teléfono guardado: ${txt}\n\n¿Algo más?`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [
        [{ text: '📧 Agregar email', callback_data: 'proj_info:email' }],
        [{ text: '⏭️ Continuar a ubicación', callback_data: 'proj_info:skip' }],
      ]}});
    return;
  }

  // ── Crear proyecto paso 3 (ubicación como texto) ──
  if (st?.flujo_actual === 'crear_proyecto' && (st.paso === 3 || st.paso === '3')) {
    const dt = st.data_temp || {};
    const finalClient = dt.cliente || dt.tg_name || msg.from.first_name || 'Cliente';
    const res = await db.createProyecto(dt.nombre, txt, null, finalClient, dt.tipo_obra, { 
      creado_por: u.email || dt.tg_name || msg.from.first_name, 
      plataforma: 'telegram', 
      cliente_id: dt.cliente_id 
    });
    if (res.error) {
      await bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    } else {
      await bot.sendMessage(msg.chat.id, 
        `✅ *¡Proyecto creado exitosamente!*\n\n` +
        `🏗️ *${dt.nombre}*\n` +
        `👤 Cliente: ${finalClient}\n` +
        `📍 ${txt}\n\n` +
        `_El proyecto ya está visible en el ERP web._`, {parse_mode:'Markdown'});
    }
    await db.clearConversationState(u.id);
    return;
  }

  // Avances, Informes (ahora manejados por copilotCuadrilla, pero los dejamos comentados o eliminados si ya están arriba)
  // (Fueron removidos porque se manejan en handleCuadrillaFlow)

  // Greeting detection — respond without calling AI (MUST be before search)
  const saludos = ['hola', 'hi', 'hello', 'hey', 'ey', 'buenos días', 'buenas tardes', 'buenas noches', 'buenas', 'que tal', 'holi', 'buen dia', 'buen día', 'ola', 'helo'];
  if (saludos.includes(txt.toLowerCase().trim())) {
    return bot.sendMessage(msg.chat.id, 
      `👋 ¡Hola ${msg.from.first_name || ''}!\n\n` +
      `Soy *Kalarti*, tu asistente de construcción 🏗️\n\n` +
      `¿Qué necesitas?\n` +
      `🔍 /cotizar — Cotizar un proyecto\n` +
      `🆕 /nuevoproyecto — Crear proyecto\n` +
      `📦 /insumos — Buscar materiales\n` +
      `📁 /categorias — Categorías APU\n` +
      `❓ /ayuda — Todos los comandos`, { parse_mode: 'Markdown' });
  }

  // Default: smart search (but NOT for bare numbers - those only make sense inside flows)
  if (/^\d+([.,]\d+)?$/.test(txt.trim())) {
    // Pure number outside any flow — ignore to avoid noise
    return;
  }
  const apus = await db.searchAPUs(txt, 5);
  if (apus.length > 0) {
    const kb = apus.map(a => ([{text:`📊 ${a.nombre} (${a.unidad})`, callback_data:`apu:${a.id.substring(0,60)}`}]));
    return bot.sendMessage(msg.chat.id, `🔍 APUs para "${txt}":`, {reply_markup:{inline_keyboard:kb}});
  }
  const ins = await db.searchInsumos(txt, 5);
  if (ins.length > 0) return showInsumos(msg.chat.id, txt);

  // IA Fallback (with error handling)
  try {
    const userInfo = await db.getUserRole(u.id) || { role: 'cliente', nombre: msg.from.first_name };
    const aiResponse = await ai.processChatMessage(txt, userInfo);
    try {
      await bot.sendMessage(msg.chat.id, aiResponse, { parse_mode: 'Markdown' });
    } catch (err) {
      await bot.sendMessage(msg.chat.id, aiResponse);
    }
  } catch (aiErr) {
    console.error('AI fallback error:', aiErr.message);
    await bot.sendMessage(msg.chat.id, 
      `🤖 No encontré resultados para "${txt}".\n\n` +
      `Prueba con:\n` +
      `🔍 /cotizar — Cotizar proyecto\n` +
      `📦 /insumos ${txt} — Buscar materiales\n` +
      `❓ /ayuda — Ver comandos`);
  }
} catch (e) {
  console.error('Message handler error:', e.message);
}
});

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════
async function showAPUResults(chatId, user, query, prefix) {
  const apus = await db.searchAPUs(query, 8);
  if (!apus.length) return bot.sendMessage(chatId, `❌ No encontré APUs para "${query}".`);
  const kb = apus.map(a => ([{text:`${a.nombre} (${a.unidad})`, callback_data:`${prefix}:${a.id.substring(0,60)}`}]));
  await bot.sendMessage(chatId, `📊 *Resultados para "${query}":*`, {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
}

async function showInsumos(chatId, query) {
  const ins = await db.searchInsumos(query, 8);
  if (!ins.length) return bot.sendMessage(chatId, `❌ No encontré insumos para "${query}".`);
  let txt = '🔍 *Insumos:*\n\n';
  ins.forEach(i => { txt += `📦 *${i.nombre}*\n   ${i.categoria||''} | ${i.unidad} | ${i.precio_unitario?fmt(i.precio_unitario):'Sin precio'}\n\n`; });
  await bot.sendMessage(chatId, txt, {parse_mode:'Markdown'});
}

async function showAPUDetail(chatId, apu) {
  let txt = `🏗️ *${apu.nombre}*\n`;
  txt += `📁 ${apu.categoria_apu||''}\n`;
  txt += `📏 ${apu.unidad} | Rend: ${apu.rendimiento}\n\n`;
  
  if (apu.detalles?.length) {
    txt += '📋 *Componentes:*\n';
    apu.detalles.forEach(d => {
      const n = d.nombre_componente || 'Componente';
      const p = d.precio_unitario || 0;
      const sub = d.subtotal || 0;
      txt += `  • ${n}: ${d.cantidad} ${d.unidad_detalle||''}${p > 0 ? ` → ${fmt(sub)}` : ''}\n`;
    });
    txt += `\n💰 *Costo Total: ${fmt(apu.costoTotal)}* por ${apu.unidad}`;
  } else {
    txt += '⚠️ Este APU no tiene componentes definidos.';
  }
  
  const kb = [[{text:'🛒 Agregar a cotización', callback_data:`addcot:${apu.id.substring(0,60)}`}]];
  await bot.sendMessage(chatId, txt, {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
}

async function showCotizacion(chatId, items) {
  let total = 0;
  let txt = '🛒 *COTIZACIÓN*\n────────────\n\n';
  items.forEach((it,i) => { txt += `${i+1}. *${it.nombre}*\n   ${it.cantidad} ${it.unidad} × ${fmt(it.costo_unitario)}\n   Sub: *${fmt(it.subtotal)}*\n\n`; total += it.subtotal; });
  txt += `────────────\n💰 *TOTAL: ${fmt(total)}*`;
  const kb = [[{text:'➕ Más ítems', callback_data:'mas_items'}],[{text:'✅ Guardar', callback_data:'enviar_cot'}]];
  await bot.sendMessage(chatId, txt, {parse_mode:'Markdown', reply_markup:{inline_keyboard:kb}});
}

bot.on('polling_error', e => { if (e.response?.statusCode!==409) console.error('Poll:', e.code); });
console.log('✅ Bot listo. Envía /start en Telegram.');

bot.on('location', async (msg) => {
  const u = await db.findOrCreateChatUser(msg.from.id, msg.from.first_name, msg.from.username);
  const st = await db.getConversationState(u.id);
  const loc = msg.location;
  const gpsText = `📌 GPS: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;

  if (st?.flujo_actual === 'cot_proyecto_ubicacion') {
    const dt = st.data_temp;
    const items = dt.items || [];
    const clientName = u.nombre || msg.from.first_name || 'Cliente Telegram';
    const res = await db.createProyecto(dt.proyecto_nombre, `GPS: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`, loc, clientName, dt.tipo_obra, { creado_por: clientName, plataforma: 'telegram' });
    if (res.error) return bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    await db.createPresupuestoItems(res.id, items);
    await db.clearConversationState(u.id);
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    await bot.sendMessage(msg.chat.id, `✅ *Proyecto y presupuesto creados!*\n\n🏗️ *${dt.proyecto_nombre}*\n👤 Cliente: ${clientName}\n💰 *Total: ${fmt(total)}*`, {parse_mode:'Markdown'});
    return;
  }
  
  if (st?.flujo_actual === 'entrada_nota') {
    await db.registrarEntrada(u.id, st.data_temp.proyecto_id, st.data_temp.proyecto_nombre, gpsText);
    await bot.sendMessage(msg.chat.id, `✅ *Entrada registrada* en ${st.data_temp.proyecto_nombre}`, {parse_mode:'Markdown'});
    await db.clearConversationState(u.id);
    return;
  }

  if (st?.flujo_actual === 'salida_nota') {
    await db.registrarSalida(u.id, st.data_temp.proyecto_id, st.data_temp.proyecto_nombre, gpsText);
    await bot.sendMessage(msg.chat.id, `✅ *Salida registrada* de ${st.data_temp.proyecto_nombre}`, {parse_mode:'Markdown'});
    await db.clearConversationState(u.id);
    return;
  }

  if (st?.flujo_actual === 'crear_proyecto' && (st.paso === 3 || st.paso === '3')) {
    const dt = st.data_temp || {};
    const finalClient = dt.cliente || dt.tg_name || msg.from.first_name || 'Cliente';
    const res = await db.createProyecto(dt.nombre, '', loc, finalClient, dt.tipo_obra, { creado_por: dt.tg_name || msg.from.first_name, plataforma: 'telegram', cliente_id: dt.cliente_id });
    if (res.error) await bot.sendMessage(msg.chat.id, `❌ Error: ${res.error}`);
    else {
      await db.clearConversationState(u.id);
      await bot.sendMessage(msg.chat.id, `✅ *¡Proyecto creado!*\n🏗️ *${dt.nombre}*\n👤 Cliente: ${finalClient}\n📍 Ubicación GPS guardada`, {parse_mode:'Markdown'});
    }
  }
});
