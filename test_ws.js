import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({});
async function run() {
  const session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: ["AUDIO"],
      systemInstruction: { parts: [{ text: "You are Zoya." }] },
    }
  });
  console.log("Connected!");
  session.sendRealtimeInput({
    media: { data: "AAAA", mimeType: 'audio/pcm;rate=16000' }
  });
  console.log("Sent media!");
  session.onclose = () => console.log("Closed!");
  session.onerror = (e) => console.log("Error!", e);
  session.onmessage = (m) => console.log(JSON.stringify(m));
  
  await new Promise(r => setTimeout(r, 5000));
}
run().catch(console.error);
