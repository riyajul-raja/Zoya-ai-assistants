const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /console\.error\("Update check failed", err\);/g;
code = code.replace(regex, "// Silently ignore update check errors in preview environments");

fs.writeFileSync('src/App.tsx', code);
