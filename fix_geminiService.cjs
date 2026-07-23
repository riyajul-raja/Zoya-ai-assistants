const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/model: "gemini-2\.5-flash"/g, 'model: selectedModel || "gemini-2.5-flash"');
fs.writeFileSync('src/services/geminiService.ts', content);
