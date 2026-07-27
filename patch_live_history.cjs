const fs = require('fs');
let code = fs.readFileSync('src/services/liveService.ts', 'utf8');

const oldStart = `async start(useMic: boolean = true, isProfessionalMode: boolean = false, environmentContext: string = "") {`;
const newStart = `async start(
    useMic: boolean = true, 
    isProfessionalMode: boolean = false, 
    environmentContext: string = "",
    history: { sender: "user" | "zoya"; text: string; image?: string }[] = []
  ) {`;
code = code.replace(oldStart, newStart);

const oldSys = `      if (environmentContext) {
        activeSystemInstruction = \`\${environmentContext}\\n\\n\${activeSystemInstruction}\`;
      }`;
const newSys = `      if (environmentContext) {
        activeSystemInstruction = \`\${environmentContext}\\n\\n\${activeSystemInstruction}\`;
      }
      
      // Inject text chat history into the Live API context if available
      if (history && history.length > 0) {
        const historyText = history.slice(-6).map(msg => \`\${msg.sender.toUpperCase()}: \${msg.text}\`).join('\\n');
        activeSystemInstruction = \`\${activeSystemInstruction}\\n\\nHere is the recent conversation history for context:\\n\${historyText}\`;
      }`;
code = code.replace(oldSys, newSys);

fs.writeFileSync('src/services/liveService.ts', code);
console.log("Patched liveService");
