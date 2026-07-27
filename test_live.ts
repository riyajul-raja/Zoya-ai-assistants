import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI();
async function run() {
  const session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: { parts: [{ text: "You are Zoya." }] },
    }
  });
  console.log("Connected!");
  session.sendRealtimeInput({
    audio: { data: "AAAA", mimeType: 'audio/pcm;rate=16000' }
  });
  console.log("Sent audio");
  
  session.onmessage = (message) => {
    console.log("Received:", JSON.stringify(message));
  };
  session.onclose = () => console.log("Closed!");
  session.onerror = (e) => console.log("Error!", e);
}
run().catch(console.error);
