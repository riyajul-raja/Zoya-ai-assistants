const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

const oldLoading = `    setIsLoading(true);
    try {
      let q = \`label:\${label}\`;`;

const newLoading = `    setIsLoading(true);
    setEmails([]);
    try {
      let q = \`label:\${label}\`;`;

code = code.replace(oldLoading, newLoading);
fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched loading state');
