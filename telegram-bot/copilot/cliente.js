/**
 * telegram-bot/copilot/cliente.js — Copilot para rol Cliente (y visitantes sin registro)
 * Flujo: Cotizar → Armar presupuesto → Registrarse → Contratar
 */
const db = require('../db');

const TIPOS_PROYECTO = {
  '1': { key: 'residencial', label: '🏠 Residencial' },
  '2': { key: 'comercial', label: '🏢 Comercial' },
  '3': { key: 'industrial', label: '🏭 Industrial' },
  '4': { key: 'remodelacion', label: '🔧 Remodelación' },
  '5': { key: 'infraestructura', label: '🛣️ Infraestructura' },
  '6': { key: 'consultoria', label: '📐 Consultoría' },
  '7': { key: 'otro', label: '📋 Otro' },
};

// Welcome message for unregistered users
function getWelcome(nombre) {
  return `🏗️ ¡Hola${nombre ? ` ${nombre}` : ''}! Soy *Kalarti*, tu asistente de construcción.\n\n` +
    `¿En qué te puedo ayudar?\n\n` +
    `🔍 /cotizar — Cotizar una obra\n` +
    `🆕 /nuevoproyecto — Crear un proyecto\n` +
    `📦 /insumos — Ver materiales y precios\n` +
    `📊 /categorias — Explorar categorías\n` +
    `💬 /ayuda — Más opciones\n\n` +
    `_Para acceder a todas las funciones, registrate con /login_`;
}

// Handle cotización guiada
async function handleCotizarFlow(bot, msg, u, st, txt) {
  const chatId = msg.chat.id;

  // Paso 1: Tipo de proyecto
  if (st?.flujo_actual === 'cot_tipo') {
    const tipo = TIPOS_PROYECTO[txt];
    if (!tipo) {
      return bot.sendMessage(chatId, '⚠️ Elige un número del 1 al 7:\n\n' +
        Object.entries(TIPOS_PROYECTO).map(([k, v]) => `${k}. ${v.label}`).join('\n'));
    }
    await db.setConversationState(u.id, 'cot_buscar', 0, { tipo_obra: tipo.key, tipo_label: tipo.label, items: [] });

    const cats = await db.getCategories();
    const catsTxt = cats.map(c => `/${c.replace(/\s+/g, '_')}`).join(', ');

    return bot.sendMessage(chatId,
      `${tipo.label} — ¡Perfecto!\n\n` +
      `🔍 ¿Qué actividad necesitas cotizar?\n` +
      `_Escribe un término, ej: muro, piso, pintura, techo_\n\n` +
      `O selecciona una categoría:\n${catsTxt}\n\n` +
      `O escribe /ver para ver tu presupuesto actual\n` +
      `O /listo para finalizar`, { parse_mode: 'Markdown' });
  }

  // Paso 2: Buscar APU
  if (st?.flujo_actual === 'cot_buscar') {
    if (txt === '/ver' || txt === 'ver') {
      return showPresupuesto(bot, chatId, st.data_temp);
    }
    if (txt === '/listo' || txt === 'listo') {
      return finalizarCotizacion(bot, chatId, u, st.data_temp);
    }
    if (txt === '/cancelar' || txt === 'cancelar') {
      await db.clearConversationState(u.id);
      return bot.sendMessage(chatId, '❌ Cotización cancelada.');
    }

    // Filtrar saludos y palabras comunes que no son APUs
    const saludos = ['hola', 'hi', 'hello', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'ey', 'gracias', 'ok', 'si', 'no'];
    if (saludos.includes(txt.toLowerCase().trim())) {
      return bot.sendMessage(chatId, 
        `👋 ¡Estás en modo cotización!\n\n` +
        `🔍 Escribe un término de APU para buscar, ej:\n` +
        `_mampostería, pintura, piso, enchape, estructura_\n\n` +
        `📁 /categorias — Ver categorías\n` +
        `/ver — Ver tu presupuesto\n` +
        `/listo — Finalizar\n` +
        `/cancelar — Salir`, { parse_mode: 'Markdown' });
    }

    const apus = await db.searchAPUs(txt, 6);
    if (!apus.length) {
      return bot.sendMessage(chatId, 
        `❌ No encontré APUs para "*${txt}*"\n\n` +
        `💡 Intenta con un término más específico:\n` +
        `_Ej: mampostería, pintura, piso, estructura, enchape, muro, cubierta_\n\n` +
        `📁 O usa /categorias para explorar\n` +
        `/cancelar — Salir de la cotización`, { parse_mode: 'Markdown' });
    }
    const kb = apus.map(a => ([{
      text: `${a.nombre} (${a.unidad})`,
      callback_data: `cotapu:${a.id.substring(0, 55)}`
    }]));
    return bot.sendMessage(chatId, `📋 Resultados para "${txt}":`, { reply_markup: { inline_keyboard: kb } });
  }

  // Paso 3: Cantidad
  if (st?.flujo_actual === 'cot_cantidad') {
    const cant = parseFloat(txt);
    if (isNaN(cant) || cant <= 0) return bot.sendMessage(chatId, '⚠️ Escribe un número válido (ej: 50)');

    const dt = st.data_temp;
    const apu = await db.getAPU(dt.apu_id);
    const costoUnit = apu?.costoTotal || 0;

    const nuevoItem = {
      apu_id: dt.apu_id,
      nombre: dt.apu_nombre,
      unidad: dt.apu_unidad,
      cantidad: cant,
      costo_unitario: costoUnit,
      subtotal: costoUnit * cant
    };

    const items = [...(dt.items || []), nuevoItem];
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

    await db.setConversationState(u.id, 'cot_buscar', 0, { ...dt, items, apu_id: null, apu_nombre: null, apu_unidad: null });

    return bot.sendMessage(chatId,
      `✅ *Agregado:*\n` +
      `📊 ${nuevoItem.nombre}\n` +
      `📐 ${cant} ${nuevoItem.unidad} × ${fmt(costoUnit)} = *${fmt(nuevoItem.subtotal)}*\n\n` +
      `🧾 Presupuesto parcial: *${fmt(total)}* (${items.length} items)\n\n` +
      `🔍 Busca otra actividad o:\n` +
      `/ver — Ver presupuesto completo\n` +
      `/listo — Finalizar cotización`, { parse_mode: 'Markdown' });
  }

  return false; // Not handled
}

