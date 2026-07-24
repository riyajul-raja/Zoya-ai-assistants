const fs = require('fs');

// 1. api/envHelper.ts
let envHelper = fs.readFileSync('api/envHelper.ts', 'utf8');
envHelper = envHelper.replace(/const keyDef = process\.env\.GEMINI_API_KEY \|\| process\.env\.VITE_GEMINI_API_KEY;/g, '');
envHelper = envHelper.replace(/if \(keyDef && !keys\.includes\(keyDef\.trim\(\)\)\) keys\.push\(keyDef\.trim\(\)\);/g, '');
fs.writeFileSync('api/envHelper.ts', envHelper);

// 2. src/services/geminiService.ts
let geminiSvc = fs.readFileSync('src/services/geminiService.ts', 'utf8');
geminiSvc = geminiSvc.replace(/const keyDef = getEnv\("VITE_GEMINI_API_KEY"\) \|\| getEnv\("GEMINI_API_KEY"\);/g, '');
geminiSvc = geminiSvc.replace(/if \(keyDef && !keys\.includes\(keyDef\.trim\(\)\)\) keys\.push\(keyDef\.trim\(\)\);/g, '');
fs.writeFileSync('src/services/geminiService.ts', geminiSvc);

// 3. api/tts.ts
let tts = fs.readFileSync('api/tts.ts', 'utf8');
tts = tts.replace(/const geminiKey = process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4 \|\| process\.env\.GEMINI_API_KEY;/g,
  'const geminiKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4;');
fs.writeFileSync('api/tts.ts', tts);

// 4. src/services/liveService.ts
let liveSvc = fs.readFileSync('src/services/liveService.ts', 'utf8');
liveSvc = liveSvc.replace(/process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4 \|\| process\.env\.GEMINI_API_KEY/g,
  'process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4');
fs.writeFileSync('src/services/liveService.ts', liveSvc);

// 5. src/utils/envHelper.ts
let envHelper2 = fs.readFileSync('src/utils/envHelper.ts', 'utf8');
envHelper2 = envHelper2.replace(/import\.meta\.env\.VITE_GEMINI_API_KEY_1 \|\| import\.meta\.env\.GEMINI_API_KEY_1 \|\| import\.meta\.env\.VITE_GEMINI_API_KEY \|\| import\.meta\.env\.GEMINI_API_KEY/g, 
  'import.meta.env.VITE_GEMINI_API_KEY_1 || import.meta.env.GEMINI_API_KEY_1');
envHelper2 = envHelper2.replace(/process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.VITE_GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY \|\| process\.env\.VITE_GEMINI_API_KEY/g,
  'process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1');
fs.writeFileSync('src/utils/envHelper.ts', envHelper2);

console.log("Ignored GEMINI_API_KEY everywhere");
