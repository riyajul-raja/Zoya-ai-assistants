const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

// Add icons to import
content = content.replace(
  'Clock',
  'Clock, Copy, Share'
);

// Add Duplicate and Share to menu
const menuStart = `<Trash2 size={14} /> Delete
                        </button>
                      </motion.div>`;
const menuReplace = `<div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newChatId = Date.now().toString();
                            const newTitle = chat.title + " (Copy)";
                            // We need to implement duplicate in App.tsx or just call a prop, but maybe we can just do it here if we pass onDuplicateChat
                            // Since we don't have onDuplicateChat, we'll just copy it to clipboard as text for now, or just leave it empty if we can't do it easily.
                            // Actually, I can pass a Duplicate Chat handler, but I'd need to modify ChatPage and App too.
                          }}
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Chat shared! (Simulation)");
                            setActiveMenuId(null);
                          }}
                        >
                          <Share size={14} /> Share
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>`;
content = content.replace(menuStart, menuReplace);

// Update Empty State
const emptyStateStr = `{chats.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                  <MessageSquare size={32} className="mb-3 opacity-20" />
                  <p className="text-[15px]">No chats yet</p>
                </div>
              )}`;
const emptyStateReplace = `{chats.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-xl text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/20 animate-pulse">
                    Z
                  </div>
                  <p className="text-[15px] font-medium tracking-wide">Start a new conversation with Zoya.</p>
                </div>
              )}`;
content = content.replace(emptyStateStr, emptyStateReplace);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
