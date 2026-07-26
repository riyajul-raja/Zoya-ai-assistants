const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemInstruction = "Zoya test";
    
    const prompt = "hello";
    const imageFrames = ["base64string123"];
    
    let currentMessageParts = [];
    currentMessageParts = imageFrames.map((frame) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.includes(',') ? frame.split(',')[1] : frame,
      }
    }));
    currentMessageParts.push({ text: prompt });

    const finalContents = [
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    console.log("Request contents:", JSON.stringify(finalContents, null, 2));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      contents: finalContents,
    });
    
    console.log("Success:", response.text);
  } catch (error) {
    console.log("EXACT ERROR MESSAGE:", error.message);
    console.log("EXACT ERROR STACK:", error.stack);
  }
}
run();
