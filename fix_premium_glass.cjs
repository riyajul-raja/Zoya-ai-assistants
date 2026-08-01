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
                    className="fixed inset-y-0 left-0 w-[82%] max-w-[320px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 z-[100] flex flex-col shadow-2xl pointer-events-auto overflow-y-auto"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between px-6 py-5 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
                          Z
                        </div>
                        <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
                      </div>
                      <button onClick={() => setIsToolMenuOpen(false)} className="text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer p-2 hover:bg-white/10 rounded-xl hyper-glass hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <X size={20} />
                      </button>
                    </div>

                    {/* Menu Items */}
                    <div className="flex flex-col p-4 gap-3 overflow-y-auto mt-2">
                      <motion.button 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => {
                          setIsSettingsPageOpen(true);
                          setIsToolMenuOpen(false);
                        }}
                        className="flex items-center justify-between p-4 rounded-[18px] hyper-glass transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer text-left w-full group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Settings size={20} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Settings</span>
                            <span className="text-[11px] text-neutral-400 tracking-wide">Manage preferences</span>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </motion.button>
                    </div>
                  </motion.div>
              </>)}
              
              {isSettingsPageOpen && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-3xl z-[200] flex flex-col pointer-events-auto"
                >
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
                    <button 
                      onClick={() => {
                        setIsSettingsPageOpen(false);
                        setIsToolMenuOpen(true);
                      }}
                      className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer group px-4 py-2.5 hyper-glass rounded-xl hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.96]"
                    >
                      <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-sm font-medium tracking-wide">Back</span>
                    </button>
                    <span className="text-base font-serif font-medium text-white tracking-widest uppercase">Settings</span>
                    <div className="w-[88px]"></div> {/* Spacer for centering (matches button width) */}
                  </div>
                  
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center"
                  >
                    <div className="w-full max-w-2xl flex flex-col gap-4">
                      
                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <User size={22} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Personal</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Your Name • Gemini • Music • YouTube</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>

                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Layers size={22} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Appearance</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Theme • Visuals • Layout</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>

                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Mail size={22} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Notifications</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Alerts • Sounds • Badges</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>
                      
                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Lock size={22} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">API Keys</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Manage external services</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>

                      <button className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Sparkles size={22} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">About Zoya</span>
                            <span className="text-[12px] text-neutral-400 tracking-wide">Version • Legal • Updates</span>
                          </div>
                        </div>
                        <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            `;
            
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Sidebar updated');
} else {
    console.log('Sidebar block not found');
}
