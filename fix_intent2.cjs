const fs = require('fs');
let content = fs.readFileSync('src/services/intentService.ts', 'utf8');

content = content.replace(/\\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/services/intentService.ts', content);
