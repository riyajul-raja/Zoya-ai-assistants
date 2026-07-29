const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/img instanceof File \|\| img instanceof Blob/g, '(img as any) instanceof File || (img as any) instanceof Blob');

fs.writeFileSync('src/App.tsx', content);
