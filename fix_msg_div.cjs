const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const divStr = `                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={\`flex flex-col max-w-[90%] md:max-w-[85%] min-h-0 \${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start group"
                  }\`}`;

const newDivStr = `                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={\`flex flex-col max-w-[90%] md:max-w-[85%] min-h-0 \${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start group"
                  }\`}
                  onTouchStart={() => msg.sender !== "user" && !msg.isError && startMsgLongPress(msg.id)}
                  onTouchEnd={cancelMsgLongPress}
                  onTouchMove={cancelMsgLongPress}
                  onMouseDown={() => msg.sender !== "user" && !msg.isError && startMsgLongPress(msg.id)}
                  onMouseUp={cancelMsgLongPress}
                  onMouseLeave={cancelMsgLongPress}
                  onContextMenu={(e) => {
                    if (msg.sender !== "user" && !msg.isError) {
                      e.preventDefault();
                      setActiveMobileMenuId(msg.id);
                    }
                  }}
                >`;

content = content.replace(divStr, newDivStr);

const actionStr = `<div className="relative flex items-center gap-1.5 mt-2 ml-3 opacity-0 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 translate-y-1 lg:group-hover:translate-y-0 active-mobile-menu">`;
const newActionStr = `<div className={\`relative flex items-center gap-1.5 mt-2 ml-3 transition-all duration-300 \${activeMobileMenuId === msg.id ? 'opacity-100 translate-y-0' : 'opacity-0 lg:opacity-0 lg:group-hover:opacity-100 translate-y-1 lg:group-hover:translate-y-0'}\`} onClick={(e) => e.stopPropagation()}>`;

content = content.replace(actionStr, newActionStr);

fs.writeFileSync('src/components/ChatPage.tsx', content);
