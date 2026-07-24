import { getGeminiKeys } from "./envHelper";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames } = req.body;
        let targetModel = selectedModel || "gemini-1.5-flash";
        
        const geminiKeys = getGeminiKeys();
        
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

        let lastError: any = null;
        for (let i = 0; i < geminiKeys.length; i++) {
            const key = geminiKeys[i];
            if (!key || key.trim() === "") {
                throw new Error("STOP: API Key is completely empty in the code!");
            }
            try {
                const url = "https://generativelanguage.googleapis.com/v1beta/models/" + targetModel + ":generateContent?key=" + key;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemInstruction }] },
                        contents: finalContents
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const error: any = new Error(errData?.error?.message || response.statusText);
                    error.status = response.status;
                    throw error;
                }

                const data = await response.json();
                const responseText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "";

                return res.status(200).json({ 
                    text: responseText,
                    tokenUsage: null
                });
            } catch (err: any) {
                const status = err?.status || err?.response?.status;
                const msg = err?.message || "";
                const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
                if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                    console.warn("Key " + (i+1) + " failed, retrying with next key...");
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }
        if (lastError) throw lastError;

    } catch (error: any) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message || 'An error occurred during chat' });
    }
}