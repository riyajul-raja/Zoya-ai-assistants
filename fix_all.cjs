const fs = require('fs');

// 1. Fix api/envHelper.ts
let envHelper = fs.readFileSync('api/envHelper.ts', 'utf8');
envHelper = envHelper.replace(/export const getGeminiKey = \(\) => \{[\s\S]*?\};\n/, ''); // delete getGeminiKey if it exists

const newEnvHelper = `export const getGeminiKeys = () => {
    const keys = [];
    if (typeof process !== 'undefined' && process.env) {
        const key1 = process.env.GEMINI_API_KEY_1 || process.env.VITE_GEMINI_API_KEY_1;
        const key2 = process.env.GEMINI_API_KEY_2 || process.env.VITE_GEMINI_API_KEY_2;
        const key3 = process.env.GEMINI_API_KEY_3 || process.env.VITE_GEMINI_API_KEY_3;
        const key4 = process.env.GEMINI_API_KEY_4 || process.env.VITE_GEMINI_API_KEY_4;

        if (key1) keys.push(key1.trim());
        if (key2) keys.push(key2.trim());
        if (key3) keys.push(key3.trim());
        if (key4) keys.push(key4.trim());
    }
    return keys;
};`;
envHelper = envHelper.replace(/export const getGeminiKeys = \(\) => \{[\s\S]*?\};/, newEnvHelper);
fs.writeFileSync('api/envHelper.ts', envHelper);


// 2. Fix src/services/geminiService.ts
let geminiSvc = fs.readFileSync('src/services/geminiService.ts', 'utf8');
const newGeminiSvcKeys = `export function getGeminiKeys() {
  const keys = [];
  const getEnv = (name) => {
    try {
      if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
    } catch (e) {}
    try {
      // @ts-ignore
      if (import.meta && import.meta.env && import.meta.env[name]) return import.meta.env[name];
    } catch (e) {}
    return "";
  };

  const key1 = getEnv("VITE_GEMINI_API_KEY_1") || getEnv("GEMINI_API_KEY_1");
  const key2 = getEnv("VITE_GEMINI_API_KEY_2") || getEnv("GEMINI_API_KEY_2");
  const key3 = getEnv("VITE_GEMINI_API_KEY_3") || getEnv("GEMINI_API_KEY_3");
  const key4 = getEnv("VITE_GEMINI_API_KEY_4") || getEnv("GEMINI_API_KEY_4");

  if (key1) keys.push(key1.trim());
  if (key2) keys.push(key2.trim());
  if (key3) keys.push(key3.trim());
  if (key4) keys.push(key4.trim());
  
  return keys;
}`;
geminiSvc = geminiSvc.replace(/export function getGeminiKeys\(\) \{[\s\S]*?return keys;\n\}/, newGeminiSvcKeys);
fs.writeFileSync('src/services/geminiService.ts', geminiSvc);


// 3. Fix new GoogleGenAI initialization
const paths = ['api/chat.ts', 'api/chat/stream.ts', 'src/services/geminiService.ts'];
for (let p of paths) {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/new GoogleGenAI\(\{ apiKey: key\.trim\(\), httpOptions: \{ headers: \{ "x-goog-api-key": key\.trim\(\) \} \} \}\)/g, 
                            'new GoogleGenAI({ apiKey: key.trim() })');
  fs.writeFileSync(p, content);
}

// 4. Fix api/tts.ts
let ttsContent = fs.readFileSync('api/tts.ts', 'utf8');
ttsContent = ttsContent.replace(/const geminiKey = process\.env\.GEMINI_API_KEY;/, 
`const geminiKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4;`);
ttsContent = ttsContent.replace(/new GoogleGenAI\(\{ apiKey: geminiKey\.trim\(\), httpOptions: \{ headers: \{ "x-goog-api-key": geminiKey\.trim\(\) \} \} \}\)/,
                                'new GoogleGenAI({ apiKey: geminiKey.trim() })');
fs.writeFileSync('api/tts.ts', ttsContent);

console.log("All fixes applied");
