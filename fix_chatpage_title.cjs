const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const titleLogic = `      const title = messages.find(m => m.role === 'user')?.text?.slice(0, 30) || 'New Chat';`;

const improvedTitleLogic = `      const firstUserMsg = messages.find(m => m.role === 'user')?.text;
      let title = 'New Chat';
      if (firstUserMsg) {
        // Simple heuristic to extract a short title
        const words = firstUserMsg.split(/[\\s\\n]+/);
        // Take up to 4 words
        title = words.slice(0, 4).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim();
        if (title.length > 30) {
          title = title.substring(0, 30).trim() + "...";
        }
        // Capitalize words
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      if (!title) title = 'New Chat';`;

content = content.replace(titleLogic, improvedTitleLogic);

fs.writeFileSync('src/components/ChatPage.tsx', content);
