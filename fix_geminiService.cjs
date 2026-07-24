const fs = require('fs');

const geminiSvcPath = 'src/services/geminiService.ts';
let geminiSvc = fs.readFileSync(geminiSvcPath, 'utf8');

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
  const keyDef = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY");

  if (key1) keys.push(key1.trim());
  if (key2) keys.push(key2.trim());
  if (key3) keys.push(key3.trim());
  if (key4) keys.push(key4.trim());
  if (keyDef && !keys.includes(keyDef.trim())) keys.push(keyDef.trim());
  
  return keys;
}`;
geminiSvc = geminiSvc.replace(/export function getGeminiKeys\(\) \{[\s\S]*?return keys;\n\}/, newGeminiSvcKeys);
fs.writeFileSync(geminiSvcPath, geminiSvc);
console.log("Updated src/services/geminiService.ts");
