const fs = require('fs');
let content = fs.readFileSync('src/services/intentService.ts', 'utf8');

content = content.replace(
  /\/\/ 1\. Open Commands[\s\S]*?\/\/ 2\. Greetings/,
  '// 1. Open Commands (Handled by processCommand in App.tsx)\n\n  // 2. Greetings'
);

fs.writeFileSync('src/services/intentService.ts', content);
