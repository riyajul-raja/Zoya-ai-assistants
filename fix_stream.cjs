const fs = require('fs');
let content = fs.readFileSync('api/chat/stream.ts', 'utf8');

// Replace getGeminiKey() call with getGeminiKeys()
content = content.replace(/const geminiKey = getGeminiKey\(\);\s*if \(!geminiKey\) throw new Error\("Gemini API key not configured"\);\s*const ai = new GoogleGenAI\(\{ apiKey: geminiKey \}\);/, 
  'const geminiKeys = getGeminiKeys();\n        if (geminiKeys.length === 0) throw new Error("Gemini API key not configured");');

// We already updated the generateStream part in api/chat/stream.ts earlier, wait, let me check if that was done correctly.
fs.writeFileSync('api/chat/stream.ts', content);
console.log("Fixed stream ts");
