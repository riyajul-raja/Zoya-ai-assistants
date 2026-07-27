const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI(); // It will use process.env.GEMINI_API_KEY
async function test() {
  const sessionPromise = ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: ["AUDIO"],
      systemInstruction: "You are Zoya.",
      tools: []
    }
  });
  const session = await sessionPromise;
  console.log("Connected");
  session.sendRealtimeInput([{
    mimeType: 'audio/pcm;rate=16000',
    data: "AAAA"
  }]);
  console.log("Sent array");
  
  try {
      session.sendRealtimeInput({
        audio: { data: "AAAA", mimeType: 'audio/pcm;rate=16000' }
      });
      console.log("Sent object");
  } catch(e) {
      console.error("Error sending object:", e.message);
  }
}
test().catch(console.error);
