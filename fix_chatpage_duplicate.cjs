const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const insertPoint = `  const handleDeleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    localStorage.removeItem(\`zoya_chat_msgs_\${id}\`);
    if (activeChatId === id) {
      handleNewChat();
    }
  };`;

const replacement = `  const handleDeleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    localStorage.removeItem(\`zoya_chat_msgs_\${id}\`);
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  const handleDuplicateChat = (id: string) => {
    const chatToDuplicate = chats.find(c => c.id === id);
    if (!chatToDuplicate) return;
    
    const newId = Date.now().toString();
    const newChat = {
      ...chatToDuplicate,
      id: newId,
      title: chatToDuplicate.title + " (Copy)",
      timestamp: new Date()
    };
    
    // Copy messages
    const existingMsgs = localStorage.getItem(\`zoya_chat_msgs_\${id}\`);
    if (existingMsgs) {
      localStorage.setItem(\`zoya_chat_msgs_\${newId}\`, existingMsgs);
    }
    
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
  };`;

content = content.replace(insertPoint, replacement);

content = content.replace(
  'onDeleteChat={handleDeleteChat}',
  'onDeleteChat={handleDeleteChat}\n        onDuplicateChat={handleDuplicateChat}'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
