const fs = require('fs');

let ttsContent = fs.readFileSync('api/tts.ts', 'utf8');
ttsContent = ttsContent.replace(/const geminiKey = process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4;/, 
`const geminiKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY;`);
fs.writeFileSync('api/tts.ts', ttsContent);

let liveService = fs.readFileSync('src/services/liveService.ts', 'utf8');
liveService = liveService.replace(/process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.GEMINI_API_KEY_2 \|\| process\.env\.GEMINI_API_KEY_3 \|\| process\.env\.GEMINI_API_KEY_4/, 'process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY');
fs.writeFileSync('src/services/liveService.ts', liveService);

let envHelper2 = fs.readFileSync('src/utils/envHelper.ts', 'utf8');
envHelper2 = envHelper2.replace(/import\.meta\.env\.VITE_GEMINI_API_KEY_1 \|\| import\.meta\.env\.GEMINI_API_KEY_1/g, 'import.meta.env.VITE_GEMINI_API_KEY_1 || import.meta.env.GEMINI_API_KEY_1 || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY');
envHelper2 = envHelper2.replace(/process\.env\.GEMINI_API_KEY_1 \|\| process\.env\.VITE_GEMINI_API_KEY_1/g, 'process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY');
fs.writeFileSync('src/utils/envHelper.ts', envHelper2);

console.log("Updated others");
