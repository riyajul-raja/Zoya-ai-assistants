const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="whitespace-pre-wrap">{msg.text}</div>`;
const replacement = `<div className="whitespace-pre-wrap break-words overflow-hidden">{msg.text}</div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
