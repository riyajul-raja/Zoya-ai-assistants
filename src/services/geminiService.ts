import { GoogleGenAI } from "@google/genai";

const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).";

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini"
): Promise<string> {
  if (selectedModel === "groq") {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      const errorMsg = "Groq API key is missing or invalid.";
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }
    
    // Format history for Groq
    const groqHistory = history.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || ""
    })).filter(msg => msg.content);
    
    const messages = [
      { role: "system", content: systemInstruction },
      ...groqHistory,
      { role: "user", content: prompt }
    ];

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.trim().startsWith("data: ") && line.trim() !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.trim().slice(6));
                const content = data.choices[0]?.delta?.content || "";
                accumulatedText += content;
                if (onChunk) onChunk(accumulatedText);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Groq Stream Error:", error);
      throw error;
    }
  }

  if (selectedModel === "huggingface") {
    throw new Error("Hugging Face integration is not configured yet.");
  }

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
  if (selectedModel === "groq") {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return "Groq API key is missing or invalid.";
    }
    
    const groqHistory = history.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || ""
    })).filter(msg => msg.content);
    
    const messages = [
      { role: "system", content: systemInstruction },
      ...groqHistory,
      { role: "user", content: prompt }
    ];

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error) {
      console.error("Groq Error:", error);
      return "Groq API Limit Reached or Error. Zoya is resting.";
    }
  }

  if (selectedModel === "huggingface") {
    return "Hugging Face integration is not configured yet.";
  }

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
