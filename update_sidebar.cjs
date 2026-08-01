const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find the isToolMenuOpen block
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
                    className="fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-xl border-r border-white/10 p-6 z-[100] flex flex-col shadow-2xl pointer-events-auto overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
                          <span className="text-white font-semibold text-lg">P</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white tracking-wide">Personal</span>
                          <span className="text-[10px] text-white/50 tracking-wider">Your Name • Gemini • Music • YouTube</span>
                        </div>
                      </div>
                      <button onClick={() => setIsToolMenuOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer p-1">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3">
                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-left w-full group">
                          <span className="text-white/70 group-hover:text-white transition-colors">
                            <Users size={18} />
                          </span>
                          <span className="text-sm text-white/80 group-hover:text-white font-medium tracking-wide">Personal</span>
                        </button>
                      </div>
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
