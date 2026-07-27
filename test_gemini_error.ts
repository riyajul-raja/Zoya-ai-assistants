import { getZoyaResponseStream } from './src/services/geminiService.ts';
import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: "hello",
    });
    for await (const chunk of responseStream) {
        console.log(chunk.text);
    }
  } catch (error: any) {
    console.log("EXACT ERROR MESSAGE:", error.message);
    console.log("EXACT ERROR STATUS:", error.status);
    console.log("EXACT ERROR DETAILS:", JSON.stringify(error, null, 2));
  }
}
run();
