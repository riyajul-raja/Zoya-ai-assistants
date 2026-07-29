const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const brokenSection = `                        <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDuplicateChat) onDuplicateChat(chat.id);
                            setActiveMenuId(null);
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
                        </button>`;

const fixedSection = `                        <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDuplicateChat) onDuplicateChat(chat.id);
                            setActiveMenuId(null);
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
                        </button>`;

content = content.replace(brokenSection, fixedSection);
fs.writeFileSync('src/components/ChatSidebar.tsx', content);
