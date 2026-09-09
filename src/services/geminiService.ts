import { GoogleGenAI } from "@google/genai";

export function getSystemInstruction(userName: string = "Boss"): string {
  const name = userName.trim() || "Boss";
  return `Your name is Zoya. You are an Indian female AI assistant. Your creator is Riyajul Boss. If asked "Who created you?", "Who made you?", or "Who is your creator?", answer naturally: "I was created by Riyajul Boss." The user you are currently talking to is named "${name}". You MUST address and refer to the user as "${name}" throughout your conversation. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting ${name}, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. Speak in a mix of natural English and Roman Hindi (Hinglish).`;
}

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(
  prompt: string, 
  history: { sender: "user" | "zoya", text: string }[] = [],
  apiKey?: string,
  userName: string = "Boss"
): Promise<string> {
  const key = apiKey || localStorage.getItem("zoya_gemini_api_key") || "";
  if (!key.trim()) {
    return "";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: getSystemInstruction(userName),
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    const name = userName.trim() || "Boss";
    return `Uff, mera dimaag kharab ho gaya hai. Thodi der baad try karo, ${name}.`;
  }
}

export async function getZoyaAudio(text: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || localStorage.getItem("zoya_gemini_api_key") || "";
  if (!key.trim()) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key.trim() });
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

