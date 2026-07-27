const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

code = code.replace(/no-scrollbar/g, 'scrollbar-hide');

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched scrollbar");
