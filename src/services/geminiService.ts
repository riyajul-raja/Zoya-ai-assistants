import { diagnosticsStore, Provider } from "./diagnosticsStore";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";

const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish). Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant.";

function getGeminiKey() { return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || ""; }
function getGroqKey() { return import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || ""; }
function getHfKey() { return import.meta.env.VITE_HUGGINGFACE_API_KEY || import.meta.env.VITE_HUGGING_FACE_API_KEY || import.meta.env.HUGGINGFACE_API_KEY || ""; }

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
  diagnosticsStore.updateProvider(selectedModel as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true });

  try {
    let accumulatedText = "";

    if (selectedModel === "groq") {
      const groqKey = getGroqKey();
      if (!groqKey) throw new Error("Groq API key not configured.");
      
      const groqHistory = history.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter(msg => msg.content) as any;
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...groqHistory,
        { role: "user", content: prompt }
      ];

      const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
      const stream = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.1-8b-instant",
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedText += content;
          if (onChunk) onChunk(accumulatedText);
        }
      }

    } else if (selectedModel === "huggingface") {
      const hfKey = getHfKey();
      if (!hfKey) throw new Error("Hugging Face API key not configured.");
      
      const hfHistory = history.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter(msg => msg.content) as any;
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...hfHistory,
        { role: "user", content: prompt }
      ];

      const hf = new HfInference(hfKey);
      const stream = hf.chatCompletionStream({
        model: "microsoft/Phi-3.5-mini-instruct",
        messages: messages,
        max_tokens: 500
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedText += content;
          if (onChunk) onChunk(accumulatedText);
        }
      }

    } else {
      const geminiKey = getGeminiKey();
      if (!geminiKey) throw new Error("Gemini API key not configured.");

      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
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

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        config: { systemInstruction },
        contents: finalContents as any,
      });

      for await (const chunk of responseStream) {
        const content = chunk.text || "";
        if (content) {
          accumulatedText += content;
          if (onChunk) onChunk(accumulatedText);
        }
      }
    }

    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "success", latencyMs: Date.now() - startTime });
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
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
  diagnosticsStore.updateProvider(selectedModel as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true });
  
  try {
    let text = "";
    let tokenUsage = null;

    if (selectedModel === "groq") {
      const groqKey = getGroqKey();
      if (!groqKey) throw new Error("Groq API key not configured.");
      
      const groqHistory = history.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter(msg => msg.content) as any;
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...groqHistory,
        { role: "user", content: prompt }
      ];

      const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
      const response = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.1-8b-instant",
      });
      
      text = response.choices?.[0]?.message?.content || "";
      const usage = response.usage;
      if (usage) {
        tokenUsage = { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens };
      }
      
    } else if (selectedModel === "huggingface") {
      const hfKey = getHfKey();
      if (!hfKey) throw new Error("Hugging Face API key not configured.");
      
      const hfHistory = history.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter(msg => msg.content) as any;
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...hfHistory,
        { role: "user", content: prompt }
      ];

      const hf = new HfInference(hfKey);
      const response = await hf.chatCompletion({
        model: "microsoft/Phi-3.5-mini-instruct",
        messages: messages,
        max_tokens: 500
      });
      
      text = response.choices?.[0]?.message?.content || "";
      
    } else {
      const geminiKey = getGeminiKey();
      if (!geminiKey) throw new Error("Gemini API key not configured.");

      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { systemInstruction },
        contents: finalContents as any,
      });
      
      text = response.text || "";
    }

    diagnosticsStore.updateProvider(selectedModel as Provider, { 
      status: "success", 
      latencyMs: Date.now() - startTime,
      tokenUsage: tokenUsage 
    });
    
    return text || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
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
