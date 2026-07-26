import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { text } = await req.json();

    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 500 });
    }

    let response;
    let lastError;

    // Shuffle keys
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
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
          },
        });
        break; // Successfully got the response!
      } catch (error: any) {
        console.warn(`Key failed with error: ${error?.status || error?.message}. Trying next key...`);
        lastError = error;
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ error: 'All API keys exhausted or failed: ' + lastError?.message }), {
        status: lastError?.status === 429 ? 429 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

    return new Response(JSON.stringify({ audioData }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
