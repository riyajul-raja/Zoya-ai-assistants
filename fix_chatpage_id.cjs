const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `const currentId = activeChatId || 'default-chat';`,
  `const currentId = activeChatId || Date.now().toString();`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
