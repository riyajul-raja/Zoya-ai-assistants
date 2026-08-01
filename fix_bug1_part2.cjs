const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const oldSetChats = `        const existing = prev.find(c => c.id === currentId);
        if (existing) {
          return prev.map(c => c.id === currentId ? { ...c, title, preview, timestamp: new Date() } : c);
        } else {
          return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];
        }`;

const newSetChats = `        const existing = prev.find(c => c.id === currentId);
        if (existing) {
          const newTitle = (existing.title === 'New Chat' || !existing.title) ? title : existing.title;
          return prev.map(c => c.id === currentId ? { ...c, title: newTitle, preview, timestamp: new Date() } : c);
        } else {
          return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];
        }`;

content = content.replace(oldSetChats, newSetChats);
fs.writeFileSync('src/components/ChatPage.tsx', content);
