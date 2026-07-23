const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldModelsArrayStart = `{[
                      { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "", icon: <GeminiIcon /> },`;
const oldModelsArrayEnd = `                      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "(Default)", icon: <GeminiIcon /> }
                    ].map((model) => (`

// Replacing the entire map call and array
const regex = /\{\[\s*\{ id: "gemini-3\.6-flash"[\s\S]*?\].map\(\(model\) => \(/;

const newModelsArray = `{[
                      { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "All-around help", icon: <GeminiIcon /> },
                      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", desc: "Fastest answers", icon: <GeminiIcon /> },
                      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", desc: "Balanced speed & intelligence", icon: <GeminiIcon /> },
                      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", desc: "Advanced maths and code", icon: <GeminiIcon /> },
                      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", desc: "Ultra-fast response engine", icon: <GeminiIcon /> },
                      { id: "gemini-3.0-flash-preview", name: "Gemini 3 Flash Preview", desc: "Next-gen experimental model", icon: <GeminiIcon /> },
                      { id: "gemini-pro-latest", name: "Gemini Pro Latest", desc: "Complex reasoning & deep analysis", icon: <GeminiIcon /> },
                      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Stable default engine", icon: <GeminiIcon /> }
                    ].map((model) => (`

if (regex.test(content)) {
  content = content.replace(regex, newModelsArray);
} else {
  console.log("Could not find models array using regex. Fallback.");
}

// Updating the rendering of the list item
const oldListItem = `<span className="font-medium tracking-wide">
                            {model.name} <span className="text-white/40 font-normal text-xs">{model.desc}</span>
                          </span>`;
const newListItem = `<div className="flex flex-col gap-0.5">
                            <span className="font-semibold tracking-wide text-white leading-tight">{model.name}</span>
                            <span className="text-white/40 font-normal text-[10px] leading-tight">{model.desc}</span>
                          </div>`;

content = content.replace(oldListItem, newListItem);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx UI");
