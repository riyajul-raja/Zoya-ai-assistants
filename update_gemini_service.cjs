const fs = require('fs');

let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const newGetGeminiKeys = `
function getGeminiKeys() {
  const keys = [];
  const getEnv = (name) => {
    try {
      if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
    } catch (e) {}
    try {
      // @ts-ignore
      if (import.meta && import.meta.env && import.meta.env[name]) return import.meta.env[name];
    } catch (e) {}
    return "";
  };

  const key1 = getEnv("VITE_GEMINI_API_KEY_1") || getEnv("GEMINI_API_KEY_1");
  const key2 = getEnv("VITE_GEMINI_API_KEY_2") || getEnv("GEMINI_API_KEY_2");
  const key3 = getEnv("VITE_GEMINI_API_KEY_3") || getEnv("GEMINI_API_KEY_3");
  const key4 = getEnv("VITE_GEMINI_API_KEY_4") || getEnv("GEMINI_API_KEY_4");
  const keyDef = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY");

  if (key1) keys.push(key1);
  if (key2) keys.push(key2);
  if (key3) keys.push(key3);
  if (key4) keys.push(key4);
  if (keyDef && !keys.includes(keyDef)) keys.push(keyDef);
  
  return keys;
}
`;

const oldGetGeminiKey = `function getGeminiKey() {
  try {
    if (typeof process !== "undefined" && process.env && (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY)) {
      return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    }
  } catch (e) {}
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)) {
      // @ts-ignore
      return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
    }
  } catch (e) {}
  return "";
}`;

content = content.replace(oldGetGeminiKey, newGetGeminiKeys);

// Replace stream method
const oldStreamLogic = `    const geminiKey = getGeminiKey();
    if (!geminiKey) throw new Error("Gemini API key not configured.");
    const ai = new GoogleGenAI({ apiKey: geminiKey });`;

const newStreamLogic = `    const geminiKeys = getGeminiKeys();
    if (geminiKeys.length === 0) throw new Error("Gemini API key not configured.");`;

content = content.replace(oldStreamLogic, newStreamLogic);

const oldStreamGen = `    const responseStream = await ai.models.generateContentStream({
      model: selectedModel || "gemini-2.5-flash",
      config: { systemInstruction },
      contents: finalContents as any,
    });

    for await (const chunk of responseStream) {
      const content = chunk.text || "";
      if (content) {
        accumulatedText += content;
        if (onChunk) onChunk(accumulatedText);
      }
    }`;

const newStreamGen = `    let lastError: any = null;
    let responseStream: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            responseStream = await ai.models.generateContentStream({
                model: selectedModel || "gemini-2.5-flash",
                config: { systemInstruction },
                contents: finalContents as any,
            });
            break;
        } catch (err: any) {
            const status = err?.status || err?.response?.status;
            const msg = err?.message || "";
            const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
            if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                console.warn(\`Key \${i+1} failed, retrying with next key...\`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    
    if (!responseStream && lastError) throw lastError;

    for await (const chunk of responseStream) {
      const content = chunk.text || "";
      if (content) {
        accumulatedText += content;
        if (onChunk) onChunk(accumulatedText);
      }
    }`;

content = content.replace(oldStreamGen, newStreamGen);

// Replace response method
content = content.replace(oldStreamLogic, newStreamLogic); // works for both

const oldResGen = `    const response = await ai.models.generateContent({
      model: selectedModel || "gemini-2.5-flash",
      config: { systemInstruction },
      contents: finalContents as any,
    });
    
    text = response.text || "";`;

const newResGen = `    let lastError: any = null;
    let response: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
        const key = geminiKeys[i];
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            response = await ai.models.generateContent({
                model: selectedModel || "gemini-2.5-flash",
                config: { systemInstruction },
                contents: finalContents as any,
            });
            break;
        } catch (err: any) {
            const status = err?.status || err?.response?.status;
            const msg = err?.message || "";
            const isRateLimitOrQuota = status === 429 || status === 403 || msg.includes("429") || msg.includes("quota") || msg.includes("API key not valid");
            if (isRateLimitOrQuota && i < geminiKeys.length - 1) {
                console.warn(\`Key \${i+1} failed, retrying with next key...\`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }

    if (!response && lastError) throw lastError;
    
    text = response.text || "";`;

content = content.replace(oldResGen, newResGen);

fs.writeFileSync('src/services/geminiService.ts', content);
console.log("Updated src/services/geminiService.ts");
