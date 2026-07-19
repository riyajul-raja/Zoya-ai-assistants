const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

code = code.replace(
  /maxResults=30/g,
  "maxResults=5"
);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log('Patched calendar maxResults');
