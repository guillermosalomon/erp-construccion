const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.getGenerativeModel({ model: 'gemini-pro' }).generateContent("Hi"); // just a test
    console.log("Key works");
  } catch (error) {
    console.error(error);
  }
}

async function list() {
  try {
    // Actually we can hit the REST endpoint
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name));
  } catch (e) {
    console.error(e);
  }
}

list();
