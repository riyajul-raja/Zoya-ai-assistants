export default function handler(req: any, res: any) {
  const envStatus = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? "FOUND" : "MISSING",
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? "FOUND" : "MISSING",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "FOUND" : "MISSING",
  };
  console.log(`[Config Route] Env Status:`, envStatus);

  res.status(200).json({
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    huggingface: !!process.env.HUGGINGFACE_API_KEY,
    envStatus
  });
}
