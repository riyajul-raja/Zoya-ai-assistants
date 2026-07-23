const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/diagnosticsStore\.updateProvider\("gemini",/g, 'diagnosticsStore.updateProvider((selectedModel || "gemini-2.5-flash") as Provider,');

fs.writeFileSync('src/services/geminiService.ts', content);
console.log("Updated geminiService.ts");
