import { GoogleGenAI } from "@google/genai";

const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).";

function formatGeminiError(error: any, modelName: string): string {
  let status = "Unknown";
  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = error.message || String(error);
  
  if (error.status) status = error.status;
  if (error.statusText) errorCode = error.statusText;
  
  const errStr = errorMessage.toLowerCase();
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("resource_exhausted")) {
    status = "429";
    errorCode = "RESOURCE_EXHAUSTED";
    errorMessage = "Quota exceeded.";
  } else if (errStr.includes("403") || errStr.includes("permission_denied") || errStr.includes("api_key_invalid")) {
    status = "403";
    errorCode = "PERMISSION_DENIED";
    errorMessage = "Invalid or restricted API key.";
  } else if (errStr.includes("401") || errStr.includes("unauthenticated")) {
    status = "401";
    errorCode = "UNAUTHENTICATED";
    errorMessage = "Authentication failed.";
  } else if (errStr.includes("400") || errStr.includes("invalid_argument")) {
    status = "400";
    errorCode = "INVALID_ARGUMENT";
    errorMessage = "Bad request.";
  } else if (errStr.includes("503") || errStr.includes("unavailable")) {
    status = "503";
    errorCode = "UNAVAILABLE";
    errorMessage = "Gemini service unavailable.";
  } else if (errStr.includes("network") || errStr.includes("fetch failed")) {
    status = "Network Error";
    errorCode = "NETWORK_ERROR";
    errorMessage = "Please check your internet connection.";
  } else if (errStr.includes("timeout")) {
    status = "Timeout";
    errorCode = "TIMEOUT";
    errorMessage = "Request timed out.";
  } else if (errStr.includes("block") || errStr.includes("safety")) {
    status = "Blocked";
    errorCode = "SAFETY_BLOCK";
    errorMessage = "Content blocked by safety settings.";
  }

  console.error("====== GEMINI API ERROR ======");
  console.error("Timestamp:", new Date().toISOString());
  console.error("Model:", modelName);
  console.error("Status:", status);
  console.error("Error Code:", errorCode);
  console.error("Message:", errorMessage);
  console.error("Full response body:", error.response || error.body || "N/A");
  console.error("Request URL:", error.url || error.config?.url || "N/A");
  console.error("Full stack trace:", error.stack || error);
  console.error("===============================");

  return `❌ ${status} ${errorCode}\n${errorMessage}\n\nModel:\n${modelName}\n\nStatus:\n${status}\n\nError:\n${errorCode}\n\nMessage:\n${errorMessage}\n\nOriginal Error:\n${error.message || String(error)}`;
}

let requestCount = 0;
export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void
): Promise<string> {
  try {
    requestCount++;
    console.log(`[API Request] Sending request #${requestCount} for prompt: "${prompt.substring(0, 30)}..."`);
    
    const key = process.env.GEMINI_API_KEY || '';
    console.log(`[API Key Rotation] Selected key: ${key ? key.substring(0, 6) + '***' : 'NONE'}. Rotation is NOT implemented (single key used).`);
    const ai = new GoogleGenAI({ apiKey: key });
    
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
    const fallback = formatGeminiError(error, "gemini-3.5-flash");
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
    return formatGeminiError(error, "gemini-3.5-flash");
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
