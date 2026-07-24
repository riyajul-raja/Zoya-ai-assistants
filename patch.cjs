const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');
code = code.replace(/export function getGeminiKeys\(\) \{[\s\S]*?return keys;\n\}/, `export function getGeminiKeys() {
  const keys: string[] = [];
  const getEnv = (name: string) => {
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
  
  const isValidKey = (k: string | undefined) => {
      if (!k) return false;
      const t = k.trim();
      return t.startsWith("AQ.") || t.startsWith("AIza");
  };

  if (isValidKey(key1)) keys.push(key1!.trim());
  if (isValidKey(key2)) keys.push(key2!.trim());
  if (isValidKey(key3)) keys.push(key3!.trim());
  if (isValidKey(key4)) keys.push(key4!.trim());

  const keyDef = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY");
  if (isValidKey(keyDef) && !keys.includes(keyDef!.trim())) keys.push(keyDef!.trim());
      
  return keys;
}`);
fs.writeFileSync('src/services/geminiService.ts', code);
