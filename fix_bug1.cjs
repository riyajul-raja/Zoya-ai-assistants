const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const oldState = `  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);`;

const newState = `  const [activeChatId, setActiveChatId] = useState<string | undefined>(() => {
    return localStorage.getItem('zoya_active_chat_id') || undefined;
  });

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('zoya_active_chat_id', activeChatId);
    } else {
      localStorage.removeItem('zoya_active_chat_id');
    }
  }, [activeChatId]);`;

content = content.replace(oldState, newState);

// Also BUG 7: Auto Title (Generate ONLY ONCE)
// Right now, if I chat more, firstUserMsg stays the same, so it always re-computes title.
// Actually, it overwrites the title every time because:
// return prev.map(c => c.id === currentId ? { ...c, title, preview, timestamp: new Date() } : c);
// Let's modify the map to only set title if it was 'New Chat', or just keep existing title.
const oldSetChats = `            const existing = prev.find(c => c.id === currentId);
        if (existing) {
          return prev.map(c => c.id === currentId ? { ...c, title, preview, timestamp: new Date() } : c);
        } else {
          return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];
        }`;

const newSetChats = `            const existing = prev.find(c => c.id === currentId);
        if (existing) {
          // Only update title if it was previously empty or generic 'New Chat'
          const newTitle = (existing.title === 'New Chat' || !existing.title) ? title : existing.title;
          return prev.map(c => c.id === currentId ? { ...c, title: newTitle, preview, timestamp: new Date() } : c);
        } else {
          return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];
        }`;

content = content.replace(oldSetChats, newSetChats);

fs.writeFileSync('src/components/ChatPage.tsx', content);
