const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const replacementStream = `    let responseStream;
    let lastError;
    const startIndex = Math.floor(Math.random() * keys.length);
    const orderedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    for (const apiKey of orderedKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        responseStream = await ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          config: { systemInstruction },
          contents: finalContents,
        });
        break;
      } catch (error) {
        console.warn("Key failed:", error?.status || error?.message);
        lastError = error;
      }
    }

    if (!responseStream) {
      res.write(\`data: \${JSON.stringify({ error: { message: "All API keys exhausted or failed: " + lastError?.message, status: lastError?.status } })}\\n\\n\`);
      res.end();
      return;
    }`;

content = content.replace(/    const responseStream = await ai\.models\.generateContentStream\(\{[\s\S]*?\}\);/m, replacementStream);

const replacementChat = `    let response;
    let lastError;
    const startIndex = Math.floor(Math.random() * keys.length);
    const orderedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    for (const apiKey of orderedKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          config: { systemInstruction },
          contents: finalContents,
        });
        break;
      } catch (error) {
        console.warn("Key failed:", error?.status || error?.message);
        lastError = error;
      }
    }

    if (!response) {
      res.status(lastError?.status === 429 ? 429 : 500).json({ error: { message: "All API keys exhausted or failed: " + lastError?.message, status: lastError?.status } });
      return;
    }`;

content = content.replace(/    const response = await ai\.models\.generateContent\(\{[\s\S]*?\}\);/m, replacementChat);

const replacementTts = `    let response;
    let lastError;
    const startIndex = Math.floor(Math.random() * keys.length);
    const orderedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    for (const apiKey of orderedKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
          },
        });
        break;
      } catch (error) {
        console.warn("Key failed:", error?.status || error?.message);
        lastError = error;
      }
    }

    if (!response) {
      res.status(lastError?.status === 429 ? 429 : 500).json({ error: "All API keys exhausted or failed: " + lastError?.message });
      return;
    }`;

content = content.replace(/    const response = await ai\.models\.generateContent\(\{[\s\S]*?voiceName: "Kore"[\s\S]*?\}\);/m, replacementTts);

fs.writeFileSync('server.ts', content);
