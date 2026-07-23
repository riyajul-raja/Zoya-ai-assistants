import { GoogleGenAI } from "@google/genai";
import { getGeminiKey } from "../envHelper";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames } = req.body;
        
        let targetModel = "gemini-2.5-flash";
        if (selectedModel) {
            targetModel = selectedModel;
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

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

        const responseStream = await ai.models.generateContentStream({
            model: targetModel || "gemini-2.5-flash",
            config: { systemInstruction },
            contents: finalContents as any,
        });

        for await (const chunk of responseStream) {
            const content = chunk.text || "";
            if (content) {
                sendEvent('chunk', { text: content });
            }
        }
        
        sendEvent('done', {});
        res.end();
    } catch (error: any) {
        console.error("Stream Chat Error:", error);
        // If headers are already sent, we just end the stream
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'An error occurred during chat stream' });
        } else {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
}
