import re

with open('src/services/geminiService.ts', 'r') as f:
    content = f.read()

# Make a clean replacement of the geminiService bodies
# I'll replace everything from "export async function getZoyaResponseStream" up to "export async function getZoyaAudio"

# ... wait, let's just do it directly

new_stream_impl = """export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini"
): Promise<string> {
  if (selectedModel === "groq") {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) {
      throw new Error("VITE_GROQ_API_KEY is missing");
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
      const response = await fetch("https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({ model: "llama3-8b-8192", messages, stream: true })
      });
      if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim().startsWith("data: ") && line.trim() !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.trim().slice(6));
                const content = data.choices[0]?.delta?.content || "";
                accumulatedText += content;
                if (onChunk) onChunk(accumulatedText);
              } catch (e) {}
            }
          }
        }
      }
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Groq Stream Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }
  } else if (selectedModel === "huggingface") {
    const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    if (!hfKey) {
      throw new Error("VITE_HUGGINGFACE_API_KEY is missing");
    }
    const hfHistory = history.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || ""
    })).filter(msg => msg.content);
    const messages = [
      { role: "system", content: systemInstruction },
      ...hfHistory,
      { role: "user", content: prompt }
    ];
    try {
      const response = await fetch("https://corsproxy.io/?https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
        body: JSON.stringify({ model: "HuggingFaceH4/zephyr-7b-beta", messages, stream: true, max_tokens: 500 })
      });
      if (!response.ok) throw new Error(`Hugging Face API error: ${response.statusText}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim().startsWith("data: ") && line.trim() !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.trim().slice(6));
                const content = data.choices[0]?.delta?.content || "";
                accumulatedText += content;
                if (onChunk) onChunk(accumulatedText);
              } catch (e) {}
            }
          }
        }
      }
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Hugging Face Stream Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }
  } else {
    // gemini
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
      let formattedHistory: any[] = [];
      let currentRole = "";
      for (const msg of history.slice(-6)) {
        if (!msg || !msg.text || (msg as any).isError) continue;
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
          inlineData: { mimeType: "image/jpeg", data: frame.includes(',') ? frame.split(',')[1] : frame }
        }));
        currentMessageParts.push({ text: prompt });
      } else {
        currentMessageParts = [{ text: prompt }];
      }
      const finalContents = [
        ...formattedHistory,
        { role: "user", parts: currentMessageParts }
      ];
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        config: { systemInstruction },
        contents: finalContents,
      });
      let accumulatedText = "";
      for await (const chunk of responseStream) {
        const chunkText = chunk.text || "";
        if (chunkText) {
          accumulatedText += chunkText;
          if (onChunk) onChunk(accumulatedText);
        }
      }
      return accumulatedText || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Gemini Stream Error:", error);
      throw error;
    }
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
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) {
      throw new Error("VITE_GROQ_API_KEY is missing");
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
      const response = await fetch("https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({ model: "llama3-8b-8192", messages, stream: false })
      });
      if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Groq Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }
  } else if (selectedModel === "huggingface") {
    const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    if (!hfKey) {
      throw new Error("VITE_HUGGINGFACE_API_KEY is missing");
    }
    const hfHistory = history.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || ""
    })).filter(msg => msg.content);
    const messages = [
      { role: "system", content: systemInstruction },
      ...hfHistory,
      { role: "user", content: prompt }
    ];
    try {
      const response = await fetch("https://corsproxy.io/?https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hfKey}` },
        body: JSON.stringify({ model: "HuggingFaceH4/zephyr-7b-beta", messages, stream: false, max_tokens: 500 })
      });
      if (!response.ok) throw new Error(`Hugging Face API error: ${response.statusText}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Hugging Face Error:", error);
      if (error instanceof TypeError || error.name === 'TypeError') {
        throw new Error("CORS Error or Network Blocked: " + error.message);
      }
      throw error;
    }
  } else {
    // gemini
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
      let formattedHistory: any[] = [];
      let currentRole = "";
      for (const msg of history.slice(-6)) {
        if (!msg || !msg.text || (msg as any).isError) continue;
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
          inlineData: { mimeType: "image/jpeg", data: frame.includes(',') ? frame.split(',')[1] : frame }
        }));
        currentMessageParts.push({ text: prompt });
      } else {
        currentMessageParts = [{ text: prompt }];
      }
      const finalContents = [
        ...formattedHistory,
        { role: "user", parts: currentMessageParts }
      ];
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        config: { systemInstruction },
        contents: finalContents,
      });
      return response.text || "Ugh, fine. I have nothing to say.";
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }
}
"""

start_str = "export async function getZoyaResponseStream"
end_str = "export async function getZoyaAudio"

idx_start = content.find(start_str)
idx_end = content.find(end_str)

new_content = content[:idx_start] + new_stream_impl + "\n" + content[idx_end:]

with open('src/services/geminiService.ts', 'w') as f:
    f.write(new_content)

print("Success")
