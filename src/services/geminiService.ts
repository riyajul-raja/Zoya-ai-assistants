import { diagnosticsStore, Provider } from "./diagnosticsStore";
import { GoogleGenAI } from "@google/genai";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export function getGeminiKeys() {
  const keys = [];
  const getEnv = (name) => {
    try {
      if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
    } catch (e) {}
    try {
      // @ts-ignore
      if (import.meta && import.meta.env && import.meta.env[name]) return import.meta.env[name];
    } catch (e) {}
    return "";
  };

  const key1 = getEnv("VITE_GEMINI_API_KEY_1") || getEnv("GEMINI_API_KEY_1");
  const key2 = getEnv("VITE_GEMINI_API_KEY_2") || getEnv("GEMINI_API_KEY_2");
  const key3 = getEnv("VITE_GEMINI_API_KEY_3") || getEnv("GEMINI_API_KEY_3");
  const key4 = getEnv("VITE_GEMINI_API_KEY_4") || getEnv("GEMINI_API_KEY_4");
  

  if (key1 && !key1.trim().startsWith("ya29.")) keys.push(key1.trim());
  if (key2 && !key2.trim().startsWith("ya29.")) keys.push(key2.trim());
  if (key3 && !key3.trim().startsWith("ya29.")) keys.push(key3.trim());
  if (key4 && !key4.trim().startsWith("ya29.")) keys.push(key4.trim());
  const keyDef = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY");
  if (keyDef && !keyDef.trim().startsWith("ya29.") && !keys.includes(keyDef.trim())) keys.push(keyDef.trim());
  
  
  return keys;
}

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini"
): Promise<string> {
  const isDev = import.meta.env.DEV;
  const startTime = Date.now();
  diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel || "gemini-2.5-flash" });

  try {
    let accumulatedText = "";

    const geminiKeys = getGeminiKeys();
    if (geminiKeys.length === 0) throw new Error("Gemini API key not configured.");
    
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
    let responseStream: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ apiKey: key.trim() });
            responseStream = await ai.models.generateContentStream({
                model: selectedModel || "gemini-2.5-flash",
                config: { systemInstruction },
                contents: finalContents as any,
            });
            break;
        } catch (err: any) {
            const status = err?.status || err?.response?.status;
            const msg = err?.message || "";
            const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
            if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                console.warn(`Key ${i+1} failed, retrying with next key...`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    
    if (!responseStream && lastError) throw lastError;

    for await (const chunk of responseStream) {
      const content = chunk.text || "";
      if (content) {
        accumulatedText += content;
        if (onChunk) onChunk(accumulatedText);
      }
    }

    diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { status: "success", latencyMs: Date.now() - startTime });
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error(`${selectedModel} Stream Error:`, error);
    throw error;
  }
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  selectedModel: string = "gemini"
): Promise<string> {
  const isDev = import.meta.env.DEV;
  const startTime = Date.now();
  diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel || "gemini-2.5-flash" });
  
  try {
    let text = "";

    const geminiKeys = getGeminiKeys();
    if (geminiKeys.length === 0) throw new Error("Gemini API key not configured.");
    
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
    let response: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ apiKey: key.trim() });
            response = await ai.models.generateContent({
                model: selectedModel || "gemini-2.5-flash",
                config: { systemInstruction },
                contents: finalContents as any,
            });
            break;
        } catch (err: any) {
            const status = err?.status || err?.response?.status;
            const msg = err?.message || "";
            const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
            if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                console.warn(`Key ${i+1} failed, retrying with next key...`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }

    if (!response && lastError) throw lastError;
    
    text = response.text || "";

    diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { 
      status: "success", 
      latencyMs: Date.now() - startTime
    });
    
    return text || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error(`${selectedModel} Request Error:`, error);
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
      throw new Error(data.error || `API returned error: ${response.statusText}`);
    }
    return data.audio;
  } catch (error) {
    if (isDev) console.error("TTS Error:", error);
    return null;
  }
}
