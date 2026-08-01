const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// Update ChatPageProps
content = content.replace(
  '  textareaRef: React.RefObject<HTMLTextAreaElement>;',
  '  handleRegenerateMessage: (msgId: string) => void;\n  textareaRef: React.RefObject<HTMLTextAreaElement>;'
);

content = content.replace(
  '  setMessages,\n  textareaRef,',
  '  setMessages,\n  handleRegenerateMessage,\n  textareaRef,'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
