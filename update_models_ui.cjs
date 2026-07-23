const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The new span
const oldSpan = `<span className="text-xs font-medium tracking-wide">
                {selectedModel === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : selectedModel === "gemini-2.5-flash-lite" ? "Gemini 2.5 Flash-Lite" : selectedModel === "gemini-3.0-flash" ? "Gemini 3 Flash" : "Gemini Pro"}
              </span>`;

const newSpan = `<span className="text-xs font-medium tracking-wide">
                {selectedModel === "gemini-3.6-flash" ? "Gemini 3.6 Flash" : selectedModel === "gemini-3.5-flash-lite" ? "Gemini 3.5 Flash Lite" : selectedModel === "gemini-3.5-flash" ? "Gemini 3.5 Flash" : selectedModel === "gemini-3.1-pro-preview" ? "Gemini 3.1 Pro Preview" : selectedModel === "gemini-3.1-flash-lite" ? "Gemini 3.1 Flash Lite" : selectedModel === "gemini-3.0-flash-preview" ? "Gemini 3 Flash Preview" : selectedModel === "gemini-pro-latest" ? "Gemini Pro Latest" : "Gemini 2.5 Flash"}
              </span>`;

content = content.replace(oldSpan, newSpan);

// The new models array
const oldModelsArray = `{[
                      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "(Default)", icon: <GeminiIcon /> },
                      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", desc: "(Fast)", icon: <GeminiIcon /> },
                      { id: "gemini-3.0-flash", name: "Gemini 3 Flash", desc: "(Preview)", icon: <GeminiIcon /> },
                      { id: "gemini-1.5-pro", name: "Gemini Pro", desc: "(Advanced)", icon: <GeminiIcon /> }
                    ].map((model) => (`

const newModelsArray = `{[
                      { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-3.0-flash-preview", name: "Gemini 3 Flash Preview", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-pro-latest", name: "Gemini Pro Latest", desc: "", icon: <GeminiIcon /> },
                      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "(Default)", icon: <GeminiIcon /> }
                    ].map((model) => (`

content = content.replace(oldModelsArray, newModelsArray);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx with new models");
