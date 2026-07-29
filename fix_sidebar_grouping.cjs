const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

// Update grouping rendering
content = content.replace(
  /\{\/\* Chat List Area \*\/\}([\s\S]*?)<div className="h-px bg-white\/10 mx-4 shrink-0" \/>/m,
  `{/* Chat List Area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
              {isSearchMode && (
                <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 mb-4 mx-1">
                  <Search size={16} className="text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search Chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {renderChatList('Pinned Chats', <Pin size={14} />, pinnedChats)}
              
              {(recents.length > 0 || older.length > 0) && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-2 px-3">
                    <Clock size={14} />
                    Recents
                  </div>
                </div>
              )}
              {renderChatList('Today', null, unpinnedChats.filter(c => isSameDay(c.timestamp, today)))}
              {renderChatList('Yesterday', null, unpinnedChats.filter(c => isSameDay(c.timestamp, yesterday)))}
              {renderChatList('Older', null, older)}
              
              {chats.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                  <MessageSquare size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">No chats yet</p>
                </div>
              )}

              {searchQuery && filteredChats.length === 0 && (
                <div className="text-center py-10 text-neutral-500 text-sm">
                  No chats found for "{searchQuery}"
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 mx-4 shrink-0" />`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
