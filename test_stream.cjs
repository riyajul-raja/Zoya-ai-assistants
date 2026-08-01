const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const finalContents = [
      { role: "user", parts: [{ text: "hello" }] }
    ];

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: finalContents,
    });
    
    for await (const chunk of responseStream) {
      console.log(chunk.text);
    }
    
    console.log("Success");
  } catch (error) {
    console.log("EXACT ERROR MESSAGE:", error.message);
    console.log("EXACT STATUS:", error.status);
    console.log("EXACT CODE:", error.code);
  }
}
run();
