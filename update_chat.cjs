const fs = require('fs');

let content = fs.readFileSync('api/chat.ts', 'utf8');

// Replace getGeminiKey with getGeminiKeys
content = content.replace(/import \{ getGeminiKey \} from "\.\/envHelper";/, 'import { getGeminiKeys } from "./envHelper";');

const oldLogic = `        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error("Gemini API key not configured");
        const ai = new GoogleGenAI({ apiKey: geminiKey });`;

const newLogic = `        const geminiKeys = getGeminiKeys();
        if (geminiKeys.length === 0) throw new Error("Gemini API key not configured");`;

content = content.replace(oldLogic, newLogic);

const oldGenLogic = `        const response = await ai.models.generateContent({
            model: targetModel || "gemini-2.5-flash",
            config: { systemInstruction },
            contents: finalContents as any,
        });
        return res.status(200).json({ 
            text: response.text || "",
            tokenUsage: null
        });`;

const newGenLogic = `        let lastError: any = null;
        for (let i = 0; i < geminiKeys.length; i++) {
            const key = geminiKeys[i];
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const response = await ai.models.generateContent({
                    model: targetModel || "gemini-2.5-flash",
                    config: { systemInstruction },
                    contents: finalContents as any,
                });
                return res.status(200).json({ 
                    text: response.text || "",
                    tokenUsage: null
                });
            } catch (err: any) {
                const status = err?.status || err?.response?.status;
                const msg = err?.message || "";
                const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
                if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                    console.warn(\`Key \${i+1} failed, retrying with next key...\`);
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }
        if (lastError) throw lastError;`;

content = content.replace(oldGenLogic, newGenLogic);

fs.writeFileSync('api/chat.ts', content);
console.log("Updated api/chat.ts");
