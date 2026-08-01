const { GoogleGenAI } = require("@google/genai");
async function run() {
  try {
    delete process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: undefined });
    await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "hello",
    });
    console.log("Success");
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