// Show presupuesto acumulado
async function showPresupuesto(bot, chatId, dt) {
  const items = dt.items || [];
  if (!items.length) {
    return bot.sendMessage(chatId, '🧾 Tu presupuesto está vacío.\n\n🔍 Busca una actividad para agregar.');
  }
  const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  let txt = `🧾 *PRESUPUESTO — ${dt.tipo_label || 'Obra'}*\n${'─'.repeat(28)}\n\n`;
  items.forEach((item, i) => {
    txt += `${i + 1}. ${item.nombre}\n   📐 ${item.cantidad} ${item.unidad} × ${fmt(item.costo_unitario)}\n   💰 *${fmt(item.subtotal)}*\n\n`;
  });
  txt += `${'─'.repeat(28)}\n`;
  txt += `📊 *TOTAL: ${fmt(total)}*\n\n`;
  txt += `🔍 Busca otra actividad para agregar\n/listo — Finalizar`;

  return bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
}

// Finalizar cotización
async function finalizarCotizacion(bot, chatId, u, dt) {
  const items = dt.items || [];
  if (!items.length) {
    return bot.sendMessage(chatId, '⚠️ Agrega al menos una actividad al presupuesto.');
  }
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

  // Save to chat_cotizaciones
  await db.createCotizacion(u.id, items, total, u.nombre || 'Cliente Telegram');

  // Offer to create a real project
  await db.setConversationState(u.id, 'cot_finalizar', 0, dt);

  const kb = [
    [{ text: '🏗️ Crear Proyecto con este presupuesto', callback_data: 'cot_crear_proyecto' }],
    [{ text: '📋 Solo guardar cotización', callback_data: 'cot_solo_guardar' }],
  ];

  return bot.sendMessage(chatId,
    `✅ *¡Cotización lista!*\n\n` +
    `🧾 ${items.length} actividades\n` +
    `💰 Total: *${fmt(total)}*\n` +
    `🏗️ Tipo: ${dt.tipo_label || 'Obra'}\n\n` +
    `¿Qué deseas hacer?`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
}

// Convert cotización to real project + presupuesto
async function handleConvertToProject(bot, chatId, u) {
  const st = await db.getConversationState(u.id);
  const dt = st?.data_temp || {};
  const items = dt.items || [];
  
  if (!items.length) {
    await db.clearConversationState(u.id);
    return bot.sendMessage(chatId, '⚠️ No hay ítems para crear el presupuesto.');
  }

  // Ask for project name
  await db.setConversationState(u.id, 'cot_proyecto_nombre', 0, dt);
  return bot.sendMessage(chatId, 
    '🆕 *Crear Proyecto*\n\n📝 ¿Cuál es el nombre del proyecto?\n\n_Ej: Casa Los Cedros, Local CC Plaza, Remodelación Apto 301_', 
    { parse_mode: 'Markdown' });
}

// Handle project creation flow from cotización
async function handleProjectCreationFlow(bot, msg, u, st, txt) {
  const chatId = msg.chat.id;
  const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

  // Step 1: Project name
  if (st?.flujo_actual === 'cot_proyecto_nombre') {
    console.log(`[Bot] Proyecto Nombre: ${txt}`);
    const dt = st.data_temp;
    await db.setConversationState(u.id, 'cot_proyecto_ubicacion', 0, { ...dt, proyecto_nombre: txt });
    return bot.sendMessage(chatId, 
      `📍 ¿Ubicación del proyecto "${txt}"?\n\n_Escribe la dirección o envía tu 📌 ubicación GPS_`, 
      { parse_mode: 'Markdown' });
  }

  // Step 2: Location → Create project + presupuesto items
  if (st?.flujo_actual === 'cot_proyecto_ubicacion') {
    console.log(`[Bot] Proyecto Ubicación: ${txt}`);
    const dt = st.data_temp;
    const items = dt.items || [];
    const clientName = u.nombre || msg.from.first_name || 'Cliente Telegram';

    console.log(`[Bot] Creando proyecto "${dt.proyecto_nombre}" para cliente "${clientName}"...`);
    // Create project
    const res = await db.createProyecto(dt.proyecto_nombre, txt, null, clientName, dt.tipo_obra, { creado_por: clientName, plataforma: 'telegram' });
    
    if (res.error) {
      console.error(`[Bot] Error createProyecto: ${res.error}`);
      await db.clearConversationState(u.id);
      return bot.sendMessage(chatId, `❌ Error creando proyecto: ${res.error}`);
    }

    console.log(`[Bot] Proyecto creado con ID: ${res.id}. Creando ${items.length} ítems de presupuesto...`);
    // Create presupuesto items
    const presRes = await db.createPresupuestoItems(res.id, items);
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    
    await db.clearConversationState(u.id);
    console.log(`[Bot] Flujo finalizado con éxito.`);

    let response = `✅ *¡Proyecto y presupuesto creados!*\n\n` +
      `🏗️ *${dt.proyecto_nombre}*\n` +
      `👤 Cliente: ${clientName}\n` +
      `📍 ${txt}\n` +
      `🏗️ Tipo: ${dt.tipo_label || 'Obra'}\n\n` +
      `📊 *Presupuesto:*\n`;
    
    items.forEach((item, i) => {
      response += `  ${i+1}. ${item.nombre} — ${item.cantidad} ${item.unidad} → ${fmt(item.subtotal)}\n`;
    });
    response += `\n💰 *Total: ${fmt(total)}*\n\n`;
    response += `_Tu proyecto ya está visible en el ERP web._\n`;
    response += `/cotizar — Nueva cotización\n/proyectos — Ver proyectos`;

    if (presRes?.error) {
      console.warn(`[Bot] Error createPresupuestoItems: ${presRes.error}`);
      response += `\n\n⚠️ Nota: Proyecto creado pero hubo un error guardando ítems: ${presRes.error}`;
    }

    try {
      return bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } catch {
      return bot.sendMessage(chatId, response);
    }
  }

  return false;
}

// Handle APU selection callback
async function handleAPUCallback(bot, q, u, apuId) {
  const apu = await db.getAPU(apuId);
  if (!apu) return bot.answerCallbackQuery(q.id, { text: 'APU no encontrado' });

  const st = await db.getConversationState(u.id);
  const dt = st?.data_temp || {};

  await db.setConversationState(u.id, 'cot_cantidad', 0, { ...dt, apu_id: apu.id, apu_nombre: apu.nombre, apu_unidad: apu.unidad });

  const costoUnit = apu.costoTotal || 0;
  const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

  await bot.sendMessage(q.message.chat.id,
    `📊 *${apu.nombre}*\n` +
    `📐 Unidad: ${apu.unidad}\n` +
    `💰 Costo unitario aprox: ${fmt(costoUnit)}\n\n` +
    `¿Cuántas ${apu.unidad} necesitas?\n_Escribe la cantidad:_`, { parse_mode: 'Markdown' });
  await bot.answerCallbackQuery(q.id);
}

module.exports = { getWelcome, handleCotizarFlow, handleAPUCallback, handleConvertToProject, handleProjectCreationFlow, showPresupuesto, TIPOS_PROYECTO };
