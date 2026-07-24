const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'fake_key', httpOptions: { headers: { 'Authorization': undefined, 'x-goog-api-key': 'fake_key' } } });
ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'hi' }).catch(console.error);
