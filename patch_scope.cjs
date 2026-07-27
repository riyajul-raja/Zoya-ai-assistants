const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseService.ts', 'utf8');
code = code.replace('https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events');
fs.writeFileSync('src/services/firebaseService.ts', code);
console.log("Patched scope in firebaseService.ts");
