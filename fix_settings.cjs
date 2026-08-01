const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('ChevronRight,')) {
    content = content.replace('ArrowRight,', 'ArrowRight, ChevronRight, ArrowLeft,');
}

// Add state for isSettingsPageOpen
const stateMatch = content.match(/const \[isToolMenuOpen, setIsToolMenuOpen\] = useState\(false\);/);
if (stateMatch && !content.includes('isSettingsPageOpen')) {
    content = content.replace(stateMatch[0], stateMatch[0] + '\n  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(false);');
}

// Update the tool menu to only show Settings and when clicking it, open the Settings Page
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
                    <div className="flex items-center justify-between px-5 py-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-white/10">
                          Z
                        </div>
                        <span className="text-[15px] font-serif font-medium text-white/90 tracking-wide">Zoya</span>
                      </div>
                      <button onClick={() => setIsToolMenuOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="h-px w-full bg-white/10 shrink-0" />

                    {/* Menu Items */}
                    <div className="flex flex-col p-3 gap-1 overflow-y-auto mt-2">
                      <button 
                        onClick={() => {
                          setIsSettingsPageOpen(true);
                          setIsToolMenuOpen(false);
                        }}
                        className="flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left w-full group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-neutral-400 group-hover:text-white transition-colors shrink-0">
                            <Settings size={20} />
                          </div>
                          <span className="text-sm font-medium text-white/90 tracking-wide group-hover:text-white transition-colors">Settings</span>
                        </div>
                        <ChevronRight size={18} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                  </motion.div>
              </>)}
              
              {isSettingsPageOpen && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-0 bg-[#0a0a0a] z-[200] flex flex-col pointer-events-auto"
                >
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <button 
                      onClick={() => {
                        setIsSettingsPageOpen(false);
                        setIsToolMenuOpen(true);
                      }}
                      className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors cursor-pointer group"
                    >
                      <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-sm font-medium">Back</span>
                    </button>
                    <span className="text-base font-medium text-white tracking-wide">Settings</span>
                    <div className="w-10"></div> {/* Spacer for centering */}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                    <div className="w-full max-w-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer w-full group border border-white/5 bg-white/5">
                        <div className="text-neutral-400 group-hover:text-white transition-colors shrink-0 bg-white/10 p-2.5 rounded-full">
                          <User size={22} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-medium text-white/90 tracking-wide group-hover:text-white transition-colors">Personal</span>
                          <span className="text-[12px] text-neutral-500 tracking-wide">Your Name • Gemini • Music • YouTube</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            `;
            
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Sidebar updated');
} else {
    console.log('Sidebar block not found');
}
