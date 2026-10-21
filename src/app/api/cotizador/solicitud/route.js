import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTeamWhatsApp } from '@/lib/server/supabase-server';
import { formatMoney } from '@/lib/cotizador/config';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tipo, // 'contratar_obra' | 'asesoria' | 'solo_guardar' | 'empresa'
      nombre,
      email,
      telefono,
      ciudad,
      mensaje,
      proyectoNombre,
      presupuestoTotal,
      numItems,
      duracionDias,
      resumenItems = [],
    } = body;

    if (!tipo || !nombre || !telefono) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (tipo, nombre, teléfono)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const sb = createClient(supabaseUrl, supabaseAnonKey);

    // Intentar registrar en cotizador_solicitudes si la tabla existe
    try {
      await sb.from('cotizador_solicitudes').insert({
        tipo,
        nombre,
        email,
        telefono,
        ciudad,
        mensaje,
        total: presupuestoTotal || 0,
        resumen: {
          proyectoNombre,
          numItems,
          duracionDias,
          topItems: resumenItems.slice(0, 10),
        },
      });
    } catch (e) {
      console.warn('Nota: cotizador_solicitudes no disponible aún:', e.message);
    }

    // Mapeo de tipos y títulos
    const labelsTipo = {
      contratar_obra: '🏗️ SOLICITUD DE CONTRATACIÓN DE OBRA',
      asesoria: '📐 SOLICITUD DE ASESORÍA / INTERVENTORÍA',
      solo_guardar: '💾 PROYECTO GUARDADO POR CLIENTE',
      empresa: '🏢 SOLICITUD PLAN EMPRESA A MEDIDA',
    };

    const titulo = labelsTipo[tipo] || '📋 NUEVA SOLICITUD COTIZADOR';
    const totalFormateado = formatMoney(presupuestoTotal || 0, 'COP');

    // Mensaje de notificación WhatsApp para el equipo Kalarti
    const mensajeWhatsApp = `🔔 *${titulo}*\n\n` +
      `👤 *Cliente:* ${nombre}\n` +
      `📞 *Teléfono:* ${telefono}\n` +
      `📧 *Email:* ${email || 'N/A'}\n` +
      `📍 *Ciudad:* ${ciudad || 'N/A'}\n` +
      `🏗️ *Proyecto:* ${proyectoNombre || 'Sin nombre'}\n` +
      `💰 *Presupuesto Estimado:* ${totalFormateado} COP\n` +
      `⏱️ *Duración Estimada:* ${duracionDias || 0} días hábiles\n` +
      `📦 *Total Ítems:* ${numItems || 0}\n` +
      (mensaje ? `💬 *Nota del cliente:* ${mensaje}\n` : '') +
      `\n⚡ _Registrado desde el Cotizador Kalarti Web_`;

    // Disparar WhatsApp al equipo de Kalarti
    await sendTeamWhatsApp(mensajeWhatsApp).catch(err => {
      console.error('Error enviando WhatsApp al equipo:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud procesada correctamente y notificada al equipo.',
    });
  } catch (error) {
    console.error('Error en /api/cotizador/solicitud:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
