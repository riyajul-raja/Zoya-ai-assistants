import { GoogleGenAI } from "@google/genai";

export interface DebugInfo {
  intent: "LOCAL" | "GEMINI";
  apiUsed: boolean;
  modelName: string;
  isCached: boolean;
  responseTimeMs: number;
  status: "Success" | "Error";
  httpStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}


const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).";

function formatGeminiError(error: any, modelName: string): { formatted: string; status: string; errorCode: string; errorMessage: string } {
  let status = "Unknown";
  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = error.message || String(error);
  
  if (error.status) status = String(error.status);
  if (error.statusText) errorCode = String(error.statusText);
  
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

  const formatted = `❌ ${status} ${errorCode}\n${errorMessage}\n\nModel:\n${modelName}\n\nStatus:\n${status}\n\nError:\n${errorCode}\n\nMessage:\n${errorMessage}\n\nOriginal Error:\n${error.message || String(error)}`;
  return { formatted, status, errorCode, errorMessage };
}


interface CacheEntry {
  response: string;
  timestamp: number;
}
const responseCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function getCacheKey(prompt: string, history: any[], imageFrames: any): string {
  if (imageFrames && imageFrames.length > 0) return ""; // don't cache images for now
  // We can just use the prompt as a simple cache key for exact match
  return prompt.trim().toLowerCase();
}

function is503Error(error: any): boolean {
  if (!error) return false;
  const statusStr = String(error.status || "").toLowerCase();
  const statusTextStr = String(error.statusText || "").toLowerCase();
  const messageStr = String(error.message || error || "").toLowerCase();

  return (
    statusStr.includes("503") ||
    statusStr.includes("unavailable") ||
    statusTextStr.includes("503") ||
    statusTextStr.includes("unavailable") ||
    messageStr.includes("503") ||
    messageStr.includes("unavailable") ||
    messageStr.includes("high demand") ||
    messageStr.includes("overloaded")
  );
}

let requestCount = 0;
export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void
): Promise<{text: string, debugInfo: Partial<DebugInfo>}> {
  const startTime = Date.now();
  try {

    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Cache Hit] Serving cached response for prompt: "${prompt.substring(0, 30)}..."`);
        if (onChunk) {
          // Simulate streaming
          setTimeout(() => onChunk(cached.response), 10);
        }
        return {
          text: cached.response,
          debugInfo: {
            intent: "GEMINI",
            apiUsed: false,
            modelName: "gemini-3.5-flash",
            isCached: true,
            responseTimeMs: Date.now() - startTime,
            status: "Success"
          }
        };
      }
    }

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

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash"];
    let lastError: any = null;
    let lastModelUsed = "gemini-3.5-flash";

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];
      lastModelUsed = currentModel;

      if (mIdx > 0) {
        console.log("Fallback Model Used");
      }

      let retryCount = 0;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: currentModel,
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

          if (cacheKey && accumulatedText) {
            responseCache.set(cacheKey, { response: accumulatedText, timestamp: Date.now() });
          }
          const finalText = accumulatedText || "Ugh, fine. I have nothing to say.";
          return {
            text: finalText,
            debugInfo: {
              intent: "GEMINI",
              apiUsed: true,
              modelName: currentModel,
              isCached: false,
              responseTimeMs: Date.now() - startTime,
              status: "Success"
            }
          };

        } catch (error: any) {
          lastError = error;
          console.error(`Gemini Error on ${currentModel}:`, error);

          if (is503Error(error)) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retry #${retryCount}`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              break;
            }
          } else {
            throw error;
          }
        }
      }
    }

    const busyMessage = "Gemini servers are currently busy.\nPlease try again in a few moments.";
    if (onChunk) {
      onChunk(busyMessage);
    }
    return {
      text: busyMessage,
      debugInfo: {
        intent: "GEMINI",
        apiUsed: true,
        modelName: lastModelUsed,
        isCached: false,
        responseTimeMs: Date.now() - startTime,
        status: "Error",
        httpStatus: "503",
        errorCode: "UNAVAILABLE",
        errorMessage: busyMessage
      }
    };

  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    const parsed = formatGeminiError(error, "gemini-3.5-flash");
    if (onChunk) onChunk(parsed.formatted);
    return {
      text: parsed.formatted,
      debugInfo: { 
        intent: "GEMINI", apiUsed: true, modelName: "gemini-3.5-flash", isCached: false, 
        responseTimeMs: Date.now() - startTime, status: "Error", 
        httpStatus: parsed.status, errorCode: parsed.errorCode, errorMessage: parsed.errorMessage 
      }
    };
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

    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Cache Hit] Serving cached response for prompt: "${prompt.substring(0, 30)}..."`);
        return cached.response;
      }
    }

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

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash"];

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];

      if (mIdx > 0) {
        console.log("Fallback Model Used");
      }

      let retryCount = 0;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            config: {
              systemInstruction,
            },
            contents: finalContents,
          });

          const text = response.text || "Ugh, fine. I have nothing to say.";
          if (cacheKey && text) {
            responseCache.set(cacheKey, { response: text, timestamp: Date.now() });
          }
          return text;

        } catch (error: any) {
          console.error(`Gemini Error on ${currentModel}:`, error);

          if (is503Error(error)) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retry #${retryCount}`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              break;
            }
          } else {
            throw error;
          }
        }
      }
    }

    return "Gemini servers are currently busy.\nPlease try again in a few moments.";

  } catch (error) {
    console.error("Gemini Error:", error);
    return formatGeminiError(error, "gemini-3.5-flash").formatted;
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
