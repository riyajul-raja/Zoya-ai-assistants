import { GoogleGenAI } from "@google/genai";
import { getGeminiKey } from "./envHelper";

const systemInstruction = "Your name is Zoya. You are an elite, highly intelligent, and deep-thinking Indian female AI assistant. Always address the user as 'Boss'. Your tone is warm, polite, highly polished, and respectful. You think deeply before answering, offering logical, sharp, precise, and advanced insights. Speak in a mix of sophisticated, smooth English and Roman Hindi (Hinglish). Do not use childish language, overly emotional phrasing, or refer to yourself as a 'friend'. Remain humble, sweet, and deeply capable. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant.";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames } = req.body;

        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error("Gemini API key not configured");

        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        let formattedHistory: any[] = [];
        let currentRole = "";
        
        for (const msg of (history || []).slice(-6)) {
            if (!msg || !msg.text) continue;
            const role = msg.sender === "user" ? "user" : "model";
            let parts: any[] = [{ text: msg.text }];
            
            if (role === currentRole && formattedHistory.length > 0) {
                formattedHistory[formattedHistory.length - 1].parts.push(...parts);
            } else {
                formattedHistory.push({ role, parts });
                currentRole = role;
            }
        }
        
        if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
            formattedHistory.shift();
        }

        const normalizedImageFrames = Array.isArray(imageFrames) ? imageFrames : (imageFrames ? [imageFrames] : []);
        let currentMessageParts: any[] = [];
        if (normalizedImageFrames.length > 0) {
            currentMessageParts = normalizedImageFrames.map((frame: string) => ({
                inlineData: { mimeType: "image/jpeg", data: frame.includes(',') ? frame.split(',')[1] : frame }
            }));
            currentMessageParts.push({ text: prompt });
        } else {
            currentMessageParts = [{ text: prompt }];
        }

        const finalContents = [
            ...formattedHistory,
            { role: "user", parts: currentMessageParts }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: { systemInstruction },
            contents: finalContents as any,
        });

        return res.status(200).json({ 
            text: response.text || "",
            tokenUsage: null
        });

    } catch (error: any) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during chat' });
    }
}
