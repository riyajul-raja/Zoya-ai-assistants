import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  try {
    const keys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY];
    const geminiKey = keys.find(k => k && !k.trim().startsWith("ya29."));
    if (!geminiKey) {
        return res.status(500).json({ error: "Gemini API key not configured." });
    }
    const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return res.status(200).json({ audio: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null });
  } catch (error: any) {
    console.error("TTS Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
