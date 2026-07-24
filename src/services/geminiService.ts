import { diagnosticsStore, Provider } from "./diagnosticsStore";

const systemInstruction = "You are Zoya, a smart, intelligent, and highly capable AI voice assistant created by Riyajul. Always address the user as 'Boss'. Speak in natural, fluent Hinglish (just like a modern, smart Indian AI assistant). Do NOT use stiff/bookish English words like 'splendid', 'navigate', or 'precision'. Never use 'Namaste' or robotic bookish greetings. Start responses naturally and conversationally. Keep responses short, direct, sweet, and to the point (1-2 lines maximum for general chats). Do not write long paragraphs for simple greetings. Example Response for 'Hlo': 'Haan Boss, bolo! Main bilkul ready hoon. Aaj kya karna hai?'. Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant created by Riyajul.";

export function getGeminiKeys() {
  const keys: string[] = [];
  
  // Statically reference Vite env variables
  const viteKey1 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_1 : undefined;
  const viteKey2 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_2 : undefined;
  const viteKey3 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_3 : undefined;
  const viteKey4 = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY_4 : undefined;
  const viteKeyDef = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;

  // Statically reference Node env variables
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
    let responseStream: any = null;
    
    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        if (!key || key.trim() === "") {
            throw new Error("STOP: API Key is completely empty in the code!");
        }
        try {
            const url = "https://generativelanguage.googleapis.com/v1beta/models/" + (selectedModel || "gemini-1.5-flash") + ":streamGenerateContent?alt=sse&key=" + key;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            responseStream = response.body;
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
    
    if (!responseStream && lastError) throw lastError;

    if (responseStream) {
        const decoder = new TextDecoder("utf-8");
        const reader = responseStream.getReader();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6);
                    if (dataStr === "[DONE]") continue;
                    try {
                        const dataObj = JSON.parse(dataStr);
                        const content = dataObj.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "";
                        if (content) {
                            accumulatedText += content;
                            if (onChunk) onChunk(accumulatedText);
                        }
                    } catch (e) {
                        console.error("Error parsing stream chunk", e);
                    }
                }
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
    let text = "";
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
        if (!key || key.trim() === "") {
            throw new Error("STOP: API Key is completely empty in the code!");
        }
        try {
            const url = "https://generativelanguage.googleapis.com/v1beta/models/" + (selectedModel || "gemini-1.5-flash") + ":generateContent?key=" + key;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            responseText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || "";
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