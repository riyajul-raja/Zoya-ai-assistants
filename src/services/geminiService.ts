import { Provider } from "./diagnosticsStore";
import { diagnosticsStore } from "./diagnosticsStore";

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini-2.5-flash"
): Promise<string> {
  const startTime = Date.now();
  diagnosticsStore.updateProvider(selectedModel as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel });
  
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, selectedModel, isProfessionalMode, environmentContext, imageFrames })
    });
    
    if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch(e) {}
        throw new Error(errData?.error || response.statusText);
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";
    
    if (reader) {
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.startsWith("event: chunk")) {
                    const dataLine = lines[i + 1];
                    if (dataLine && dataLine.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(dataLine.substring(6));
                            if (data.text) {
                                accumulatedText += data.text;
                                if (onChunk) onChunk(accumulatedText);
                            }
                        } catch (e) {}
                        i++; // Skip the data line
                    }
                } else if (line.startsWith("event: error")) {
                    const dataLine = lines[i + 1];
                    if (dataLine && dataLine.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(dataLine.substring(6));
                            throw new Error(data.error);
                        } catch(e) {}
                    }
                }
            }
        }
    }
    
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "success", latencyMs: Date.now() - startTime });
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    throw error;
  }
}


export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "API returned error: " + response.statusText);
    }
    return data.audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
