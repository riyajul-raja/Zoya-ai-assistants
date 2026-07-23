const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the Gemini span correctly
content = content.replace(/<span className="text-xs font-medium tracking-wide">\s*Gemini\s*<\/span>/, 
  '<span className="text-xs font-medium tracking-wide">\n                {selectedModel === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : selectedModel === "gemini-2.5-flash-lite" ? "Gemini 2.5 Flash-Lite" : selectedModel === "gemini-3.0-flash" ? "Gemini 3 Flash" : "Gemini Pro"}\n              </span>');

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx text");
