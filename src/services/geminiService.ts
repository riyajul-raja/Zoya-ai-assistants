import { GoogleGenAI, Type } from "@google/genai";

export function getSystemInstruction(userName: string = ""): string {
  const trimmed = userName.trim();
  const nameDirective = trimmed
    ? `The user you are currently talking to is named "${trimmed}". You MUST address and call the user "${trimmed}" throughout your conversation.`
    : `You DO NOT know the user's name yet. On the first turn or whenever greeting the user, you MUST naturally ask: "Aapka naam kya hai?". When the user tells you their name, call the tool "saveUserName" with their name, acknowledge it happily, and address them warmly by that name. Do not ask for their name again once it has been provided.`;

  return `Your name is Zoya. You are an Indian female AI assistant. Your creator is Riyajul Boss. If asked "Who created you?", "Who made you?", or "Who is your creator?", answer naturally: "I was created by Riyajul Boss." ${nameDirective} Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting ${trimmed || "the user"}, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. Speak in a mix of natural English and Roman Hindi (Hinglish).`;
}

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(
  prompt: string, 
  history: { sender: "user" | "zoya", text: string }[] = [],
  apiKey?: string,
  userName: string = "",
  onNameDetected?: (name: string) => void
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
          tools: [{
            functionDeclarations: [
              {
                name: "saveUserName",
                description: "Call this when the user tells or introduces their name (e.g. 'Mera naam Riyajul hai', 'My name is Sara', 'Riyajul').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "The user's real name, properly capitalized." }
                  },
                  required: ["name"]
                }
              }
            ]
          }]
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });

    // Handle tool calls if model extracted user's name
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "saveUserName") {
          const detected = (call.args as any)?.name;
          if (detected && typeof detected === "string") {
            const cleaned = detected.trim();
            if (cleaned) {
              onNameDetected?.(cleaned);
              try {
                const followUp = await chatSession.sendMessage([
                  {
                    functionResponses: [
                      {
                        name: "saveUserName",
                        response: { result: `Name saved as ${cleaned}.` }
                      }
                    ]
                  }
                ]);
                return followUp.text || `Achha, to aapka naam ${cleaned} hai! Nice to meet you.`;
              } catch {
                return `Achha, to aapka naam ${cleaned} hai! Nice to meet you.`;
              }
            }
          }
        }
      }
    }

    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    const name = userName.trim();
    return name 
      ? `Uff, mera dimaag kharab ho gaya hai. Thodi der baad try karo, ${name}.`
      : "Uff, mera dimaag kharab ho gaya hai. Thodi der baad try karo.";
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

