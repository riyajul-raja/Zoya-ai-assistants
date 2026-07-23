import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish). Never identify as Meta AI, BERT, Hugging Face, Gemini, Llama, Google, or any other provider or model. If asked who you are, only say you are Zoya, a custom AI assistant.";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Config route
  app.get("/api/config", (req, res) => {
    res.json({
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY
    });
  });

  // API Chat Route
  app.post("/api/chat", async (req, res) => {
    const { prompt, history, imageFrames, selectedModel } = req.body;

    try {
      if (selectedModel === "groq") {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            console.error("Groq key missing");
            return res.status(500).json({ error: "Groq API key not configured." });
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

        console.log(`[PROVIDER ROUTING] Provider: Groq, Model: llama-3.1-8b-instant, Endpoint: https://api.groq.com/openai/v1`);
        
        const groq = new Groq({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
        const response = await groq.chat.completions.create({
          messages: messages as any,
          model: "llama-3.1-8b-instant",
        });
        
        const usage = response.usage;
        const tokenUsage = usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens } : null;
        
        return res.json({ 
            text: response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.",
            tokenUsage 
        });

      } else if (selectedModel === "huggingface") {
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) {
            console.error("HF key missing");
            return res.status(500).json({ error: "Hugging Face API key not configured." });
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

        console.log(`[PROVIDER ROUTING] Provider: Hugging Face, Model: HuggingFaceH4/zephyr-7b-beta, Endpoint: Official HF Inference API`);
        
        const hf = new HfInference(hfKey);
        const response = await hf.chatCompletion({
          model: "HuggingFaceH4/zephyr-7b-beta",
          messages: messages as any,
          max_tokens: 500
        });
        
        return res.json({ 
            text: response.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.",
            tokenUsage: null
        });

      } else {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.error("Gemini key missing");
            return res.status(500).json({ error: "Gemini API key not configured." });
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

        console.log(`[PROVIDER ROUTING] Provider: Gemini, Model: gemini-2.5-flash, Endpoint: Official Google Gen AI API`);
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: { systemInstruction },
          contents: finalContents as any,
        });
        
        return res.json({ 
            text: response.text || "Ugh, fine. I have nothing to say.",
            tokenUsage: null
        });
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Chat Stream Route
  app.post("/api/chat/stream", async (req, res) => {
    const { prompt, history, imageFrames, selectedModel } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      if (selectedModel === "groq") {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            res.write(`data: ${JSON.stringify({ error: "Groq API key not configured." })}\n\n`);
            return res.end();
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

        console.log(`[PROVIDER ROUTING] Provider: Groq, Model: llama-3.1-8b-instant, Endpoint: https://api.groq.com/openai/v1`);
        
        const groq = new Groq({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
        const stream = await groq.chat.completions.create({
          messages: messages as any,
          model: "llama-3.1-8b-instant",
          stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }
        res.end();

      } else if (selectedModel === "huggingface") {
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) {
            res.write(`data: ${JSON.stringify({ error: "Hugging Face API key not configured." })}\n\n`);
            return res.end();
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

        console.log(`[PROVIDER ROUTING] Provider: Hugging Face, Model: HuggingFaceH4/zephyr-7b-beta, Endpoint: Official HF Inference API`);
        
        const hf = new HfInference(hfKey);
        const stream = hf.chatCompletionStream({
          model: "HuggingFaceH4/zephyr-7b-beta",
          messages: messages as any,
          max_tokens: 500
        });
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }
        res.end();

      } else {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            res.write(`data: ${JSON.stringify({ error: "Gemini API key not configured." })}\n\n`);
            return res.end();
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

        console.log(`[PROVIDER ROUTING] Provider: Gemini, Model: gemini-2.5-flash, Endpoint: Official Google Gen AI API`);
        
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          config: { systemInstruction },
          contents: finalContents as any,
        });

        for await (const chunk of responseStream) {
            const content = chunk.text || "";
            if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
        }
        res.end();
      }
    } catch (error: any) {
      console.error("Chat Stream Error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
      res.end();
    }
  });

  // API TTS Route
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
          return res.status(500).json({ error: "Gemini API key not configured." });
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });
      return res.json({ audio: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null });
    } catch (error: any) {
      console.error("TTS Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
