/**
 * API Route: POST /api/notify-telegram
 * Envía un mensaje de notificación directa al usuario por Telegram Bot API.
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  const { telegramId, message } = await request.json();

  if (!telegramId || !message) {
    return NextResponse.json({ error: 'telegramId y message son requeridos' }, { status: 400 });
  }

  // Leer el token del bot
  let botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    try {
      const envPath = path.join(process.cwd(), 'telegram-bot', '.env');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/TELEGRAM_BOT_TOKEN=(.+)/);
      if (match) botToken = match[1].trim();
    } catch (e) {
      console.warn('[API notify-telegram] No se pudo leer .env del bot:', e.message);
    }
  }

  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[API notify-telegram] Telegram API error:', data.description);
      return NextResponse.json({ error: data.description || 'Error enviando mensaje' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message_id: data.result?.message_id });
  } catch (e) {
    console.error('[API notify-telegram] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
