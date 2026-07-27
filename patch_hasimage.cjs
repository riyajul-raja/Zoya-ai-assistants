const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const target = `const hasImage = !!((Array.isArray(msg.images) && msg.images.length > 0) || msg.image || (msg as any).imageUrl);`;
const replacement = `const hasImage = !!((Array.isArray(msg.images) && msg.images.length > 0) || msg.image || (msg as any).imageUrl || msg.generatedImageUrl);`;
code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
