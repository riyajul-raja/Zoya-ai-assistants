import { getGroqKey, getHfKey, getGeminiKey } from "./envHelper";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";

const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish). Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant.";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, history, imageFrames, selectedModel } = req.body;

  const envStatus = {
    GROQ_API_KEY: getGroqKey() ? "FOUND" : "MISSING",
    HUGGINGFACE_API_KEY: getHfKey() ? "FOUND" : "MISSING",
    GEMINI_API_KEY: getGeminiKey() ? "FOUND" : "MISSING",
  };
  console.log(`Environment variables status:`, envStatus);

  try {
    if (selectedModel === "groq") {
      const groqKey = getGroqKey();
      if (!groqKey) {
          return res.status(500).json({ error: `Groq API key not configured. Status: ${JSON.stringify(envStatus)}` });
      }
      
      const groqHistory = (history || []).map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter((msg: any) => msg.content);
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...groqHistory,
        { role: "user", content: prompt }
      ];

      console.log(`[PROVIDER ROUTING] Provider: Groq`);
      
      const groq = new Groq({ apiKey: groqKey });
      const response = await groq.chat.completions.create({
        messages: messages as any,
        model: "llama-3.1-8b-instant",
      });
      
      const usage = response.usage;
      const tokenUsage = usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : null;
      
      return res.status(200).json({ 
          text: response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.",
          tokenUsage 
      });

    } else if (selectedModel === "huggingface") {
      const hfKey = getHfKey();
      if (!hfKey) {
          return res.status(500).json({ error: `Hugging Face API key not configured. Status: ${JSON.stringify(envStatus)}` });
      }
      
      const hfHistory = (history || []).map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text || ""
      })).filter((msg: any) => msg.content);
      
      const messages = [
        { role: "system", content: systemInstruction },
        ...hfHistory,
        { role: "user", content: prompt }
      ];

      console.log(`[PROVIDER ROUTING] Provider: Hugging Face`);
      
      const hf = new HfInference(hfKey);
      const response = await hf.chatCompletion({
        model: "microsoft/Phi-3.5-mini-instruct",
        messages: messages as any,
        max_tokens: 500
      });
      
      return res.status(200).json({ 
          text: response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.",
          tokenUsage: null
      });

    } else {
      const geminiKey = getGeminiKey();
      if (!geminiKey) {
          return res.status(500).json({ error: `Gemini API key not configured. Status: ${JSON.stringify(envStatus)}` });
      }

      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      
      for (const msg of (history || []).slice(-6)) {
        if (!msg || !msg.text || msg.isError) continue;
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

      console.log(`[PROVIDER ROUTING] Provider: Gemini`);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { systemInstruction },
        contents: finalContents as any,
      });
      
      return res.status(200).json({ 
          text: response.text || "Ugh, fine. I have nothing to say.",
          tokenUsage: null
      });
    }
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
