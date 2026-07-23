import { diagnosticsStore, Provider } from "./diagnosticsStore";

export async function getZoyaResponseStream(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrames?: string | string[],
  isProfessionalMode: boolean = false,
  environmentContext: string = "",
  onChunk?: (text: string) => void,
  selectedModel: string = "gemini"
): Promise<string> {
  const isDev = import.meta.env.DEV;
  
  const startTime = Date.now();
  diagnosticsStore.updateProvider(selectedModel as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true });
  
  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history, imageFrames, selectedModel }),
    });

    if (!response.ok) {
      let errorText = `API returned error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorText = errorData.error;
      } catch (e) {}
      throw new Error(errorText);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            let data: any;
            try {
              data = JSON.parse(dataStr);
            } catch (e) {
              // ignore parse errors for partial chunks
              continue;
            }
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.text) {
              accumulatedText += data.text;
              if (onChunk) onChunk(accumulatedText);
            }
          }
        }
      }
    }

    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "success", latencyMs: Date.now() - startTime });
    return accumulatedText || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error(`${selectedModel} Stream Error:`, error);
    throw error;
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
  const isDev = import.meta.env.DEV;
  const startTime = Date.now();
  diagnosticsStore.updateProvider(selectedModel as Provider, { status: "pending", lastRequestTime: startTime, isConfigured: true });
  
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history, imageFrames, selectedModel }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `API returned error: ${response.statusText}`);
    }

    diagnosticsStore.updateProvider(selectedModel as Provider, { 
      status: "success", 
      latencyMs: Date.now() - startTime,
      tokenUsage: data.tokenUsage 
    });
    
    return data.text || "Ugh, fine. I have nothing to say.";
  } catch (error: any) {
    diagnosticsStore.updateProvider(selectedModel as Provider, { status: "error", lastError: error.message, latencyMs: Date.now() - startTime });
    if (isDev) console.error(`${selectedModel} Request Error:`, error);
    throw error;
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  const isDev = import.meta.env.DEV;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `API returned error: ${response.statusText}`);
    }
    return data.audio;
  } catch (error) {
    if (isDev) console.error("TTS Error:", error);
    return null;
  }
}
