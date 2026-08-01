const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'Array.from(files).forEach((file) => {',
  'Array.from(files).forEach((file: File) => {'
);

fs.writeFileSync('src/App.tsx', content);
