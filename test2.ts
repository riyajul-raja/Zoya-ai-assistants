import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: "test" });
async function run() {
  const session = await ai.live.connect({ model: "gemini-3.1-flash-live-preview", callbacks: {} });
  session.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: "AAAA" }]);
  session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: "AAAA" } });
  session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: "AAAA" } });
  session.sendRealtimeInput({ mimeType: 'audio/pcm;rate=16000', data: "AAAA" } as any);
}
