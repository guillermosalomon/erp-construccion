import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prompt del sistema para definir la personalidad de la IA
const SYSTEM_PROMPT = `Eres el asistente virtual de inteligencia artificial de KALARTI Constructores y Consultores, una empresa de construcción ubicada en Pasto, Nariño (Colombia).
Tu objetivo es atender a los clientes que llegan por WhatsApp, resolver sus dudas básicas sobre servicios de construcción, diseño BIM, remodelaciones y obras civiles, y persuadirlos para que soliciten una cotización formal.
Sé amable, profesional, conciso y muy persuasivo. Usa emojis de manera profesional pero amigable.
Tus servicios principales son: Construcción de vivienda nueva, Diseño Estructural y Arquitectónico con metodología BIM (BIM 5D), Obras Civiles, e Interventoría.
REGLAS IMPORTANTES:
1. Si el cliente pregunta por precios, dile que en construcción cada proyecto es único y los precios dependen del diseño, pero anímalo a agendar una visita o compartir más detalles para darle un estimado.
2. Si el cliente quiere hablar con un humano, pide una cotización formal o hace una pregunta muy técnica, dile que un ingeniero especialista se pondrá en contacto con él a la brevedad.
3. Mantén tus respuestas relativamente cortas, ideales para leer en WhatsApp (máximo 2-3 párrafos cortos).`;

export async function POST(request) {
    try {
        // Twilio envía los datos del webhook como 'application/x-www-form-urlencoded'
        const formData = await request.formData();
        const incomingMessage = formData.get('Body') || '';
        const sender = formData.get('From') || '';

        console.log(`[WhatsApp Webhook] Mensaje recibido de ${sender}: ${incomingMessage}`);

        if (!incomingMessage) {
            return new Response('No message content', { status: 400 });
        }

        // Llamar a la IA (Gemini)
        // Usamos gemini-1.5-flash por ser rápido e ideal para chats
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Estructuramos el prompt con el contexto y el mensaje del usuario
        const prompt = `${SYSTEM_PROMPT}\n\nCliente dice: "${incomingMessage}"\n\nRespuesta de Kalarti:`;

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();

        console.log(`[WhatsApp Webhook] Respuesta IA: ${aiResponse}`);

        // Devolver la respuesta en formato TwiML (XML) que Twilio entiende
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapeXml(aiResponse)}</Message>
</Response>`;

        return new Response(twiml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });

    } catch (error) {
        console.error('[WhatsApp Webhook] Error:', error);
        
        // Mensaje de respaldo por si la IA falla o hay timeout
        const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>¡Hola! Hemos recibido tu mensaje. En este momento todos nuestros ingenieros están ocupados, pero te responderemos a la brevedad posible. 🏗️</Message>
</Response>`;

        return new Response(fallbackTwiml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });
    }
}

// Función auxiliar para escapar caracteres especiales de XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
