const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = "What is this image?";
    const imageFrames = ["/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAGBAQABPxA="];
    
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
