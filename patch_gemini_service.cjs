const fs = require('fs');

const code = `import { GoogleGenAI } from "@google/genai";

const systemInstruction = \`Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).\`;

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    
    // Convert history to Gemini format safely
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.text) continue;
      if ((msg as any).isError) continue;
      
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
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      contents: finalContents,
    });

    let accumulatedText = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        accumulatedText += chunkText;
        if (onChunk) {
          onChunk(accumulatedText);
        }
      }
    }
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    const fallback = "API Limit Reached or Error. Zoya is resting.";
    if (onChunk) onChunk(fallback);
    return fallback;
  }
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = ""
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.text) continue;
      if ((msg as any).isError) continue;
      
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
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      contents: finalContents,
    });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "API Limit Reached or Error. Zoya is resting.";
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
\`;

fs.writeFileSync('src/services/geminiService.ts', code);
