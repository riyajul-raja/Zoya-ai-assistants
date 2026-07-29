const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

// Change the div rendering the chat card to motion.div
const renderStart = `          {chatList.map(chat => (
            <div 
              key={chat.id}`;

const renderReplace = `          {chatList.map((chat, index) => (
            <motion.div 
              key={chat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}`;

content = content.replace(renderStart, renderReplace);
content = content.replace(
  `              onClick={() => onSelectChat(chat.id)}
            >`,
  `              onClick={() => onSelectChat(chat.id)}
            >`
);

content = content.replace(
  `            </div>
          ))}
        </div>`,
  `            </motion.div>
          ))}
        </div>`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
