const { GoogleGenAI } = require("@google/genai");
async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: "hello" }] }],
      config: {
        responseModalities: ["AUDIO"],
      },
    });
    console.log("Success");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
