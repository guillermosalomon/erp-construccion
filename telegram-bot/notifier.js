/**
 * telegram-bot/notifier.js — Servicio de Notificaciones Proactivas y Gestión de Canales
 */
const db = require('./db');

async function initNotifier(bot) {
  console.log('🚀 Notificador Proactivo iniciado...');
  
  // ID del Supergrupo principal donde se crearán los "Temas" (Comunidades) para Proyectos
  const MAIN_GROUP_ID = process.env.TELEGRAM_MAIN_GROUP_ID;

  /**
   * Envía un mensaje a un usuario por su telegram_id
   */
  async function notifyUser(telegramId, text, options = {}) {
    if (!telegramId) return;
    try {
      await bot.sendMessage(telegramId, text, { parse_mode: 'Markdown', ...options });
    } catch (e) {
      console.warn(`[Notifier] No se pudo notificar al usuario ${telegramId}:`, e.message);
    }
  }

  /**
   * Crea un Tema (Topic) para un proyecto en el supergrupo principal
   */
  async function createProjectTopic(proyecto) {
    if (!MAIN_GROUP_ID) {
      console.warn('[Notifier] TELEGRAM_MAIN_GROUP_ID no configurado. No se pueden crear temas.');
      return null;
    }

    try {
      // Telegram Bot API: createForumTopic(chatId, name, options)
      const topic = await bot.createForumTopic(MAIN_GROUP_ID, `🏗️ Proy: ${proyecto.nombre}`);
      
      await db.upsertChannel({
        proyecto_id: proyecto.id,
        telegram_group_id: String(MAIN_GROUP_ID),
        telegram_topic_id: String(topic.message_thread_id),
        tipo: 'proyecto',
        nombre_canal: proyecto.nombre
      });

      return topic;
    } catch (e) {
      console.error('[Notifier] Error creando topic:', e.message);
      return null;
    }
  }

  /**
   * Notifica a todos los interesados sobre un nuevo proyecto o asignación
   */
  async function announceProjectAssignment(proyectoId) {
    const { personnel, client } = await db.getProjectMembers(proyectoId);
    const channel = await db.getChannel(proyectoId);
    
    const inviteLink = MAIN_GROUP_ID 
      ? await bot.createChatInviteLink(MAIN_GROUP_ID, { name: `Acceso a Proyecto`, member_limit: 10 })
      : null;

    // 1. Notificar al Cliente
    if (client?.telegram_id) {
      let msg = `🎉 *¡Tu proyecto ha sido registrado!*\n\n` +
                `🏗️ Proyecto: *${channel?.nombre_canal || 'Obra'}*\n` +
                `📅 Fecha: ${new Date().toLocaleDateString()}\n\n` +
                `Podrás seguir el avance desde aquí o en el canal del proyecto.`;
      if (inviteLink) msg += `\n\n🔗 [Unirse al canal de comunicación](${inviteLink.invite_link})`;
      
      await notifyUser(client.telegram_id, msg);
    }

    // 2. Notificar a Supervisores y Personal
    for (const p of personnel) {
      if (p.telegram_id) {
        let msg = `🏗️ *Nueva asignación de proyecto*\n\n` +
                  `Has sido asignado al proyecto: *${channel?.nombre_canal || 'Obra'}*\n` +
                  `🎭 Rol: ${p.app_role || 'Personal'}\n\n` +
                  `Ya puedes reportar /entrada, /salida y /avance.`;
        if (inviteLink) msg += `\n\n🔗 [Canal del proyecto](${inviteLink.invite_link})`;
        
        await notifyUser(p.telegram_id, msg);
      }
    }
  }

  /**
   * Crea un Tema (Topic) para una cuadrilla en el supergrupo principal
   */
  async function createCrewTopic(proyectoId, crewName) {
    if (!MAIN_GROUP_ID) return null;
    const channel = await db.getChannel(proyectoId);
    if (!channel || !channel.telegram_group_id) return null;

    try {
      const topic = await bot.createForumTopic(channel.telegram_group_id, `👷 Cuadrilla: ${crewName}`);
      return topic;
    } catch (e) {
      console.error('[Notifier] Error creando topic de cuadrilla:', e.message);
      return null;
    }
  }

  /**
   * Notifica a una cuadrilla sobre una nueva tarea asignada
   */
  async function notifyCrewTask(proyectoId, crewId, itemNombre, crewName) {
    const members = await db.getCrewMembers(crewId);
    const channel = await db.getChannel(proyectoId);
    
    // Opcional: Crear tema específico si no existe
    // await createCrewTopic(proyectoId, crewName);

    for (const m of members) {
      if (m.telegram_id) {
        const msg = `👷 *Nueva tarea asignada*\n\n` +
                    `🏗️ Proyecto: *${channel?.nombre_canal || 'Obra'}*\n` +
                    `🛠️ Tarea: *${itemNombre}*\n\n` +
                    `Por favor reporta el avance cuando inicies.`;
        await notifyUser(m.telegram_id, msg);
      }
    }
  }

  return {
    notifyUser,
    createProjectTopic,
    createCrewTopic,
    announceProjectAssignment,
    notifyCrewTask
  };
}

module.exports = { initNotifier };
