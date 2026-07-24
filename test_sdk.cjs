const { GoogleGenAI } = require('@google/genai');
// we don't have a real API key, so we expect an error
const ai = new GoogleGenAI({ apiKey: 'fake_key', httpOptions: { headers: { 'Authorization': '', 'x-goog-api-key': 'fake_key' } } });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'hi' }).catch(console.error);
