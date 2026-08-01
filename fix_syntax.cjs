const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');
content = content.replace('\\n\\nlet requestCount', '\n\nlet requestCount');
content = content.replace('\\n\\nexport async function', '\n\nexport async function');
fs.writeFileSync('src/services/geminiService.ts', content);
