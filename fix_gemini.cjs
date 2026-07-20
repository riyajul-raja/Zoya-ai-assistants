const fs = require('fs');

let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// I will just replace everything from "export async function getZoyaResponseStream(" down to the end of getZoyaResponse.

const startStream = code.indexOf("export async function getZoyaResponseStream(");
const endResponse = code.indexOf("export async function getZoyaAudio(");

const before = code.substring(0, startStream);
const after = code.substring(endResponse);

const cleanFunctions = `export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrame?: string,
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const dynamicTime = new Date().toLocaleString('en-IN');
    
    const cleanHistory = history.filter((msg) => {
      if (!msg || !msg.text) return false;
      if ((msg as any).isError) return false;
      const txt = msg.text.toLowerCase();
      if (
        txt.includes("system update") ||
        txt.includes("reconnecting") ||
        txt.includes("network timeout")
      ) {
        return false;
      }
      return true;
    });

    const recentHistory = cleanHistory.slice(-6).map((msg) => ({
      ...msg,
      image: undefined,
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
    const isImageAnalysis = !!imageFrame;
    // VERY IMPORTANT: DO NOT use thinkingConfig with image uploads, it crashes with 400 Bad Request!
    const isHighThinking = !isImageAnalysis && /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);
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
    } else if (isImageAnalysis) {
      // If we have an image, we MUST use a model that supports multimodal input (3.5-flash is fine, or 3.1-pro-preview but WITHOUT thinkingConfig)
      targetModel = "gemini-3.1-pro-preview"; // We can use pro for better image analysis
    }

    const hiddenContext = \`System Context: The current exact date and time is \${dynamicTime} (IST).\\n\\n\`;
    let currentMessageParts: any[] = [];
    if (imageFrame) {
      currentMessageParts = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: \`\${hiddenContext}\${prompt}\`
        }
      ];
    } else {
      currentMessageParts = [{ text: \`\${hiddenContext}\${prompt}\` }];
    }

    const finalContents = [
      ...formattedHistory,
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    try {
      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        config: targetConfig,
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
    const dynamicTime = new Date().toLocaleString('en-IN');
    
    const cleanHistory = history.filter((msg) => {
      if (!msg || !msg.text) return false;
      if ((msg as any).isError) return false;
      const txt = msg.text.toLowerCase();
      if (
        txt.includes("system update") ||
        txt.includes("reconnecting") ||
        txt.includes("network timeout")
      ) {
        return false;
      }
      return true;
    });

    const recentHistory = cleanHistory.slice(-6).map((msg) => ({
      ...msg,
      image: undefined,
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
    const isImageAnalysis = !!imageFrame;
    // VERY IMPORTANT: DO NOT use thinkingConfig with image uploads, it crashes with 400 Bad Request!
    const isHighThinking = !isImageAnalysis && /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);
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
    } else if (isImageAnalysis) {
      targetModel = "gemini-3.1-pro-preview";
    }

    const hiddenContext = \`System Context: The current exact date and time is \${dynamicTime} (IST).\\n\\n\`;
    let currentMessageParts: any[] = [];
    if (imageFrame) {
      currentMessageParts = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: \`\${hiddenContext}\${prompt}\`
        }
      ];
    } else {
      currentMessageParts = [{ text: \`\${hiddenContext}\${prompt}\` }];
    }

    const finalContents = [
      ...formattedHistory,
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        config: targetConfig,
        contents: finalContents,
      });
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

`;

fs.writeFileSync('src/services/geminiService.ts', before + cleanFunctions + after);
