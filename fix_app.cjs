const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
content = content.replace(
  'import { getZoyaResponse, getZoyaResponseStream } from "./services/geminiService";',
  'import { getZoyaResponse, getZoyaResponseStream } from "./services/geminiService";\nimport { detectIntent } from "./services/intentService";'
);

// Inject intent router in handleTextCommand
const intentInjection = `
    let responseText = "";

    // 0. Smart Intent Router
    if (attachedImageBase64s.length === 0) {
      const intentResult = detectIntent(finalTranscript);
      console.log(\`[Intent Router] Text: "\${finalTranscript.substring(0,20)}" => \${intentResult.type} (\${intentResult.module || 'N/A'})\`);
      
      if (intentResult.type === "LOCAL" && intentResult.response) {
        console.log(\`[Intent Router] Executing locally. No Gemini API will be called.\`);
        const responseMessageId = Date.now().toString() + "-z";
        setMessages((prev) => [
          ...prev,
          { id: responseMessageId, sender: "zoya", role: "model", text: intentResult.response || "" }
        ]);
        setAppState("idle");
        
        if (!isMuted && !skipSpeech) {
          speakMessageText(intentResult.response);
        }
        return; // Halt here, don't call Gemini
      }
    }
`;

content = content.replace(
  '    let responseText = "";\n\n    if (commandResult.isBrowserAction) {',
  intentInjection + '\n    if (commandResult.isBrowserAction) {'
);

fs.writeFileSync('src/App.tsx', content);
