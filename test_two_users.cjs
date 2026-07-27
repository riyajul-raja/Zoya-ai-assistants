const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const finalContents = [
      { role: "user", parts: [{ text: "hello" }] },
      { role: "model", parts: [{ text: "hi" }] },
      { role: "user", parts: [{ text: "how are you" }] },
      { role: "user", parts: [{ text: "are you there?" }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalContents,
    });
    
    console.log("Success:", response.text);
  } catch (error) {
    console.log("EXACT ERROR MESSAGE:", error.message);
  }
}
run();
