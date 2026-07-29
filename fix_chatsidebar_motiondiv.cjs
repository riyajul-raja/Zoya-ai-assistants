const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const anchor = `              onClick={() => onSelectChat(chat.id)}`;
const replacement = `              onClick={(e) => {
                if (Date.now() - lastLongPressRef.current < 500) {
                  e.preventDefault();
                  return;
                }
                onSelectChat(chat.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setActiveMenuId(chat.id);
              }}
              onTouchStart={() => startLongPress(chat.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onMouseDown={() => startLongPress(chat.id)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/ChatSidebar.tsx', content);
