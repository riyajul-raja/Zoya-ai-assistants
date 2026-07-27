const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: ["AUDIO"],
      systemInstruction: "You are Zoya.",
      tools: []
    }
  });
  console.log("Connected");
  session.sendRealtimeInput({
    audio: { data: "AAAA", mimeType: 'audio/pcm;rate=16000' }
  });
  console.log("Sent");
}
test().catch(console.error);
