const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  `              {isSearchMode && (`,
  `              {/* Always visible search */}
              {true && (`
);

content = content.replace(
  `            {/* Search Button Footer */}
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
            </div>`,
  ``
);

// We can remove autoFocus from search input since it will be always there
content = content.replace(
  `                    autoFocus\n                    placeholder="Search Chats"`,
  `                    placeholder="Search Chats"`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
