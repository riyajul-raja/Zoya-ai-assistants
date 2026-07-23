const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update useState
content = content.replace(/useState\("gemini"\);/, 'useState("gemini-2.5-flash");');

// Update the selectedModel comparison for liveSession
content = content.replace(/selectedModel === "gemini"/g, 'selectedModel.includes("gemini")');

// Update the models array
const oldModelsArray = `{[
                      { id: "gemini", name: "Gemini", desc: "(Default)", icon: <GeminiIcon /> }
                    ].map((model) => (`;

const newModelsArray = `{[
                      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "(Default)", icon: <GeminiIcon /> },
                      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", desc: "(Fast)", icon: <GeminiIcon /> },
                      { id: "gemini-3.0-flash", name: "Gemini 3 Flash", desc: "(Preview)", icon: <GeminiIcon /> },
                      { id: "gemini-1.5-pro", name: "Gemini Pro", desc: "(Advanced)", icon: <GeminiIcon /> }
                    ].map((model) => (`;

content = content.replace(oldModelsArray, newModelsArray);

// Update selected model text in the UI
content = content.replace(/Gemini<\/span>/, '{selectedModel === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : selectedModel === "gemini-2.5-flash-lite" ? "Gemini 2.5 Flash-Lite" : selectedModel === "gemini-3.0-flash" ? "Gemini 3 Flash" : "Gemini Pro"}</span>');

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx models array");
