/**
 * telegram-bot/copilot/onboarding.js — Flujo de Onboarding de Personal
 * 
 * Se activa:
 * 1. Cuando el usuario usa /perfil
 * 2. Automáticamente 1x al día cuando el usuario inicia conversación (/start)
 * 
 * Recopila: foto, cédula, EPS/ARL, banco, horario, intervalo avances, 
 *           tallas dotación, contacto emergencia, confirmación salario.
 */
const db = require('../db');

// Campos requeridos y sus pasos
const STEPS = [
  { key: 'foto_url',             paso: 1,   pregunta: '📸 *Paso 1/10 — Foto de perfil*\n\nEnvía una foto tuya (selfie o foto formal).\nEsta se usará en tu carnet y perfil del ERP.\n\n_Envía una 📷 imagen o escribe "omitir" para continuar_', tipo: 'photo' },
  { key: 'cedula',               paso: 2,   pregunta: '🪪 *Paso 2/10 — Documento de identidad*\n\n¿Cuál es tu número de cédula?\n\n_Ejemplo: 1098765432_', tipo: 'text' },
  { key: 'cedula_url',           paso: 2.5, pregunta: '📎 Ahora envía una *foto de tu cédula* (ambos lados si es posible).\n\n_Envía una 📷 imagen o escribe "omitir"_', tipo: 'photo' },
  { key: 'direccion_residencia', paso: 2.7, pregunta: '🏠 *Paso 3/10 — Dirección de residencia*\n\n¿Cuál es tu dirección de residencia actual?\n\n_Ejemplo: Cra 15 #45-67, Barrio Centro, Bogotá_', tipo: 'text' },
  { key: 'eps_nombre',           paso: 3,   pregunta: '🏥 *Paso 4/10 — Seguridad Social*\n\n¿A qué *EPS* estás afiliado?\n\n_Ejemplo: Sura, Sanitas, Compensar, Nueva EPS_', tipo: 'text' },
  { key: 'arl_numero',           paso: 3.5, pregunta: '🛡️ ¿Cuál es tu número de afiliación *ARL*?\n\n_Ejemplo: ARL-1234567. Si no lo tienes, escribe "pendiente"_', tipo: 'text' },
  { key: 'banco',                paso: 4,   pregunta: '🏦 *Paso 5/10 — Datos bancarios*\n\n¿En qué banco tienes cuenta para el pago de nómina?\n\n_Ejemplo: Bancolombia, Davivienda, Nequi_', tipo: 'text' },
  { key: 'cuenta_bancaria',      paso: 4.5, pregunta: '💳 Número de cuenta y tipo:\n\n_Ejemplo: 123456789 Ahorros_\n_O: 987654321 Corriente_', tipo: 'text_cuenta' },
  { key: 'horario_trabajo',      paso: 5,   pregunta: '⏰ *Paso 6/10 — Horario de trabajo*\n\n¿Cuál será tu horario?\n\n_Ejemplo: Lun-Sáb 7:00-17:00_\n_O: Lun-Vie 8:00-18:00, Sáb 8:00-13:00_', tipo: 'text' },
  { key: 'intervalo_avances',    paso: 6,   pregunta: '📊 *Paso 7/10 — Reporte de avances*\n\n¿Cada cuánto reportarás avances de obra?\n\n1️⃣ Cada 2 horas\n2️⃣ Cada 4 horas\n3️⃣ Al finalizar la jornada\n4️⃣ Personalizado\n\n_Escribe el número o tu preferencia_', tipo: 'text_intervalo', condicional: 'campo' },
  { key: 'salario_confirmacion', paso: 7,   pregunta: null, tipo: 'confirmacion' }, // pregunta dinámica
  { key: 'talla_camisa',         paso: 8,   pregunta: '👕 *Paso 9/10 — Tallas de dotación*\n\nIndica tus tallas separadas por coma:\n*Camisa, Pantalón, Zapatos*\n\n_Ejemplo: M, 32, 40_\n_O: XL, 36, 42_', tipo: 'text_tallas', condicional: 'campo' },
  { key: 'contacto_emergencia',  paso: 9,   pregunta: '🆘 *Paso 10/10 — Contacto de emergencia*\n\nEscribe nombre y teléfono de tu contacto de emergencia:\n\n_Ejemplo: María López 3101234567_', tipo: 'text_emergencia' },
];

// Opciones de intervalo de avances
const INTERVALOS = {
  '1': 'Cada 2 horas',
  '2': 'Cada 4 horas',
  '3': 'Al finalizar la jornada',
};

/**
 * Verificar si debe recordar al usuario completar perfil (1x al día)
 */
