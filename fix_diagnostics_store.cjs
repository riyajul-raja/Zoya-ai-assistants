const fs = require('fs');
let content = fs.readFileSync('src/services/diagnosticsStore.ts', 'utf8');

// replace Provider type
content = content.replace(/export type Provider = "gemini" \| "groq" \| "huggingface";/, 'export type Provider = "gemini";');

// replace default state
const oldState = `const initialState: DiagnosticsState = {
  gemini: { provider: "gemini", modelName: "gemini-2.5-flash", status: "idle", latencyMs: 0, isConfigured: false },
  groq: { provider: "groq", modelName: "llama-3.1-8b", status: "idle", latencyMs: 0, isConfigured: false },
  huggingface: { provider: "huggingface", modelName: "phi-3.5-mini", status: "idle", latencyMs: 0, isConfigured: false },
};`;

const newState = `const initialState: DiagnosticsState = {
  gemini: { provider: "gemini", modelName: "gemini-2.5-flash", status: "idle", latencyMs: 0, isConfigured: false },
};`;

content = content.replace(oldState, newState);
fs.writeFileSync('src/services/diagnosticsStore.ts', content);
console.log("Fixed diagnosticsStore.ts");
