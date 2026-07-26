const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// Replace getZoyaResponseStream's chatSession.sendMessageStream
code = code.replace(
  /const responseStream = await chatSession\.sendMessageStream\(\{ message: messageInput \}\);/g,
  "let currentMessageParts = [];\n" +
  "      if (imageFrame) {\n" +
  "        currentMessageParts = [\n" +
  "          { inlineData: { data: imageFrame, mimeType: 'image/jpeg' } },\n" +
  "          { text: hiddenContext + prompt }\n" +
  "        ];\n" +
  "      } else {\n" +
  "        currentMessageParts = [{ text: hiddenContext + prompt }];\n" +
  "      }\n" +
  "      \n" +
  "      const finalContents = [\n" +
  "        ...formattedHistory,\n" +
  "        { role: 'user', parts: currentMessageParts }\n" +
  "      ];\n" +
  "      \n" +
  "      const responseStream = await ai.models.generateContentStream({\n" +
  "        model: targetModel,\n" +
  "        config: targetConfig,\n" +
  "        contents: finalContents,\n" +
  "      });"
);

// We need to restore the getZoyaResponse because I messed it up.
// Let's just find "export async function getZoyaResponse(" and replace the whole function.
const startIdx = code.indexOf("export async function getZoyaResponse(");
if (startIdx !== -1) {
  const getZoyaResponseCode = `export async function getZoyaResponse(
  prompt: string,
  history: { sender: "user" | "zoya"; text: string; image?: string }[] = [],
  imageFrame?: string,
  isProfessionalMode: boolean = false,
  environmentContext: string = ""
) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const dynamicTime = new Date().toLocaleString('en-IN');
    
    const cleanHistory = history.filter((msg) => {
      if (!msg || !msg.text) return false;
      if ((msg as any).isError) return false;
      return true;
    });
    
    const recentHistory = cleanHistory.slice(-6).map((msg) => ({
      ...msg,
      image: undefined,
    }));
    
    let formattedHistory: any[] = [];
    let currentRole = "";
    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "model";
      let parts: any[] = [];
      parts.push({ text: msg.text });
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
    
    const activeSystemInstruction = isProfessionalMode 
      ? \`You are Zoya... \${environmentContext}\` 
      : \`You are Zoya...\`; // We can just use the function
      
    // Actually, I should just use the exact logic as Stream, but without Stream.
    // To be safe, I'll just read the first part of the file and append a clean getZoyaResponse.
  } catch (err) {}
}`;
}
