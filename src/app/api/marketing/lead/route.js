/**
 * API Route: /api/marketing/lead
 * 
 * Handles incoming lead form submissions from landing pages.
 * 1. Validates the data
 * 2. Stores in Supabase (marketing_leads table)
 * 3. Sends WhatsApp notification to team via Twilio
 * 4. Sends welcome WhatsApp to lead via Twilio
 * 
 * For Next.js App Router (route.js)
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

function getTwilioConfig() {
    return {
        sid: process.env.TWILIO_ACCOUNT_SID,
        token: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_WHATSAPP_FROM || '+14155238886',
        teamPhone: process.env.KALARTI_TEAM_PHONE || '+573177725056',
    };
}

async function sendTwilioWhatsApp(twilio, to, body) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.sid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${twilio.from}`);
    formData.append('To', `whatsapp:${to}`);
    formData.append('Body', body);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilio.sid}:${twilio.token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });
    return res.json();
}

export async function POST(request) {
    try {
        const data = await request.json();

        // Validate required fields
        if (!data.nombre || !data.telefono || !data.servicio) {
            return Response.json(
                { error: 'Campos requeridos: nombre, telefono, servicio' },
                { status: 400 }
            );
        }

        // Normalize phone number
        let phone = data.telefono.replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
            phone = phone.startsWith('57') ? `+${phone}` : `+57${phone}`;
        }

        // 1. Store lead in Supabase
        const leadData = {
            nombre: data.nombre,
            telefono: phone,
            email: data.email || null,
            servicio: data.servicio,
            ciudad: data.ciudad || null,
            mensaje: data.mensaje || null,
            gclid: data.gclid || null,
            msclkid: data.msclkid || null,
            utm_source: data.utm_source || null,
            utm_medium: data.utm_medium || null,
            utm_campaign: data.utm_campaign || null,
            landing_page: data.landing_page || null,
            estado: 'nuevo',
            fuente: data.gclid ? 'google_ads' : data.msclkid ? 'microsoft_ads' : 'organico',
            created_at: new Date().toISOString(),
        };

        const { error: dbError } = await getSupabase()
            .from('marketing_leads')
            .insert(leadData);

        if (dbError) {
            console.error('Supabase error:', dbError);
            // Don't fail the request - still try to send WhatsApp
        }

        // 2. Send WhatsApp notification to team
        const serviceLabels = {
            'construccion_vivienda': '🏠 Construcción de Vivienda',
            'remodelacion': '🔧 Remodelación',
            'diseno_arquitectonico': '📐 Diseño Arquitectónico',
            'diseno_estructural': '🏗️ Diseño Estructural',
            'consultoria': '📋 Consultoría / Interventoría',
            'obras_civiles': '🚧 Obras Civiles',
            'ambiental': '🌿 Estudios Ambientales',
            'otro': '📌 Otro',
        };

        const source = data.gclid ? '🟢 Google Ads' 
                     : data.msclkid ? '🔵 Microsoft Ads' 
                     : '⚪ Orgánico';

        const teamMsg = `🔔 *NUEVO LEAD*\n\n` +
            `👤 *${data.nombre}*\n` +
            `📞 ${phone}\n` +
            `🏗️ ${serviceLabels[data.servicio] || data.servicio}\n` +
            `📍 ${data.ciudad || 'N/A'}\n` +
            `📊 ${source}\n` +
            `💬 ${data.mensaje || 'Sin mensaje'}\n\n` +
            `⚡ _Contactar rápido_`;

        const twilio = getTwilioConfig();
        if (twilio.sid && twilio.token) {
            // Send to team
            await sendTwilioWhatsApp(twilio, twilio.teamPhone, teamMsg).catch(err => {
                console.error('Twilio team notification failed:', err);
            });

            // Send welcome to lead
            const welcomeMsg = `¡Hola ${data.nombre.split(' ')[0]}! 👋\n\n` +
                `Gracias por contactar a *KALARTI Constructores*.\n` +
                `Recibimos tu solicitud y un asesor te contactará pronto.\n\n` +
                `— Equipo KALARTI 🏗️`;

            await sendTwilioWhatsApp(twilio, phone, welcomeMsg).catch(err => {
                console.error('Twilio lead welcome failed:', err);
            });
        }

        return Response.json({
            success: true,
            lead_id: null,
            message: 'Lead registrado exitosamente'
        });

    } catch (error) {
        console.error('Lead API error:', error);
        return Response.json(
            { error: 'Error procesando el lead' },
            { status: 500 }
        );
    }
}