async function shouldRemindOnboarding(chatUserId) {
  try {
    const userInfo = await db.getUserRole(chatUserId);
    if (!userInfo) return false; // No vinculado
    
    // Obtener email del chat_usuario
    const personalData = await db.getPersonalByEmail(userInfo.email);
    if (!personalData) return false;
    if (personalData.onboarding_completado) return false;
    
    // Verificar si ya recordamos hoy
    const lastReminder = await db.getConversationState(chatUserId);
    if (lastReminder?.data_temp?.last_onboarding_reminder) {
      const lastDate = new Date(lastReminder.data_temp.last_onboarding_reminder).toDateString();
      const today = new Date().toDateString();
      if (lastDate === today) return false; // Ya recordamos hoy
    }
    
    // Calcular % completado
    const fieldsToCheck = ['cedula', 'foto_url', 'eps_nombre', 'banco', 'horario_trabajo'];
    const completed = fieldsToCheck.filter(f => personalData[f]).length;
    const pct = Math.round((completed / fieldsToCheck.length) * 100);
    
    return { remind: true, pct, missing: fieldsToCheck.filter(f => !personalData[f]) };
  } catch (e) {
    console.warn('[Onboarding] Error checking reminder:', e.message);
    return false;
  }
}

/**
 * Enviar recordatorio de completar perfil
 */
async function sendOnboardingReminder(bot, chatId, chatUserId, reminderData) {
  const { pct, missing } = reminderData;
  const missingLabels = {
    cedula: '🪪 Cédula',
    foto_url: '📸 Foto de perfil',
    eps_nombre: '🏥 EPS',
    banco: '🏦 Datos bancarios',
    horario_trabajo: '⏰ Horario de trabajo'
  };
  
  const missingList = missing.map(f => missingLabels[f] || f).join('\n');
  
  await bot.sendMessage(chatId, 
    `📋 *Tu perfil está al ${pct}%*\n\n` +
    `Te faltan:\n${missingList}\n\n` +
    `Completa tu perfil con /perfil para que podamos elaborar tu contrato y procesarte en nómina. 💼`,
    { parse_mode: 'Markdown' }
  );
  
  // Marcar que ya recordamos hoy
  const st = await db.getConversationState(chatUserId);
  const currentData = st?.data_temp || {};
  await db.setConversationState(chatUserId, st?.flujo_actual || '', st?.paso || 0, {
    ...currentData,
    last_onboarding_reminder: new Date().toISOString()
  });
}

/**
 * Iniciar flujo de onboarding — encuentra el primer campo vacío
 */
