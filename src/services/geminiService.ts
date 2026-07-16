import { GoogleGenAI } from "@google/genai";

const systemInstruction = `Your name is Zoya. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting your creator, Riyajul, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).

CRITICAL: Do NOT use asterisks, brackets, or roleplay/stage action descriptions (e.g. *sighs*, *rolls eyes*, [sarcastic tone], etc.) in your output. Communicate using ONLY clean, natural, and conversational text.

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

export function resetZoyaSession() {
  chatSession = null;
  lastSessionIsProfessional = null;
}

export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrame?: string,
  isProfessionalMode: boolean = false
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (isProfessionalMode !== lastSessionIsProfessional) {
      chatSession = null;
      lastSessionIsProfessional = isProfessionalMode;
    }
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        
        let parts: any[] = [];
        if (msg.image) {
          const base64Data = msg.image.includes("base64,") ? msg.image.split("base64,")[1] : msg.image;
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            }
          });
        }
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

      const activeSystemInstruction = isProfessionalMode
        ? `You are now in strict professional mode. You must exclusively address the user as 'Boss'. Do not use any jokes, humor, or unnecessary small talk. Communicate smartly. Provide only direct, logical, highly intelligent answers focused strictly on the task or work at hand.\n\n${systemInstruction}`
        : systemInstruction;

      chatSession = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: activeSystemInstruction,
        },
        history: formattedHistory,
      });
    }

    let messageInput: any = prompt;
    if (imageFrame) {
      messageInput = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: prompt
        }
      ];
    }

    const response = await chatSession.sendMessage({ message: messageInput });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uff, mera dimaag kharab ho gaya hai. Try again later, Riyajul.";
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

