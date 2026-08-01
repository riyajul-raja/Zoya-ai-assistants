const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  'return [...prev, { id: currentId, title, preview, timestamp: new Date(), pinned: false }];',
  'return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
