const fs = require('fs');

// 1. api/envHelper.ts
let envHelper = fs.readFileSync('api/envHelper.ts', 'utf8');
envHelper = envHelper.replace(/if \(keyDef && !keys\.includes\(keyDef\.trim\(\)\)\) keys\.push\(keyDef\.trim\(\)\);/g, 
  'if (keyDef && !keyDef.trim().startsWith("ya29.") && !keys.includes(keyDef.trim())) keys.push(keyDef.trim());');
fs.writeFileSync('api/envHelper.ts', envHelper);

// 2. src/services/geminiService.ts
let geminiSvc = fs.readFileSync('src/services/geminiService.ts', 'utf8');
geminiSvc = geminiSvc.replace(/if \(keyDef && !keys\.includes\(keyDef\.trim\(\)\)\) keys\.push\(keyDef\.trim\(\)\);/g, 
  'if (keyDef && !keyDef.trim().startsWith("ya29.") && !keys.includes(keyDef.trim())) keys.push(keyDef.trim());');
fs.writeFileSync('src/services/geminiService.ts', geminiSvc);

// 3. api/tts.ts
let tts = fs.readFileSync('api/tts.ts', 'utf8');
tts = tts.replace(/const geminiKey = process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4 \|\| process\.env\.GEMINI_API_KEY;/g, 
  'const keys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY];\n    const geminiKey = keys.find(k => k && !k.trim().startsWith("ya29."));');
fs.writeFileSync('api/tts.ts', tts);

// 4. src/services/liveService.ts
let liveSvc = fs.readFileSync('src/services/liveService.ts', 'utf8');
liveSvc = liveSvc.replace(/apiKey: \(process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4 \|\| process\.env\.GEMINI_API_KEY \|\| ""\)\.trim\(\)/g, 
  'apiKey: [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY].find(k => k && !k.trim().startsWith("ya29."))?.trim() || ""');
fs.writeFileSync('src/services/liveService.ts', liveSvc);

console.log("Filtered OAuth tokens");
