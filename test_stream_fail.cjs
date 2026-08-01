const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: "invalid_key" });
    
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
    console.log("ORIGINAL ERROR:");
    console.log("Message:", error.message);
    console.log("Status:", error.status);
    console.log("Code:", error.code);
  }
}
run();
