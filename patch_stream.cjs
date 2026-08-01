const fs = require('fs');
const content = `import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { prompt, history = [], imageFrames = [] } = await req.json();

    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: { message: 'Missing API Key' } }), { status: 500 });
    }

    const systemInstruction = "Your name is Zoya. You are an Indian female AI assistant. Keep responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).";

    let formattedHistory: any[] = [];
    let currentRole = "";
    for (const msg of history.slice(-6)) {
      if (!msg || !msg.text) continue;
      if (msg.isError) continue;
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
      currentMessageParts = normalizedImageFrames.map((frame: string) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.includes(',') ? frame.split(',')[1] : frame,
        }
      }));
      currentMessageParts.push({ text: prompt });
    } else {
      currentMessageParts = [{ text: prompt }];
    }

    const finalContents = [
      ...formattedHistory,
      { role: "user", parts: currentMessageParts }
    ];

    let responseStream;
    let lastError;

    // Optional: shuffle keys to distribute load, or just start from a random index
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
        break; // Successfully got the stream!
      } catch (error: any) {
        console.warn(\`Key failed with error: \${error.status || error.message}. Trying next key...\`);
        lastError = error;
      }
    }

    if (!responseStream) {
      return new Response(JSON.stringify({ error: { message: 'All API keys exhausted or failed: ' + lastError?.message, status: lastError?.status } }), {
        status: lastError?.status === 429 ? 429 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || "";
            if (chunkText) {
              controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ text: chunkText })}\\n\\n\`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
          controller.close();
        } catch (error: any) {
          console.error("Gemini Stream Iteration Error:", error);
          controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ error: { message: error.message, status: error.status, code: error.code } })}\\n\\n\`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
\`;

fs.writeFileSync('api/chat/stream.ts', content);
