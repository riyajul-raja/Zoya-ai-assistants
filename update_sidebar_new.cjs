const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startIdx = content.indexOf('{isToolMenuOpen && ( <>');
const endIdx = content.indexOf('</AnimatePresence>', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx);
    
    const newBlock = `{isToolMenuOpen && ( <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                    onClick={() => setIsToolMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 w-[82%] max-w-[320px] bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 z-[100] flex flex-col shadow-2xl pointer-events-auto overflow-y-auto"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between p-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-violet-500/20 border border-white/10">
                          Z
                        </div>
                        <span className="text-[15px] font-serif font-medium text-white tracking-wide">Zoya</span>
                      </div>
                      <button onClick={() => setIsToolMenuOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="h-px w-full bg-white/10 shrink-0" />

                    {/* Menu Items */}
                    <div className="flex flex-col p-2 gap-1 overflow-y-auto">
                      <button className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left w-full group">
                        <div className="mt-0.5 text-neutral-400 group-hover:text-white transition-colors">
                          <Settings size={18} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-white tracking-wide group-hover:text-white transition-colors">Settings</span>
                          <span className="text-xs text-neutral-500 tracking-wide">Manage your preferences</span>
                        </div>
                      </button>
                      
                      <button className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left w-full group">
                        <div className="mt-0.5 text-neutral-400 group-hover:text-white transition-colors">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-white tracking-wide group-hover:text-white transition-colors">Personal</span>
                          <span className="text-xs text-neutral-500 tracking-wide">Your Name • Gemini • Music • YouTube</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
              </>)}
            `;
            
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Sidebar updated');
} else {
    console.log('Sidebar block not found');
}
