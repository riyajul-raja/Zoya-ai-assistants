const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="whitespace-pre-wrap break-words overflow-hidden">{msg.text}</div>`;
const replacement = `<div className="whitespace-pre-wrap break-words break-all overflow-hidden max-w-full">{msg.text}</div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
