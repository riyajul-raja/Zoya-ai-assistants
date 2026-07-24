const fs = require('fs');
let code = fs.readFileSync('api/chat.ts', 'utf8');

// Replace getGeminiKeys import with getApiKey
code = code.replace(/import { getGeminiKeys } from "\.\/envHelper";/, 'import { getApiKey } from "./envHelper";');

// Replace the handler implementation
const newHandler = `export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames } = req.body;
        let targetModel = selectedModel || "gemini-2.5-flash";
        
        const apiKey = getApiKey();
        
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

        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
            model: targetModel,
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
}`;

code = code.replace(/export default async function handler\(req: any, res: any\) \{[\s\S]*\}\s*$/, newHandler);

fs.writeFileSync('api/chat.ts', code);