async function startOnboarding(bot, chatId, chatUserId) {
  const userInfo = await db.getUserRole(chatUserId);
  if (!userInfo) {
    await bot.sendMessage(chatId, '🔒 Primero vincula tu cuenta con /login tu@email.com');
    return;
  }
  
  // Obtener datos actuales del personal
  const personalData = await db.getPersonalByEmail(userInfo.email);
  if (!personalData) {
    await bot.sendMessage(chatId, '⚠️ No se encontró tu perfil en el sistema. Contacta al administrador.');
    return;
  }
  
  // Determinar si es personal de campo o de oficina
  const isCampo = ['cuadrilla', 'operativo'].includes(userInfo.role);
  
  // Encontrar el primer paso incompleto
  const nextStep = STEPS.find(s => {
    if (s.condicional === 'campo' && !isCampo) return false;
    if (s.key === 'salario_confirmacion') return false; // Se maneja aparte
    return !personalData[s.key];
  });
  
  if (!nextStep) {
    // Verificar si necesita confirmar salario
    if (!personalData.onboarding_completado) {
      const salario = personalData.salario_base || 0;
      const unidad = personalData.unidad_pago || 'Mes';
      const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
      
      await db.setConversationState(chatUserId, 'onboarding', 97, { email: userInfo.email, isCampo });
      await bot.sendMessage(chatId,
        `💰 *Confirmación de salario*\n\n` +
        `Tu salario acordado es: *${fmt(salario)} / ${unidad}*\n\n` +
        `¿Es correcto?\n` +
        `✅ *Sí* — Confirmar\n` +
        `❌ *No* — Necesito hablar con el administrador`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    await bot.sendMessage(chatId, 
      '✅ *¡Tu perfil está completo!* 🎉\n\n' +
      'Todos tus datos están registrados. Tu contrato puede ser procesado.\n\n' +
      'Puedes usar /perfil en cualquier momento para actualizar tus datos.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Guardar estado y enviar pregunta
  await db.setConversationState(chatUserId, 'onboarding', nextStep.paso, { 
    email: userInfo.email, 
    currentKey: nextStep.key,
    isCampo 
  });
  await bot.sendMessage(chatId, nextStep.pregunta, { parse_mode: 'Markdown' });
}

/**
 * Manejar respuesta del flujo de onboarding
 */
async function handleOnboardingFlow(bot, msg, chatUserId, st, txt) {
  const chatId = msg.chat.id;
  const dt = st.data_temp || {};
  const currentKey = dt.currentKey;
  const isCampo = dt.isCampo;
  
  // Paso 97: Confirmación de salario
  if (st.paso === 97) {
    const lower = txt.toLowerCase();
    if (lower === 'sí' || lower === 'si' || lower === 'yes' || lower === 'confirmo') {
      await updatePersonalField(dt.email, { onboarding_completado: true, onboarding_fecha: new Date().toISOString() });
      
      // Registrar en bitácora
      await db.logMessage(chatUserId, 'system', '✅ ONBOARDING COMPLETADO — Perfil listo para contrato', 'onboarding', { completado: true });
      
      await bot.sendMessage(chatId,
        '🎉 *¡Onboarding completado!*\n\n' +
        '✅ Tu perfil está listo y tu contrato puede ser procesado.\n' +
        '📋 El administrador ya tiene todos tus datos.\n\n' +
        'Recuerda:\n' +
        '✅ /entrada — Check-in de obra\n' +
        '📈 /avance — Reportar avance\n' +
        '📝 /informe — Informe diario',
        { parse_mode: 'Markdown' }
      );
      await db.clearConversationState(chatUserId);
      return true;
    } else {
      await bot.sendMessage(chatId, '📞 Entendido. Por favor contacta al administrador para ajustar tu salario.\n\nPuedes usar /perfil cuando tengas la confirmación.');
      await db.clearConversationState(chatUserId);
      return true;
    }
  }
  
  // Manejar "omitir", "cancelar", "saltar" 
  const lower = txt.toLowerCase().trim();
  if (lower === 'omitir' || lower === 'saltar') {
    return await advanceToNextStep(bot, chatId, chatUserId, dt);
  }
  if (lower === 'cancelar' || lower === '/cancelar') {
    await db.clearConversationState(chatUserId);
    await bot.sendMessage(chatId, '❌ Onboarding cancelado. Puedes retomarlo con /perfil en cualquier momento.');
    return true;
  }
  
  // Si el campo actual espera foto y enviaron texto (que no sea omitir/cancelar)
  const currentStep = STEPS.find(s => s.key === currentKey);
  if (currentStep?.tipo === 'photo' && lower !== 'omitir') {
    await bot.sendMessage(chatId, '📷 Este paso requiere una *imagen*. Envía una foto o escribe "omitir" para saltar.', { parse_mode: 'Markdown' });
    return true;
  }
  
  // Procesar respuesta según tipo de campo
  let updates = {};
  
  switch (currentKey) {
    case 'cedula':
      const cleanCedula = txt.replace(/[^0-9]/g, '');
      if (cleanCedula.length < 5) {
        await bot.sendMessage(chatId, '⚠️ Número de cédula inválido. Intenta de nuevo.');
        return true;
      }
      updates = { cedula: cleanCedula };
      break;
      
    case 'eps_nombre':
      updates = { eps_nombre: txt.trim() };
      break;
      
    case 'arl_numero':
      updates = { arl_numero: txt.trim() };
      break;
      
    case 'banco':
      updates = { banco: txt.trim() };
      break;
      
    case 'cuenta_bancaria': {
      // Parse "123456789 Ahorros" or "987654321 Corriente"
      const parts = txt.trim().split(/\s+/);
      const numero = parts[0];
      const tipo = parts.slice(1).join(' ') || 'Ahorros';
      const tipoNorm = tipo.toLowerCase().includes('corr') ? 'Corriente' : 'Ahorros';
      updates = { cuenta_bancaria: numero, tipo_cuenta: tipoNorm };
      break;
    }
      
    case 'horario_trabajo':
      updates = { horario_trabajo: txt.trim() };
      break;
      
    case 'intervalo_avances': {
      const val = INTERVALOS[txt.trim()] || txt.trim();
      updates = { intervalo_avances: val };
      break;
    }
      
    case 'talla_camisa': {
      // Parse "M, 32, 40"
      const tallas = txt.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
      updates = {
        talla_camisa: tallas[0] || txt,
        talla_pantalon: tallas[1] || '',
        talla_zapatos: tallas[2] || ''
      };
      break;
    }
      
    case 'contacto_emergencia': {
      // Parse "María López 3101234567"
      const match = txt.match(/^(.+?)\s+([\d+]+)$/);
      if (match) {
        updates = { contacto_emergencia: match[1].trim(), telefono_emergencia: match[2].trim() };
      } else {
        updates = { contacto_emergencia: txt.trim() };
      }
      break;
    }
      
    default:
      updates = { [currentKey]: txt.trim() };
  }
  
  // Guardar en BD
  await updatePersonalField(dt.email, updates);
  
  // Registrar en bitácora
  const fieldLabels = {
    cedula: 'Cédula', direccion_residencia: 'Dirección de residencia', 
    eps_nombre: 'EPS', arl_numero: 'ARL', banco: 'Banco',
    cuenta_bancaria: 'Cuenta bancaria', horario_trabajo: 'Horario', 
    intervalo_avances: 'Intervalo de avances', talla_camisa: 'Tallas dotación',
    contacto_emergencia: 'Contacto emergencia'
  };
  await db.logMessage(chatUserId, 'system', 
    `📋 ONBOARDING: Completó ${fieldLabels[currentKey] || currentKey}`, 
    'onboarding', { paso: currentKey, ...updates }
  );
  
  await bot.sendMessage(chatId, '✅ Guardado.');
  
  // Avanzar al siguiente paso
  return await advanceToNextStep(bot, chatId, chatUserId, dt);
}

/**
 * Manejar fotos recibidas durante onboarding
 */
async function handleOnboardingPhoto(bot, msg, chatUserId, st) {
  const chatId = msg.chat.id;
  const dt = st.data_temp || {};
  const currentKey = dt.currentKey;
  
  if (currentKey !== 'foto_url' && currentKey !== 'cedula_url') {
    // Si recibimos una foto en un paso que no la espera, guardarla como foto de perfil si falta
    const personalData = await db.getPersonalByEmail(dt.email);
    if (!personalData?.foto_url) {
      const photo = msg.photo[msg.photo.length - 1];
      const fileLink = await bot.getFileLink(photo.file_id);
      await updatePersonalField(dt.email, { foto_url: fileLink });
      await bot.sendMessage(chatId, '📸 Foto guardada como foto de perfil. Ahora continúa con el paso actual:');
      // Re-enviar la pregunta del paso actual
      const currentStep = STEPS.find(s => s.key === currentKey);
      if (currentStep) await bot.sendMessage(chatId, currentStep.pregunta, { parse_mode: 'Markdown' });
      return true;
    }
    await bot.sendMessage(chatId, '📷 Imagen recibida, pero este paso requiere texto. Por favor responde con texto.');
    return true;
  }
  
  const photo = msg.photo[msg.photo.length - 1]; // Tomar la de mayor resolución
  
  try {
    const fileLink = await bot.getFileLink(photo.file_id);
    
    // Guardar el file_id de Telegram como URL provisional
    const updates = { [currentKey]: fileLink };
    await updatePersonalField(dt.email, updates);
    
    const label = currentKey === 'foto_url' ? '📸 Foto de perfil' : '🪪 Foto de cédula';
    await db.logMessage(chatUserId, 'system', `📋 ONBOARDING: ${label} subida`, 'onboarding', { paso: currentKey });
    
    await bot.sendMessage(chatId, `✅ ${label} guardada.`);
    return await advanceToNextStep(bot, chatId, chatUserId, dt);
  } catch (e) {
    console.error('[Onboarding] Error procesando foto:', e.message);
    await bot.sendMessage(chatId, '⚠️ Error guardando la foto. Intenta de nuevo o escribe "omitir".');
    return true;
  }
}

/**
 * Avanzar al siguiente paso del onboarding
 */
async function advanceToNextStep(bot, chatId, chatUserId, dt) {
  const personalData = await db.getPersonalByEmail(dt.email);
  if (!personalData) {
    await db.clearConversationState(chatUserId);
    return true;
  }
  
  const isCampo = dt.isCampo;
  
  // Encontrar siguiente paso vacío
  const nextStep = STEPS.find(s => {
    if (s.condicional === 'campo' && !isCampo) return false;
    if (s.key === 'salario_confirmacion') return false;
    return !personalData[s.key];
  });
  
  if (!nextStep) {
    // Todos los campos llenados → confirmación de salario
    const salario = personalData.salario_base || 0;
    const unidad = personalData.unidad_pago || 'Mes';
    const fmt = n => '$ ' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
    
    await db.setConversationState(chatUserId, 'onboarding', 97, { email: dt.email, isCampo });
    await bot.sendMessage(chatId,
      `💰 *Último paso — Confirmación de salario*\n\n` +
      `Tu salario acordado es: *${fmt(salario)} / ${unidad}*\n\n` +
      `¿Es correcto? Escribe *Sí* o *No*`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }
  
  // Enviar pregunta del siguiente paso
  await db.setConversationState(chatUserId, 'onboarding', nextStep.paso, {
    email: dt.email,
    currentKey: nextStep.key,
    isCampo
  });
  await bot.sendMessage(chatId, nextStep.pregunta, { parse_mode: 'Markdown' });
  return true;
}

/**
 * Actualizar campo del personal en Supabase
 */
async function updatePersonalField(email, updates) {
  return db.updatePersonalProfile(email, updates);
}

module.exports = {
  shouldRemindOnboarding,
  sendOnboardingReminder,
  startOnboarding,
  handleOnboardingFlow,
  handleOnboardingPhoto,
  STEPS
};
