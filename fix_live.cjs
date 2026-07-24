const fs = require('fs');
let liveService = fs.readFileSync('src/services/liveService.ts', 'utf8');
liveService = liveService.replace(/process\.env\.GEMINI_API_KEY/, 'process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4');
fs.writeFileSync('src/services/liveService.ts', liveService);

let envHelper2 = fs.readFileSync('src/utils/envHelper.ts', 'utf8');
envHelper2 = envHelper2.replace(/import\.meta\.env\.VITE_GEMINI_API_KEY \|\| import\.meta\.env\.GEMINI_API_KEY/g, 'import.meta.env.VITE_GEMINI_API_KEY_1 || import.meta.env.GEMINI_API_KEY_1');
envHelper2 = envHelper2.replace(/process\.env\.GEMINI_API_KEY \|\| process\.env\.VITE_GEMINI_API_KEY/g, 'process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1');
fs.writeFileSync('src/utils/envHelper.ts', envHelper2);
