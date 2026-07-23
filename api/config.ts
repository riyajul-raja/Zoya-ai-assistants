import { getGroqKey, getHfKey, getGeminiKey } from "./envHelper";
export default function handler(req: any, res: any) {
  const envStatus = {
    GROQ_API_KEY: getGroqKey() ? "FOUND" : "MISSING",
    HUGGINGFACE_API_KEY: getHfKey() ? "FOUND" : "MISSING",
    GEMINI_API_KEY: getGeminiKey() ? "FOUND" : "MISSING",
  };
  console.log(`[Config Route] Env Status:`, envStatus);

  res.status(200).json({
    gemini: !!getGeminiKey(),
    groq: !!getGroqKey(),
    huggingface: !!getHfKey(),
    envStatus
  });
}
