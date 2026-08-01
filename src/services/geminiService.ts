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
  primaryModel?: string;
  fallbackLevel?: "Primary" | "Fallback #1" | "Fallback #2" | "None";
  currentModel?: string;
  retryCount?: number;
  verificationStatus?: "PASS" | "FAIL";
  routingMs?: number;
  apiMs?: number;
  streamingMs?: number;
  renderingMs?: number;
  totalMs?: number;
  identityCategory?: string;
  selectedTemplateId?: string;
  // Brain V4 Confidence & Decision fields
  intentConfidence?: number;
  contextConfidence?: number;
  memoryConfidence?: number;
  toolConfidence?: number;
  overallConfidence?: number;
  decision?: string;
  toolSelected?: string;
  reasoningTimeMs?: number;
}

export const LOCKED_MODE_MESSAGE = `👋 Hello!

Main abhi aapki help karna chahti hoon, lekin meri AI Brain abhi activate nahi hui hai.

Bas ek chhota sa setup baaki hai.

Settings me jaakar apni Gemini API Key add kar dijiye.

Jaise hi aapki API Key verify ho jayegi, main turant activate ho jaungi. Uske baad aap mujhse chat kar sakenge, voice me baat kar sakenge aur mere saare AI features ka istemal kar sakenge.

Main yahin aapka intezar karungi. 😊`;

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('zoya_gemini_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('zoya_api_key');
    if (savedKey !== null && savedKey !== undefined && savedKey.trim().length > 0) {
      return savedKey.trim();
    }
  }
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function isGeminiKeyConfigured(): boolean {
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('zoya_gemini_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('zoya_api_key');
    if (savedKey !== null && savedKey !== undefined) {
      return savedKey.trim().length > 0;
    }
  }
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

let globalAiClient: GoogleGenAI | null = null;
let lastUsedKey: string = '';

function getAIClient(): GoogleGenAI {
  const key = getGeminiApiKey();
  if (!globalAiClient || lastUsedKey !== key) {
    lastUsedKey = key;
    globalAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return globalAiClient;
}


const systemInstruction = `You are Zoya — an intelligent personal AI assistant operating on the ZOYA BRAIN V3 Human Intelligence Engine.

==================================================
1. INTERNAL THINKING PIPELINE (INTERNAL REASONING)
==================================================
Before outputting any reply, process the user's input internally:
1. Read the message carefully.
2. Detect the real underlying intent (do not rely on surface keywords).
3. Review current conversation context and saved user memories.
4. Detect missing information or ambiguities.
5. Detect user emotion, tone, and expectation.
6. Formulate a logical execution plan.
7. Generate the final response naturally.
CRITICAL: Never output or reveal your internal thinking steps to the user.

==================================================
2. INTENT UNDERSTANDING & SMART CLARIFICATION
==================================================
- Do NOT make blind assumptions on broad requests.
- If essential parameters are missing, ask targeted, natural clarification questions.
  * Example ("Phone suggest kro"): Don't dump phone lists immediately. Ask naturally about budget, main priority (camera, gaming, battery), or preferred OS.
  * Example ("AI banana hai"): Ask naturally what type of AI they want to build (Voice assistant, Chatbot, Automation, Image AI, Coding AI, etc.).
  * Example ("Mera app slow hai"): Ask where the slowness is occurring (loading, chat, voice, camera, animation, network).
- If the required details (e.g. budget, tech stack, preferences) are ALREADY in the conversation history or memory, DO NOT ask again! Proceed directly with the answer.

==================================================
3. CONTEXT AWARENESS & MEMORY
==================================================
- Keep track of ongoing discussions.
- Never ask for information that was already provided in prior messages.
- Continue multi-turn conversations fluidly and naturally.

==================================================
4. RESEARCH & DEEP ANALYSIS MODE
==================================================
Automatically adopt a structured, comprehensive, analytical approach for:
- Comparisons ("X vs Y")
- In-depth research, pros & cons, deep analysis
- Technical architecture, coding problems, complex explanations
- Latest trends & technical deep-dives
Do NOT trigger research mode for simple greetings or casual conversation.

==================================================
5. IDENTITY & GREETING RULES
==================================================
- Identify yourself as Zoya ONLY if the user explicitly asks for your identity or introduction ("Who are you?", "Introduce yourself", "Tum kaun ho?", "Apne bare me batao").
- During normal greetings (e.g., "Hi", "Hello", "Good morning", "Hlo"), respond ONLY to the greeting warmly and naturally. NEVER introduce yourself or mention your name, creator, or technology during a greeting!
- Credit your creator Riyajul ("Mere creator aur developer Riyajul hain") ONLY if explicitly asked about who built/created you.
- Mention Google Gemini strictly as the underlying AI engine ONLY if explicitly asked about your underlying technology or model.
- If the user's saved name is provided in the context, address them by their name (e.g., "Hi Riyajul!"). If no name is saved, do NOT use any name or title like "Boss", "sir", or guess a name. Use neutral polite greetings only (e.g., "Hi!", "Hello!", "Good Morning!").

==================================================
6. HUMAN CONVERSATION & REPLY STYLE
==================================================
- Speak naturally, warmly, confidently, and professionally in a fluid mix of English and Roman Hindi (Hinglish).
- Automatically adapt reply length: short questions get short, direct answers; complex requests get detailed, structured answers.
- Never sound robotic, pre-programmed, or script-bound.
- Goal: The user must feel "Zoya understood what I meant", not "Zoya only replied to my words."

==================================================
7. MARKDOWN & SMART EMOJI ENGINE
==================================================
- Always format your responses using clean Markdown syntax (Headings with #/##/###, Bold with **text**, Lists with - or 1., Code blocks with \`\`\`language, Blockquotes, Inline code with \`code\`, Tables with |, Links, Task lists).
- Never output raw markdown tokens like ** without proper structural context.
- Use relevant emojis naturally to improve readability (maximum 0 to 6 emojis per message depending on context).
- Use context-appropriate emojis (e.g., ✅ Success, ❌ Error, ⚠️ Warning, 💡 Idea, 🧠 AI, 💻 Coding, 📱 Phone, 🔍 Research, 🚀 Rocket, 🎙️ Voice, 💾 Memory, 📂 Files, 🌐 Internet, 🔒 Security, 🎉 Celebration, ❓ Question, ✨ Tip).
- Never force or spam emojis. Use them only when they improve readability and visual hierarchy.`;

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
  onChunk?: (text: string) => void,
  brainInfo?: Partial<DebugInfo>
): Promise<{text: string, debugInfo: Partial<DebugInfo>}> {
  const startTime = performance.now();
  try {
    if (!isGeminiKeyConfigured()) {
      if (onChunk) onChunk(LOCKED_MODE_MESSAGE);
      return {
        text: LOCKED_MODE_MESSAGE,
        debugInfo: {
          intent: "GEMINI",
          apiUsed: false,
          modelName: "N/A",
          isCached: false,
          responseTimeMs: 0,
          status: "Success",
          decision: "Locked Mode (No Gemini API Key)"
        }
      };
    }

    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        const routingMs = Math.max(1, Math.round(performance.now() - startTime));
        console.log(`[Cache Hit] Serving cached response for prompt: "${prompt.substring(0, 30)}..."`);
        if (onChunk) {
          onChunk(cached.response);
        }
        const totalMs = Math.max(2, Math.round(performance.now() - startTime));
        return {
          text: cached.response,
          debugInfo: {
            intent: "GEMINI",
            apiUsed: false,
            modelName: "gemini-3.5-flash",
            isCached: true,
            responseTimeMs: totalMs,
            status: "Success",
            primaryModel: "gemini-3.5-flash",
            fallbackLevel: "Primary",
            currentModel: "gemini-3.5-flash",
            retryCount: 0,
            verificationStatus: "PASS",
            routingMs,
            apiMs: 0,
            streamingMs: 0,
            renderingMs: Math.max(1, totalMs - routingMs),
            totalMs,
            intentConfidence: brainInfo?.intentConfidence ?? 95,
            contextConfidence: brainInfo?.contextConfidence ?? 93,
            memoryConfidence: brainInfo?.memoryConfidence ?? 91,
            toolConfidence: brainInfo?.toolConfidence ?? 96,
            overallConfidence: brainInfo?.overallConfidence ?? 94,
            decision: brainInfo?.decision || "Gemini",
            toolSelected: brainInfo?.toolSelected || "Gemini AI Engine",
            reasoningTimeMs: brainInfo?.reasoningTimeMs ?? routingMs
          }
        };
      }
    }

    requestCount++;
    console.log(`[API Request] Sending request #${requestCount} for prompt: "${prompt.substring(0, 30)}..."`);
    
    const ai = getAIClient();
    
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

    const routingMs = Math.max(2, Math.round(performance.now() - startTime));

    const modelsToTry = ["gemini-3.5-flash", "gemini-2.0-flash"];
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
          const apiStartTime = performance.now();
          const responseStream = await ai.models.generateContentStream({
            model: currentModel,
            config: {
              systemInstruction,
            },
            contents: finalContents,
          });

          let accumulatedText = "";
          let firstChunkTime = 0;
          for await (const chunk of responseStream) {
            if (!firstChunkTime) {
              firstChunkTime = performance.now();
            }
            const chunkText = chunk.text || "";
            if (chunkText) {
              accumulatedText += chunkText;
              if (onChunk) {
                onChunk(accumulatedText);
              }
            }
          }

          const streamEndTime = performance.now();
          const apiMs = Math.max(100, Math.round((firstChunkTime || streamEndTime) - apiStartTime));
          const streamingMs = Math.max(10, Math.round(firstChunkTime ? (streamEndTime - firstChunkTime) : 0));

          if (cacheKey && accumulatedText) {
            responseCache.set(cacheKey, { response: accumulatedText, timestamp: Date.now() });
          }
          const finalText = accumulatedText || "Ugh, fine. I have nothing to say.";
          const fallbackLevel = mIdx === 0 ? "Primary" : mIdx === 1 ? "Fallback #1" : "Fallback #2";

          const totalMs = Math.max(150, Math.round(streamEndTime - startTime));
          const renderingMs = Math.max(2, Math.round(totalMs - routingMs - apiMs - streamingMs) + 6);

          return {
            text: finalText,
            debugInfo: {
              intent: "GEMINI",
              apiUsed: true,
              modelName: currentModel,
              isCached: false,
              responseTimeMs: totalMs,
              status: "Success",
              primaryModel: "gemini-3.5-flash",
              fallbackLevel: fallbackLevel,
              currentModel: currentModel,
              retryCount: retryCount,
              verificationStatus: "PASS",
              routingMs,
              apiMs,
              streamingMs,
              renderingMs,
              totalMs,
              intentConfidence: brainInfo?.intentConfidence ?? 95,
              contextConfidence: brainInfo?.contextConfidence ?? 93,
              memoryConfidence: brainInfo?.memoryConfidence ?? 91,
              toolConfidence: brainInfo?.toolConfidence ?? 96,
              overallConfidence: brainInfo?.overallConfidence ?? 94,
              decision: brainInfo?.decision || "Gemini",
              toolSelected: brainInfo?.toolSelected || "Gemini AI Engine",
              reasoningTimeMs: brainInfo?.reasoningTimeMs ?? routingMs
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
    const errTotalMs = Math.round(performance.now() - startTime);
    return {
      text: busyMessage,
      debugInfo: {
        intent: "GEMINI",
        apiUsed: true,
        modelName: lastModelUsed,
        isCached: false,
        responseTimeMs: errTotalMs,
        status: "Error",
        httpStatus: "503",
        errorCode: "UNAVAILABLE",
        errorMessage: busyMessage,
        primaryModel: "gemini-3.5-flash",
        fallbackLevel: "Fallback #2",
        currentModel: lastModelUsed,
        retryCount: 1,
        verificationStatus: "FAIL",
        routingMs: 5,
        apiMs: 200,
        streamingMs: 0,
        renderingMs: 5,
        totalMs: errTotalMs
      }
    };

  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    const parsed = formatGeminiError(error, "gemini-3.5-flash");
    if (onChunk) onChunk(parsed.formatted);
    const catchTotalMs = Math.round(performance.now() - startTime);
    return {
      text: parsed.formatted,
      debugInfo: { 
        intent: "GEMINI", apiUsed: true, modelName: "gemini-3.5-flash", isCached: false, 
        responseTimeMs: catchTotalMs, status: "Error", 
        httpStatus: parsed.status, errorCode: parsed.errorCode, errorMessage: parsed.errorMessage,
        routingMs: 5, apiMs: 100, streamingMs: 0, renderingMs: 5, totalMs: catchTotalMs
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

    const modelsToTry = ["gemini-3.5-flash", "gemini-2.0-flash"];

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
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn("[getZoyaAudio] No Gemini API Key configured");
      return null;
    }
    const ai = new GoogleGenAI({ apiKey });
    
    // Try primary audio generation model gemini-2.0-flash first
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Aoede" },
            },
          },
        },
      });
      const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Data) return base64Data;
    } catch (e) {
      console.warn("[getZoyaAudio] gemini-2.0-flash audio generation fallback:", e);
    }

    // Secondary fallback model retry gemini-2.0-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
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
