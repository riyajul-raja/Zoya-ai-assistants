const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

code = code.replace(/maxResults=5/g, 'maxResults=20');
fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched maxResults');
