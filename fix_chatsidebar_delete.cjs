const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const anchor = `                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setActiveMenuId(null);
                          }}`;
                          
const replacement = `                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this chat?")) {
                              onDeleteChat(chat.id);
                            }
                            setActiveMenuId(null);
                          }}`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/ChatSidebar.tsx', content);
