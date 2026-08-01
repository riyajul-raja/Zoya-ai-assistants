const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const startStr = `  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}`;
          
const endStr = `            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx + endStr.length);
    
    const newBlock = `  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-[80%] max-w-[320px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 z-[10000] flex flex-col shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
                  Z
                </div>
                <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer p-2 hover:bg-white/10 rounded-xl hyper-glass hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex items-center gap-4 p-4 rounded-[18px] hyper-glass transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer text-left w-full group"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <MessageSquare size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">New Chat</span>
                </div>
              </button>
            </div>

            {/* Chat List Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-hide">
              {isSearchMode && (
                <div className="flex items-center p-4 rounded-[18px] hyper-glass mb-4">
                  <Search size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search Chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-[15px] text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {renderChatList('Pinned Chats', <Pin size={16} />, pinnedChats)}
              
              {(recents.length > 0 || older.length > 0) && (
                <div className="mb-2 mt-2">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-neutral-400 px-2 tracking-wide uppercase">
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
                  <p className="text-[15px]">No chats yet</p>
                </div>
              )}

              {searchQuery && filteredChats.length === 0 && (
                <div className="text-center py-10 text-neutral-500 text-[15px]">
                  No chats found for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Search Button Footer */}
            <div className="p-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsSearchMode(!isSearchMode)}
                className="flex items-center gap-4 p-4 rounded-[18px] hyper-glass transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] cursor-pointer text-left w-full group"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <Search size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Search Chats</span>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}`;
    
    content = content.replace(originalBlock, newBlock);
    
    // Also update renderChatList to use the new glass look for items
    content = content.replace(
      /className={`group relative rounded-lg transition-colors cursor-pointer flex items-center justify-between p-3 hover:bg-white\/10 \${activeChatId === chat.id \? 'bg-white\/10' : ''}`}/g,
      "className={`group relative rounded-[18px] transition-all duration-300 cursor-pointer flex items-center justify-between p-4 hyper-glass hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-0.5 active:scale-[0.98] ${activeChatId === chat.id ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] bg-violet-500/10' : ''}`}"
    );

    // Update the inner text/titles
    content = content.replace(
      /className="text-sm font-medium text-white truncate"/g,
      'className="text-[15px] font-medium text-white/95 tracking-wide truncate"'
    );
    content = content.replace(
      /className="text-xs font-semibold text-neutral-400 mb-2 px-3 flex items-center gap-2"/g,
      'className="text-[13px] font-semibold text-neutral-400 mb-2 px-2 flex items-center gap-2 tracking-wide uppercase"'
    );

    fs.writeFileSync('src/components/ChatSidebar.tsx', content);
    console.log('Sidebar UI updated successfully.');
} else {
    console.log('Sidebar block not found.');
}
