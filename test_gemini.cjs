const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview"
  });

  // A tiny valid base64 image (1x1 pixel)
  const imageFrame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  const messageInput = [
    {
      inlineData: {
        mimeType: "image/png",
        data: imageFrame,
      }
    },
    {
      text: "What is this image?"
    }
  ];

  try {
    const res = await chat.sendMessageStream({ message: messageInput });
    for await (const chunk of res) {
      process.stdout.write(chunk.text);
    }
    console.log("\nDone");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
