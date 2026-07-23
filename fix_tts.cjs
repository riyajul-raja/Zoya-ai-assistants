const fs = require('fs');

let content = fs.readFileSync('api/tts.ts', 'utf8');

content = content.replace(/const ai = new GoogleGenAI\(\{ apiKey: geminiKey \}\);/, 'const ai = new GoogleGenAI({ apiKey: geminiKey.trim(), httpOptions: { headers: { "x-goog-api-key": geminiKey.trim() } } });');

fs.writeFileSync('api/tts.ts', content);
console.log("Updated api/tts.ts");
