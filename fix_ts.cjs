const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/URL\.createObjectURL\(img\)/g, 'URL.createObjectURL(img as Blob)');

fs.writeFileSync('src/App.tsx', content);
