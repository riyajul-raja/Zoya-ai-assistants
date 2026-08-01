const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// I will just disable isPlusMenuOpen completely in App.tsx by replacing isPlusMenuOpen && with false &&
content = content.replace('{isPlusMenuOpen && ( <>', '{false && ( <>');
fs.writeFileSync('src/App.tsx', content);
