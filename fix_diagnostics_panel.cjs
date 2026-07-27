const fs = require('fs');
let content = fs.readFileSync('src/components/DiagnosticsPanel.tsx', 'utf8');

content = content.replace(/diagnosticsStore\.setConfigured\("groq", config\.groq \|\| clientEnv\.groq\);\n/g, '');
content = content.replace(/diagnosticsStore\.setConfigured\("huggingface", config\.huggingface \|\| clientEnv\.hf\);\n/g, '');

content = content.replace(/diagnosticsStore\.setConfigured\("groq", clientEnv\.groq\);\n/g, '');
content = content.replace(/diagnosticsStore\.setConfigured\("huggingface", clientEnv\.hf\);\n/g, '');

fs.writeFileSync('src/components/DiagnosticsPanel.tsx', content);
console.log("Fixed DiagnosticsPanel.tsx");
