const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

const rightPaneHeader = `<div className="md:hidden mb-2">
              <button onClick={() => { setIsComposeOpen(false); setSelectedEmail(null); }} className="text-white/70 hover:text-white flex items-center gap-1 font-mono text-xs">
                <ChevronRight className="rotate-180" size={14} /> Back
              </button>
            </div>`;

const newRightPaneHeader = `<div className="mb-2 flex justify-between items-center w-full">
              <button onClick={() => { setIsComposeOpen(false); setSelectedEmail(null); }} className="md:hidden text-white/70 hover:text-white flex items-center gap-1 font-mono text-xs">
                <ChevronRight className="rotate-180" size={14} /> Back
              </button>
              <button onClick={() => { setIsComposeOpen(false); setSelectedEmail(null); }} className="hidden md:flex ml-auto p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Close">
                <X size={16} />
              </button>
            </div>`;

code = code.replace(rightPaneHeader, newRightPaneHeader);
fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched right pane close button');
