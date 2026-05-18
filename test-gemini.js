const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'C:/Users/Equipo/.gemini/antigravity/scratch/ERP_Construccion/erp-construccion/.env.local' });

async function testGemini() {
    console.log("Probando Gemini API Key...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const result = await model.generateContent("Hola, esto es una prueba corta.");
        console.log("Éxito! Respuesta:", result.response.text());
    } catch (e) {
        console.error("Error en Gemini:", e.message);
    }
}

testGemini();
