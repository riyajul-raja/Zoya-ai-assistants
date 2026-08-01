const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const bugged = `    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);`;

const fixed = `    setChats(prev => [newChat, ...prev]);
    if (existingMsgs) {
      setMessages(JSON.parse(existingMsgs));
    }
    setActiveChatId(newId);`;

content = content.replace(bugged, fixed);
fs.writeFileSync('src/components/ChatPage.tsx', content);
