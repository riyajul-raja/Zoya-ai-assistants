import fs from 'fs/promises';

async function updateStore() {
  let content = await fs.readFile('src/services/diagnosticsStore.ts', 'utf-8');
  content = content.replace(/export type Provider = "gemini-3.6-flash" \| "gemini-3.5-flash-lite" \| "gemini-3.5-flash" \| "gemini-3.1-pro-preview" \| "gemini-3.1-flash-lite" \| "gemini-3-flash-preview" \| "gemini-pro-latest" \| "gemini-2.5-flash";/, 'export type Provider = "gemini-2.5-flash";');
  
  // Also remove the initial state objects that are not gemini-2.5-flash
  content = content.replace(/"gemini-3\.6-flash": \{[\s\S]*?"gemini-3\.5-flash-lite": \{[\s\S]*?"gemini-3\.5-flash": \{[\s\S]*?"gemini-3\.1-pro-preview": \{[\s\S]*?"gemini-3\.1-flash-lite": \{[\s\S]*?"gemini-3-flash-preview": \{[\s\S]*?"gemini-pro-latest": \{[\s\S]*?"gemini-2\.5-flash": \{/g, '"gemini-2.5-flash": {');
  await fs.writeFile('src/services/diagnosticsStore.ts', content);
}

async function updateApp() {
  let content = await fs.readFile('src/App.tsx', 'utf-8');
  // Remove fallback comment
  content = content.replace(/\/\/ But if we have an attached image, fallback to standard REST API with gemini-3\.1-pro-preview/, '// Standard REST API is now unified');
  
  content = content.replace(/\{selectedModel === "gemini-3\.6-flash" \? "Gemini 3\.6 Flash" : selectedModel === "gemini-3\.5-flash-lite" \? "Gemini 3\.5 Flash Lite" : selectedModel === "gemini-3\.5-flash" \? "Gemini 3\.5 Flash" : selectedModel === "gemini-3\.1-pro-preview" \? "Gemini 3\.1 Pro Preview" : selectedModel === "gemini-3\.1-flash-lite" \? "Gemini 3\.1 Flash Lite" : selectedModel === "gemini-3-flash-preview" \? "Gemini 3 Flash Preview" : selectedModel === "gemini-pro-latest" \? "Gemini Pro Latest" : "Gemini 2\.5 Flash"\}/g, '{selectedModel === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : "Gemini 2.5 Flash"}');
  
  content = content.replace(/\{ id: "gemini-3\.6-flash"[\s\S]*?\{ id: "gemini-2\.5-flash", name: "Gemini 2\.5 Flash", desc: "Stable default engine", icon: <GeminiIcon \/> \}/g, '{ id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Stable default engine", icon: <GeminiIcon /> }');
  
  await fs.writeFile('src/App.tsx', content);
}

await updateStore();
await updateApp();
