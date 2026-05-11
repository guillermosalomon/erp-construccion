/**
 * telegram-bot/copilot/cuadrilla.js — Copilot para rol Cuadrilla (Operativo en campo)
 * Flujo: Check-ins GPS, Avances, Informes diarios y Pedidos de materiales
 */
const db = require('../db');

function getWelcome(nombre) {
  return `🏗️ ¡Hola${nombre ? ` ${nombre}` : ''}! Soy Kalarti en modo *CUADRILLA*.\n\n` +
         `¿Qué deseas reportar hoy en obra?\n\n` +
         `✅ /entrada — Check-in de obra\n` +
         `🔴 /salida — Check-out de obra\n` +
         `📈 /avance — Reportar avance de actividad\n` +
         `📝 /informe — Enviar informe diario\n` +
         `📦 /pedido — Solicitar materiales a bodega\n` +
         `📋 /ayuda — Más opciones`;
}

async function handleCuadrillaFlow(bot, msg, u, st, txt) {
  const chatId = msg.chat.id;

  // 1. Manejo de Avance Guiado (actividad -> cantidad -> unidad -> nota)
  if (st?.flujo_actual === 'avance_actividad') {
    await db.setConversationState(u.id, 'avance_cantidad', 0, { ...st.data_temp, actividad: txt });
    await bot.sendMessage(chatId, `📈 Actividad: *${txt}*\n\n¿Qué cantidad ejecutaste?\n_Ejemplo: 15, 20.5_`, { parse_mode: 'Markdown' });
    return true;
  }
  if (st?.flujo_actual === 'avance_cantidad') {
    const qty = parseFloat(txt);
    if (isNaN(qty)) {
      await bot.sendMessage(chatId, '⚠️ Por favor ingresa un número válido.');
      return true;
    }
    await db.setConversationState(u.id, 'avance_unidad', 0, { ...st.data_temp, cantidad: qty });
    await bot.sendMessage(chatId, `📏 Cantidad: *${qty}*\n\n¿En qué unidad de medida?\n_Ejemplo: m2, ml, un, m3_`, { parse_mode: 'Markdown' });
    return true;
  }
  if (st?.flujo_actual === 'avance_unidad') {
    await db.setConversationState(u.id, 'avance_nota', 0, { ...st.data_temp, unidad: txt });
    await bot.sendMessage(chatId, `📝 ¿Deseas agregar alguna nota u observación?\n_Si no, escribe "ninguna"_`, { parse_mode: 'Markdown' });
    return true;
  }
  if (st?.flujo_actual === 'avance_nota') {
    const nota = txt.toLowerCase() === 'ninguna' ? '' : txt;
    const dt = st.data_temp;
    const res = await db.registrarAvance(u.id, dt.proyecto_id, dt.proyecto_nombre, dt.actividad, dt.cantidad, dt.unidad, nota);
    if (res.error) await bot.sendMessage(chatId, `❌ Error: ${res.error}`);
    else await bot.sendMessage(chatId, `✅ *Avance registrado exitosamente*\n\n🏗️ Proyecto: ${dt.proyecto_nombre}\n📈 Actividad: ${dt.actividad}\n📐 ${dt.cantidad} ${dt.unidad}\n📝 Nota: ${nota || 'Ninguna'}`, { parse_mode: 'Markdown' });
    await db.clearConversationState(u.id);
    return true;
  }

  // 2. Manejo de Pedidos (proyecto -> material -> cantidad -> urgencia)
  if (st?.flujo_actual === 'pedido_material') {
    await db.setConversationState(u.id, 'pedido_cantidad', 0, { ...st.data_temp, material: txt });
    await bot.sendMessage(chatId, `📦 Material: *${txt}*\n\n¿Qué cantidad necesitas y en qué unidad?\n_Ejemplo: 50 bultos, 20 varillas_`, { parse_mode: 'Markdown' });
    return true;
  }
  if (st?.flujo_actual === 'pedido_cantidad') {
    await db.setConversationState(u.id, 'pedido_urgencia', 0, { ...st.data_temp, cantidad: txt });
    await bot.sendMessage(chatId, `⏳ ¿Para cuándo necesitas este material?\n_Ejemplo: Hoy mismo, Mañana por la mañana_`, { parse_mode: 'Markdown' });
    return true;
  }
  if (st?.flujo_actual === 'pedido_urgencia') {
    const dt = st.data_temp;
    // Log as a generic message for now
    await db.logMessage(u.id, 'out', `SOLICITUD PEDIDO: ${dt.material} | Cant: ${dt.cantidad} | Urgencia: ${txt} | Proyecto: ${dt.proyecto_nombre}`, 'pedido', {
        proyecto_id: dt.proyecto_id,
        material: dt.material,
        cantidad: dt.cantidad,
        urgencia: txt
    });
    await bot.sendMessage(chatId, `✅ *Pedido enviado a Bodega*\n\n🏗️ Proyecto: ${dt.proyecto_nombre}\n📦 Material: ${dt.material}\n📐 Cantidad: ${dt.cantidad}\n⏳ Para: ${txt}\n\n_Te notificaremos cuando sea gestionado._`, { parse_mode: 'Markdown' });
    await db.clearConversationState(u.id);
    return true;
  }

  // 3. Manejo de Informe (texto libre -> guardar)
  if (st?.flujo_actual === 'informe_contenido') {
    const res = await db.crearInformeDiario(u.id, st.data_temp.proyecto_id, st.data_temp.proyecto_nombre, txt);
    if (res.error) await bot.sendMessage(chatId, `❌ Error: ${res.error}`);
    else await bot.sendMessage(chatId, `✅ *Informe guardado*\n🏗️ ${st.data_temp.proyecto_nombre}\n📝 ${txt.substring(0,100)}...`, {parse_mode:'Markdown'});
    await db.clearConversationState(u.id);
    return true;
  }

  // 4. Manejo de Check-in GPS Manual Nota
  if (st?.flujo_actual === 'entrada_nota') {
      // It's handled in bot.js location event, but if they send text instead of location:
      const dt = st.data_temp;
      const res = await db.registrarEntrada(u.id, dt.proyecto_id, dt.proyecto_nombre, txt);
      const hora = new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
      if (res.error) await bot.sendMessage(chatId, `❌ Error: ${res.error}`);
      else await bot.sendMessage(chatId, `✅ *Entrada registrada sin GPS*\n🏗️ ${dt.proyecto_nombre}\n🕐 ${hora}\n📝 Nota: ${txt}`, {parse_mode:'Markdown'});
      await db.clearConversationState(u.id);
      return true;
  }

  return false; // not handled
}

module.exports = { getWelcome, handleCuadrillaFlow };
