const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

code = code.replace(
  /const cleanLabelValue = \(label: string\) => {/,
  `const cleanLabelValue = (label: string) => {
    setIsComposeOpen(false);
    setSelectedEmail(null);`
);

fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched cleanLabelValue');
