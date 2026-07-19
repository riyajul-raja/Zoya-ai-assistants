const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseService.ts', 'utf8');
code = code.replace(
  /const defaultScopes = 'https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly https:\/\/www\.googleapis\.com\/auth\/contacts\.readonly';/,
  "const defaultScopes = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/contacts.readonly';"
);
fs.writeFileSync('src/services/firebaseService.ts', code);
