const fs = require('fs');
let code = fs.readFileSync('src/services/liveService.ts', 'utf8');

const regex = /constructor\(\) \{[\s\S]*?this\.ai = new GoogleGenAI\(\{[\s\S]*?\}\);/;

const getApiKeyFunc = `  getApiKey() {
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
    const apiKey = (
        getEnv("GEMINI_API_KEY") || getEnv("VITE_GEMINI_API_KEY") ||
        getEnv("GEMINI_API_KEY_1") || getEnv("VITE_GEMINI_API_KEY_1") ||
        getEnv("GEMINI_API_KEY_2") || getEnv("VITE_GEMINI_API_KEY_2") ||
        getEnv("GEMINI_API_KEY_3") || getEnv("VITE_GEMINI_API_KEY_3") ||
        getEnv("GEMINI_API_KEY_4") || getEnv("VITE_GEMINI_API_KEY_4") ||
        ""
    ).trim();
    if (!apiKey) throw new Error("API Key is missing in environment");
    return apiKey;
  }

  constructor() {
    const apiKey = this.getApiKey();
    this.ai = new GoogleGenAI({ apiKey });`;

code = code.replace(regex, getApiKeyFunc);

fs.writeFileSync('src/services/liveService.ts', code);
