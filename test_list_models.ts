import { GoogleGenAI } from "@google/genai";
import { getGeminiKeys } from "./api/envHelper.js";

async function run() {
  const keys = getGeminiKeys();
  const key = keys[0];

  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const response = await ai.models.list();
    const models = Array.from(response).map(m => m.name);
    console.log("Available models:", models.join(", "));
  } catch (e: any) {
    console.log("ListModels error:", e.message);
  }
}
run();
