/**
 * telegram-bot/copilot/ai.js — Integración con Google Gemini
 * Procesa lenguaje natural para el ERP de Construcción.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY no configurada. La IA estará desactivada.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Procesa un mensaje de texto libre usando Gemini.
 * @param {string} text - El mensaje del usuario.
 * @param {object} userInfo - Información del usuario (rol, nombre).
 * @returns {Promise<string>} - Respuesta de la IA.
 */
async function processChatMessage(text, userInfo) {
  if (!genAI) return "Lo siento, mi sistema de IA no está configurado en este momento.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Obtener contexto simple (Proyectos activos)
    const proyectos = await db.getProyectos();
    const proyectosNombres = proyectos.map(p => p.nombre).join(", ");

    const systemPrompt = `Eres "Kalarti Copilot", un asistente inteligente para un ERP de construcción.
Usuario: ${userInfo.nombre} (Rol: ${userInfo.role || 'Invitado/Cliente'}).
Contexto de Proyectos: [${proyectosNombres}].

Instrucciones:
1. Responde de forma profesional, concisa y útil.
2. Si el usuario pregunta por costos o APUs, guíalo a usar /cotizar o /insumos si no puedes dar la respuesta exacta.
3. Si el usuario quiere reportar algo (avance, entrada, salida), recuérdale que use los comandos específicos (/entrada, /avance).
4. Si el usuario pregunta "¿Qué puedes hacer?", resume tus funciones según su rol.
5. Usa emojis de construcción 🏗️, 📊, 👷 de forma moderada.
6. Habla en español de Colombia si es posible (ej: "obra", "insumos", "presupuesto").

Mensaje del usuario: "${text}"`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error en Gemini processChatMessage:", error);
    return "Ups, tuve un problema procesando tu mensaje con mi cerebro de IA. ¿Puedes intentar de nuevo o usar un comando?";
  }
}

/**
 * Intenta detectar una intención específica para automatizar acciones.
 * (Futuro: Convertir "Gaste 10 en arena" en un registro de gasto).
 */
async function processAudioMessage(audioBuffer, mimeType, userInfo) {
  if (!genAI) return "Lo siento, mi sistema de IA no está configurado para audio.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const proyectos = await db.getProyectos();
    const proyectosNombres = proyectos.map(p => p.nombre).join(", ");

    const prompt = `Eres "Kalarti Copilot", un asistente inteligente para un ERP de construcción.
Usuario: ${userInfo.nombre} (Rol: ${userInfo.role || 'Invitado/Cliente'}).
Contexto de Proyectos: [${proyectosNombres}].

Instrucciones:
1. Escucha el audio adjunto.
2. Transcribe lo que dice el usuario y respóndele de forma profesional y concisa.
3. Si el usuario reporta un avance o entrada, indícale que has entendido pero recuérdale los comandos si es necesario.
4. Responde en español de Colombia.

Responde con la transcripción y tu respuesta sugerida.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBuffer.toString("base64"),
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error en Gemini processAudioMessage:", error);
    return "Tuve un problema procesando tu nota de voz. ¿Puedes intentar escribirme?";
  }
}

/**
 * Intenta detectar una intención específica para automatizar acciones.
 */
async function detectIntent(text) {
  return null;
}

module.exports = { processChatMessage, processAudioMessage, detectIntent };
