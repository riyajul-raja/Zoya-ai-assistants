const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  'onDeleteChat: (id: string) => void;',
  'onDeleteChat: (id: string) => void;\n  onDuplicateChat?: (id: string) => void;'
);

content = content.replace(
  'onDeleteChat\n}: ChatSidebarProps',
  'onDeleteChat,\n  onDuplicateChat\n}: ChatSidebarProps'
);

const duplicateStub = `                            // We need to implement duplicate in App.tsx or just call a prop, but maybe we can just do it here if we pass onDuplicateChat
                            // Since we don't have onDuplicateChat, we'll just copy it to clipboard as text for now, or just leave it empty if we can't do it easily.
                            // Actually, I can pass a Duplicate Chat handler, but I'd need to modify ChatPage and App too.`;
const duplicateCall = `                            if (onDuplicateChat) onDuplicateChat(chat.id);
                            setActiveMenuId(null);`;
content = content.replace(duplicateStub, duplicateCall);

// Remove the "const newChatId = Date.now().toString(); const newTitle = chat.title + " (Copy)";" lines
content = content.replace(
  `                            const newChatId = Date.now().toString();
                            const newTitle = chat.title + " (Copy)";
                            if (onDuplicateChat) onDuplicateChat(chat.id);`,
  `                            if (onDuplicateChat) onDuplicateChat(chat.id);`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
