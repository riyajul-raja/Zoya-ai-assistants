const fs = require('fs');

const content = `import fs from "fs";
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const keys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5
].filter(Boolean);
const apiKey = keys[Math.floor(Math.random() * keys.length)] || keys[0];

const ai = new GoogleGenAI({ apiKey });
const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).";

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, history = [], imageFrames = [] } = req.body;
    let formattedHistory = [];
    let currentRole = "";
    
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.text || msg.isError) continue;
      const role = msg.sender === "user" ? "user" : "model";
      let parts = [{ text: msg.text }];
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
    let currentMessageParts = [];
    if (normalizedImageFrames.length > 0) {
      currentMessageParts = normalizedImageFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.includes(',') ? frame.split(',')[1] : frame,
        }
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
      model: "gemini-3.5-flash",
      config: { systemInstruction },
      contents: finalContents,
    });
    
    res.json({ text: response.text || "Ugh, fine. I have nothing to say." });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: { message: error.message, status: error.status, code: error.code } });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  try {
    const { prompt, history = [], imageFrames = [] } = req.body;
    let formattedHistory = [];
    let currentRole = "";
    
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.text || msg.isError) continue;
      const role = msg.sender === "user" ? "user" : "model";
      let parts = [{ text: msg.text }];
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
    let currentMessageParts = [];
    if (normalizedImageFrames.length > 0) {
      currentMessageParts = normalizedImageFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.includes(',') ? frame.split(',')[1] : frame,
        }
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
      model: "gemini-3.5-flash",
      config: { systemInstruction },
      contents: finalContents,
    });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        res.write(\`data: \${JSON.stringify({ text: chunkText })}\\n\\n\`);
      }
    }
    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (error) {
    console.error("Gemini Stream Error:", error);
    res.write(\`data: \${JSON.stringify({ error: { message: error.message, status: error.status, code: error.code } })}\\n\\n\`);
    res.end();
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    res.json({ audioData });
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

app.get('/api/key', (req, res) => {
  res.json({ apiKey });
});

async function startServer() {
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
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', content);
