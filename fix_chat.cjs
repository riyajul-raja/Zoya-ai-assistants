const fs = require('fs');
let content = fs.readFileSync('api/chat.ts', 'utf8');
content = content.replace(/const geminiKey = getGeminiKey\(\);\s*if \(!geminiKey\) throw new Error\("Gemini API key not configured"\);\s*const ai = new GoogleGenAI\(\{ apiKey: geminiKey \}\);/, 
  'const geminiKeys = getGeminiKeys();\n        if (geminiKeys.length === 0) throw new Error("Gemini API key not configured");');
fs.writeFileSync('api/chat.ts', content);
console.log("Fixed chat ts");
