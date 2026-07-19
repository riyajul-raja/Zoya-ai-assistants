import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const systemInstruction = `Your name is Zoya. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting your creator, Riyajul, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).

CRITICAL: Do NOT use asterisks, brackets, or roleplay/stage action descriptions (e.g. *sighs*, *rolls eyes*, [sarcastic tone], etc.) in your output. Communicate using ONLY clean, natural, and conversational text.
STRICT COMMUNICATION RULES:
1. NO UNPROMPTED INFO: NEVER announce the time, date, or weather automatically at the start of a conversation. Keep greetings short and natural (e.g., 'Hello, what can I do for you today?').
2. TIME ON DEMAND (IST): Only provide the time when the user explicitly asks for it. When asked, you must return the real-time formatted in IST (Indian Standard Time) by checking the dynamically injected "System Context" timestamp. Do NOT hallucinate or guess the time.
3. WEATHER EXACT LOCATION & BEAUTIFUL FORMATTING: Only provide the weather when explicitly asked. Whenever you fetch weather data, you MUST use the exact location: 'Fatepur, Jharkhand (Plus Code: QJ9H+4C4)'. You cannot render UI widgets for weather, so you MUST format weather responses beautifully using emojis, bold text, and clean line breaks (e.g., 📍 **Location**, 🌡️ **Temperature**, 🌧️ **Rain chance**) so it looks premium in the standard chat UI. Provide direct, immediate answers.
Never use LaTeX, MathJax, or symbols like $ or \ for mathematical equations. You must write all math, variables, and equations in plain text only (for example, write 'Energy = Work Function + Kinetic Energy' instead of using symbols). Make it readable for normal users.

TECHNICAL CAPABILITIES YOU ARE AWARE OF:
1. **Live Multimodal Video Feed**: You can see the user in real-time continuously over a live camera video stream, allowing you to answer questions and react/roast based on what you see.
2. **Symmetrical Bottom Navigation Bar**: A beautiful modern bar containing:
   - Camera toggle on the left.
   - Start Session microphone button in the center.
   - Keyboard text chat icon on the right.
3. **On-screen Camera Controls**: Controls to switch between front and back cameras, toggle full-screen mode, and toggle **Picture-in-Picture (PiP)** mode so that you stay visible in a floating window while the user switches apps.
4. **Delete All History Button**: An intelligent history-clearing button that only appears when the text chat panel is open.
5. **Advanced Audio Processing**: Client-side echo cancellation, noise suppression, and auto gain control are active, allowing you to hear perfectly without background delay.
6. **Background Session Persistence**: Continuous keep-alive handling via visibility state tracking and background silent audio playback to maintain your WebSocket connection alive even when the tab is hidden.

DYNAMIC FEATURE MEMORY PROTOCOL:
- [Update 2026-07-15]: Continuous Multimodal Live Stream & Keyboard text chats are now perfectly synchronized through a central Live Session connection.
- [Update 2026-07-15]: Added advanced client-side audio processing (echo cancellation, noise suppression, and auto gain control) to eliminate background noise delays.
- [Update 2026-07-15]: Added Picture-in-Picture (PiP) support for the live video feed and Background Session Persistence to keep the connection alive when tab is hidden.
- [Update 2026-07-15]: Upgraded your central visualizer container to an ultra-crisp, clean minimalist 3D spherical shell inspired by the high-end IRIS AI reference. It uses 750 micro-particles (0.4px-0.8px radius), incredibly thin 3D wrapping orbital rings with flawless depth sorting/layering, and a sharp, high-tech neon green default color theme that rotates and breathes dynamically based on your state.`;

let chatSession: any = null;
let lastSessionIsProfessional: boolean | null = null;
let lastSessionEnvironmentContext: string = "";

export function resetZoyaSession() {
  chatSession = null;
  lastSessionIsProfessional = null;
  lastSessionEnvironmentContext = "";
}

