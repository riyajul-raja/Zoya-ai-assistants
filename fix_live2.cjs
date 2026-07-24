const fs = require('fs');
let liveSvc = fs.readFileSync('src/services/liveService.ts', 'utf8');
liveSvc = liveSvc.replace(/new GoogleGenAI\(\{ apiKey: process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4 \}\)/g,
  'new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4 || "").trim() })');
fs.writeFileSync('src/services/liveService.ts', liveSvc);
console.log("Fixed liveSvc");
