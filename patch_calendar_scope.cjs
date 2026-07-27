const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseService.ts', 'utf8');
code = code.replace(
  /const defaultScopes = 'https:\/\/www\.googleapis\.com\/auth\/gmail\.modify https:\/\/www\.googleapis\.com\/auth\/contacts\.readonly';/,
  "const defaultScopes = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar.readonly';"
);
fs.writeFileSync('src/services/firebaseService.ts', code);
console.log('Patched calendar scope');
