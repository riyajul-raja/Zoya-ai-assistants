const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const startStr = `      {/* Top bar: Left (Menu), Right (Close) */}`;
const endStr = `        </button>
      </div>`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx + endStr.length);
    
    const newBlock = `      {/* Top bar: Left (Menu), Right (Close) */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0 hyper-glass z-50 sticky top-0 rounded-b-[24px]">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-xl hyper-glass hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white/70 hover:text-white transition-all duration-300 cursor-pointer group"
        >
          <Menu size={20} className="group-hover:scale-105 transition-transform" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
            Z
          </div>
          <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
        </div>
        
        <button
          type="button"
          onClick={() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (err) {}
            }
            setShowChat(false);
          }}
          className="p-2 rounded-xl hyper-glass hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white/70 hover:text-white transition-all duration-300 cursor-pointer group"
          title="Close Chat"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>`;
      
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync('src/components/ChatPage.tsx', content);
    console.log('Top bar updated successfully.');
} else {
    console.log('Top bar block not found.');
}
