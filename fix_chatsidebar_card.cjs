const fs = require('fs');

let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const originalBlock = `              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white truncate pr-2">{chat.title}</h4>
                  <span className="text-[10px] text-neutral-500 shrink-0">{formatTime(chat.timestamp)}</span>
                </div>
                <p className="text-xs text-neutral-400 truncate">{chat.preview}</p>
              </div>`;

const newBlock = `              <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-neutral-400 shrink-0 mt-0.5">
                  <MessageSquare size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[14px] font-medium text-white/95 truncate pr-2 tracking-wide">{chat.title}</h4>
                    <span className="text-[11px] font-medium text-neutral-500 shrink-0">{formatTime(chat.timestamp)}</span>
                  </div>
                  <p className="text-[12px] text-neutral-400 truncate leading-relaxed">{chat.preview}</p>
                </div>
              </div>`;

content = content.replace(originalBlock, newBlock);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
