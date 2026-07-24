const fs = require('fs');

const chatTs = `import { getGeminiKeys } from "./envHelper";
import { GoogleGenAI } from "@google/genai";

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
            try {
                const ai = new GoogleGenAI({ 
                    apiKey: key,
                    httpOptions: { headers: { 'x-goog-api-key': key, 'Authorization': '' } }
                });
                
                const response = await ai.models.generateContent({
                    model: targetModel,
                    contents: finalContents,
                    config: {
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    }
                });

                return res.status(200).json({ 
                    text: response.text,
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
`;

const streamTs = `import { getGeminiKeys } from "../envHelper";
import { GoogleGenAI } from "@google/genai";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames } = req.body;
        
        let targetModel = "gemini-1.5-flash";
        if (selectedModel) {
            targetModel = selectedModel;
        }
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const sendEvent = (event: string, data: any) => {
            res.write("event: " + event + "\\n");
            res.write("data: " + JSON.stringify(data) + "\\n\\n");
        };
        
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
        let responseStreamObj: any = null;
        
        for (let i = 0; i < geminiKeys.length; i++) {
            const key = geminiKeys[i];
            try {
                const ai = new GoogleGenAI({ 
                    apiKey: key,
                    httpOptions: { headers: { 'x-goog-api-key': key, 'Authorization': '' } }
                });
                
                responseStreamObj = await ai.models.generateContentStream({
                    model: targetModel,
                    contents: finalContents,
                    config: {
                        systemInstruction: { parts: [{ text: systemInstruction }] }
                    }
                });
                
                break;
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
        
        if (!responseStreamObj && lastError) throw lastError;

        if (responseStreamObj) {
            for await (const chunk of responseStreamObj) {
                if (chunk.text) {
                    sendEvent('chunk', { text: chunk.text });
                }
            }
        }
        
        sendEvent('done', {});
        res.end();
    } catch (error: any) {
        console.error("Stream Chat Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'An error occurred during chat stream' });
        } else {
            res.write("event: error\\n");
            res.write("data: " + JSON.stringify({ error: error.message }) + "\\n\\n");
            res.end();
        }
    }
}
`;

const geminiServiceTs = `import { diagnosticsStore, Provider } from "./diagnosticsStore";
import { GoogleGenAI } from "@google/genai";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export function getGeminiKeys() {
  const keys: string[] = [];
  
  const viteKey1 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_1 : undefined;
  const viteKey2 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_2 : undefined;
  const viteKey3 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_3 : undefined;
  const viteKey4 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_4 : undefined;
  const viteKeyDef = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;

  const nodeKey1 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_1 : undefined;
  const nodeKey2 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_2 : undefined;
  const nodeKey3 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_3 : undefined;
  const nodeKey4 = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY_4 : undefined;
  const nodeKeyDef = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
  
  const key1 = viteKey1 || nodeKey1;
  const key2 = viteKey2 || nodeKey2;
  const key3 = viteKey3 || nodeKey3;
  const key4 = viteKey4 || nodeKey4;
  const keyDef = viteKeyDef || nodeKeyDef;
  
  const isValidKey = (k: string | undefined) => {
      if (!k) return false;
      const t = k.trim();
      return t.length > 0 && !t.startsWith("ya29.");
  };

  if (isValidKey(key1)) keys.push(key1!.trim());
  if (isValidKey(key2)) keys.push(key2!.trim());
  if (isValidKey(key3)) keys.push(key3!.trim());
  if (isValidKey(key4)) keys.push(key4!.trim());

  if (isValidKey(keyDef) && !keys.includes(keyDef!.trim())) keys.push(keyDef!.trim());
      
  if (keys.length === 0) {
      throw new Error("STOP: API Key is completely empty in the code! Please check your environment variables.");
  }
  return keys;
}

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini-1.5-flash"
): Promise<string> {
  const isDev = import.meta.env.DEV;
  const startTime = Date.now();
  diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel || "gemini-1.5-flash" });
  
  try {
    let accumulatedText = "";
    const geminiKeys = getGeminiKeys();
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    
    for (const msg of history.slice(-6)) {
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
    let responseStreamObj: any = null;
    
    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ 
                apiKey: key,
                httpOptions: { headers: { 'x-goog-api-key': key, 'Authorization': '' } }
            });
            
            responseStreamObj = await ai.models.generateContentStream({
                model: selectedModel || "gemini-1.5-flash",
                contents: finalContents,
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });
            break;
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
    
    if (!responseStreamObj && lastError) throw lastError;

    if (responseStreamObj) {
        for await (const chunk of responseStreamObj) {
            if (chunk.text) {
                accumulatedText += chunk.text;
                if (onChunk) onChunk(accumulatedText);
            }
        }
    }
    
    diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { status: "success", latencyMs: Date.now() - startTime });
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error("Stream Error:", error);
    throw error;
  }
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  selectedModel: string = "gemini-1.5-flash"
): Promise<string> {
  const isDev = import.meta.env.DEV;
  const startTime = Date.now();
  diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel || "gemini-1.5-flash" });
  
  try {
    const geminiKeys = getGeminiKeys();
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    
    for (const msg of history.slice(-6)) {
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
    let responseText = "";
    
    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ 
                apiKey: key,
                httpOptions: { headers: { 'x-goog-api-key': key, 'Authorization': '' } }
            });
            
            const response = await ai.models.generateContent({
                model: selectedModel || "gemini-1.5-flash",
                contents: finalContents,
                config: {
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });
            responseText = response.text || "";
            break;
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
    
    if (!responseText && lastError) throw lastError;

    diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { 
       status: "success", 
       latencyMs: Date.now() - startTime 
    });
    
    return responseText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider((selectedModel || "gemini-1.5-flash") as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error("Request Error:", error);
    throw error;
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  const isDev = import.meta.env.DEV;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "API returned error: " + response.statusText);
    }
    return data.audio;
  } catch (error) {
    if (isDev) console.error("TTS Error:", error);
    return null;
  }
}
`;

fs.writeFileSync('api/chat.ts', chatTs);
fs.writeFileSync('api/chat/stream.ts', streamTs);
fs.writeFileSync('src/services/geminiService.ts', geminiServiceTs);