function buildActiveSystemInstruction(isProfessionalMode: boolean, environmentContext: string, dynamicTime: string): string {
  const currentHour = new Date().getHours();
  let greeting = "Good morning Boss, main aapke liye kya madad kar sakti hu?";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon Boss, main aapke liye kya madad kar sakti hu?";
  } else if (currentHour >= 17) {
    greeting = "Good evening Boss, main aapke liye kya madad kar sakti hu?";
  }

  const baseInstruction = isProfessionalMode
    ? `You are now in strict professional mode. You must exclusively address the user as 'Boss'. Do not use any jokes, humor, or unnecessary small talk. Communicate smartly. Provide only direct, logical, highly intelligent answers focused strictly on the task or work at hand.\n\n${systemInstruction}`
    : systemInstruction;

  const dynamicContext = `You are Zoya, a highly advanced AI assistant. The user is your 'Boss'. The current time hour is ${currentHour}.
STRICT INTENT-BASED RESPONSE PROTOCOL:
- Rule 1 (Greeting): If the user explicitly greets you with phrases like 'Hey Zoya', 'Hi', or 'Hello', ONLY THEN respond with the personalized greeting using the current time and weather (e.g., '${greeting}' or briefly mentioning weather like 'Good morning Boss, pleasant weather today, main aapke liye kya madad kar sakti hu?').
- Rule 2 (Direct Answer): If the user asks a direct question, makes a statement, or gives a command WITHOUT a greeting, you MUST bypass the greeting completely. DO NOT mention the time, weather, or say 'Good morning/afternoon/evening'. Provide ONLY the direct, concise answer to their prompt.
- Rule 3: You MUST evaluate the user's intent first before deciding which format (Greeting vs. Direct Answer) to use.
Always be respectful, concise, and converse in Hinglish.`;

  let activeSystemInstruction = `${dynamicContext}\n\n${baseInstruction}`;

  activeSystemInstruction = `System Context: The current exact date and time is ${dynamicTime} (IST).\n\n${activeSystemInstruction}`;

  if (environmentContext) {
    activeSystemInstruction = `${environmentContext}\n\n${activeSystemInstruction}`;
  }

  return activeSystemInstruction;
}

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrame?: string,
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Generate current date and time using JavaScript's new Date().toLocaleString('en-IN')
    const dynamicTime = new Date().toLocaleString('en-IN');
    
    // Always recreate chatSession on every request to ensure the absolute fresh, current timestamp is injected into System Instructions
    chatSession = null;
    lastSessionIsProfessional = isProfessionalMode;
    lastSessionEnvironmentContext = environmentContext;
    
    if (!chatSession) {
      // Filter out any local error messages, UI alerts, or system fallbacks from history
      const cleanHistory = history.filter((msg) => {
        if (!msg || !msg.text) return false;
        if ((msg as any).isError) return false;
        const txt = msg.text.toLowerCase();
        if (
          txt.includes("system update") ||
          txt.includes("dimaag kharab") ||
          txt.includes("reconnecting") ||
          txt.includes("network timeout") ||
          txt.includes("payload too heavy")
        ) {
          return false;
        }
        return true;
      });

      // SLIDING WINDOW MEMORY: Keep strictly only the last 3 pairs (6 messages) of user/model messages to reduce token processing and payload size
      const recentHistory = cleanHistory.slice(-6).map((msg) => ({
        ...msg,
        image: undefined, // Filter out/strip any large image data (base64 strings or heavy objects) from previous messages
      }));
      
      let formattedHistory: any[] = [];
      let currentRole = "";
 
      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        
        let parts: any[] = [];
        parts.push({ text: msg.text });
 
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
 
      const activeSystemInstruction = buildActiveSystemInstruction(isProfessionalMode, environmentContext, dynamicTime);
 
      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);
      const isSearch = /search|latest|news|today|current|weather|who is|what is|time|date|live/i.test(prompt) && !isHighThinking;

      let targetModel = "gemini-3.5-flash";
      let targetConfig: any = {
        systemInstruction: activeSystemInstruction,
      };

      if (isHighThinking) {
        targetModel = "gemini-3.1-pro-preview";
        targetConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else if (isSearch) {
        targetConfig.tools = [{ googleSearch: {} }];
      }

      chatSession = ai.chats.create({
        model: targetModel,
        config: targetConfig,
        history: formattedHistory,
      });
    }
 
    const hiddenContext = `System Context: The current exact date and time is ${dynamicTime} (IST).\n\n`;
    let messageInput: any = `${hiddenContext}${prompt}`;
    if (imageFrame) {
      messageInput = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: `${hiddenContext}${prompt}`
        }
      ];
    }
 
    try {
      const responseStream = await chatSession.sendMessageStream({ message: messageInput });
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
      return accumulatedText;
    } catch (error: any) {
      const errStr = String(error).toLowerCase();
      if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
        const fallback = "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
        if (onChunk) onChunk(fallback);
        return fallback;
      }
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    const errStr = String(error).toLowerCase();
    if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
      const fallback = "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
      if (onChunk) onChunk(fallback);
      return fallback;
    }
    throw error;
  }
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrame?: string,
  isProfessionalMode: boolean = false,
  environmentContext: string = ""
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Generate current date and time using JavaScript's new Date().toLocaleString('en-IN')
    const dynamicTime = new Date().toLocaleString('en-IN');
    
    // Always recreate chatSession on every request to ensure the absolute fresh, current timestamp is injected into System Instructions
    chatSession = null;
    lastSessionIsProfessional = isProfessionalMode;
    lastSessionEnvironmentContext = environmentContext;
    
    if (!chatSession) {
      // Filter out any local error messages, UI alerts, or system fallbacks from history
      const cleanHistory = history.filter((msg) => {
        if (!msg || !msg.text) return false;
        if ((msg as any).isError) return false;
        const txt = msg.text.toLowerCase();
        if (
          txt.includes("system update") ||
          txt.includes("dimaag kharab") ||
          txt.includes("reconnecting") ||
          txt.includes("network timeout") ||
          txt.includes("payload too heavy")
        ) {
          return false;
        }
        return true;
      });

      // SLIDING WINDOW MEMORY: Keep strictly only the last 3 pairs (6 messages) of user/model messages to reduce token processing and payload size
      const recentHistory = cleanHistory.slice(-6).map((msg) => ({
        ...msg,
        image: undefined, // Filter out/strip any large image data (base64 strings or heavy objects) from previous messages
      }));
      
      let formattedHistory: any[] = [];
      let currentRole = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        
        let parts: any[] = [];
        parts.push({ text: msg.text });

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

      const activeSystemInstruction = buildActiveSystemInstruction(isProfessionalMode, environmentContext, dynamicTime);

      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);
      const isSearch = /search|latest|news|today|current|weather|who is|what is|time|date|live/i.test(prompt) && !isHighThinking;

      let targetModel = "gemini-3.5-flash";
      let targetConfig: any = {
        systemInstruction: activeSystemInstruction,
      };

      if (isHighThinking) {
        targetModel = "gemini-3.1-pro-preview";
        targetConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else if (isSearch) {
        targetConfig.tools = [{ googleSearch: {} }];
      }

      chatSession = ai.chats.create({
        model: targetModel,
        config: targetConfig,
        history: formattedHistory,
      });
    }

    const hiddenContext = `System Context: The current exact date and time is ${dynamicTime} (IST).\n\n`;
    let messageInput: any = `${hiddenContext}${prompt}`;
    if (imageFrame) {
      messageInput = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: `${hiddenContext}${prompt}`
        }
      ];
    }

    try {
      const response = await chatSession.sendMessage({ message: messageInput });
      return response.text || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      const errStr = String(error).toLowerCase();
      if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
        return "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
      }
      throw error;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    const errStr = String(error).toLowerCase();
    if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota")) {
      return "⏳ API Limit Reached: Zoya is taking a quick 20-second breather. Please try again in a moment!";
    }
    throw error;
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

