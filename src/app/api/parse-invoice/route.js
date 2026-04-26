import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!file) {
      return Response.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "GEMINI_API_KEY no está configurada en el servidor" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Eres un sistema inteligente de digitalización para gestión de proyectos de construcción.
Analiza la siguiente imagen de factura, remisión o recibo.
Extrae la lista de materiales o insumos. 
Para cada material extrae:
- nombre_detectado: nombre descriptivo del material.
- cantidad: la cantidad numérica. Si no hay cantidad numérica, asume 1 y devuelve el número.
- costo_unitario: el precio por unidad (solo el número, sin comas ni signos de monedas). Si solo existe un costo total, divídelo entre la cantidad y devuelve el unitario, de lo contrario devuelve 0.

También intenta detectar el distribuidor o nombre de la ferretería/proveedor.

Responde ESTRICTAMENTE con un objeto JSON válido usando el siguiente esquema (NO incluyas bloques markdown ni explicaciones adicionales, tu respuesta DEBE comenzar con '{' y terminar con '}'):
{
  "distribuidor": "Nombre del Proveedor",
  "items": [
    { "nombre_detectado": "Ejemplo material", "cantidad": 100, "costo_unitario": 35000 }
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      },
    ]);

    const text = result.response.text();
    
    // Limpieza agresiva por si la IA devuelve bloques markdown o texto basura antes/después del JSON
    let parsedText = text.trim();
    if (parsedText.startsWith('```')) {
      parsedText = parsedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(parsedText);
    return Response.json(data);
  } catch (error) {
    console.error("Error validando la factura con Gemini:", error);
    return Response.json({ error: "Error de IA: " + error.message }, { status: 500 });
  }
}
