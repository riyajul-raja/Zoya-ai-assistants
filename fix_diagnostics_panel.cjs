const fs = require('fs');
let content = fs.readFileSync('src/components/DiagnosticsPanel.tsx', 'utf8');

content = content.replace(/diagnosticsStore\.setConfigured\("gemini", config\.gemini \|\| clientEnv\.gemini\);/g, 'diagnosticsStore.setAllConfigured(!!(config.gemini || clientEnv.gemini));');
content = content.replace(/diagnosticsStore\.setConfigured\("gemini", clientEnv\.gemini\);/g, 'diagnosticsStore.setAllConfigured(!!clientEnv.gemini);');

// Update UI to display the model name and subtitle properly
content = content.replace(/<h3 className="text-base font-semibold text-white capitalize">{p\.provider\.replace\('huggingface', 'Hugging Face'\)}<\/h3>/g, '<h3 className="text-base font-semibold text-white capitalize">{p.modelName}</h3>');
content = content.replace(/<p className="text-xs text-white\/50 font-mono mt-1">{p\.modelName}<\/p>/g, '<p className="text-xs text-white/50 font-mono mt-1">{p.subtitle}</p>');

fs.writeFileSync('src/components/DiagnosticsPanel.tsx', content);
console.log("Updated DiagnosticsPanel.tsx");
