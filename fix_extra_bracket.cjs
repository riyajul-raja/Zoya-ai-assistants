const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `                  onContextMenu={(e) => {
                    if (msg.sender !== "user" && !msg.isError) {
                      e.preventDefault();
                      setActiveMobileMenuId(msg.id);
                    }
                  }}
                >
                >`,
  `                  onContextMenu={(e) => {
                    if (msg.sender !== "user" && !msg.isError) {
                      e.preventDefault();
                      setActiveMobileMenuId(msg.id);
                    }
                  }}
                >`
);
fs.writeFileSync('src/components/ChatPage.tsx', content);
