const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/diagnosticsStore\.updateProvider\(selectedModel as Provider, \{ status: "pending", lastRequestTime: startTime, isConfigured: true \}\);/g, 'diagnosticsStore.updateProvider("gemini", { status: "pending", lastRequestTime: startTime, isConfigured: true, modelName: selectedModel || "gemini-2.5-flash" });');

content = content.replace(/diagnosticsStore\.updateProvider\(selectedModel as Provider,/g, 'diagnosticsStore.updateProvider("gemini",');

fs.writeFileSync('src/services/geminiService.ts', content);
console.log("Fixed geminiService.ts store updates");
