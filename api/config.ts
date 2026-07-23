export default function handler(req: any, res: any) {
  res.status(200).json({
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    huggingface: !!process.env.HUGGINGFACE_API_KEY
  });
}
