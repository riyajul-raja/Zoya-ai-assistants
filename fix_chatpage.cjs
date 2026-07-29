const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// 1. Remove long press state & hooks
const oldStateBlock = `  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);
  const msgLongPressTimer = useRef<NodeJS.Timeout | null>(null);

  const startMsgLongPress = (id: string) => {
    if (msgLongPressTimer.current) clearTimeout(msgLongPressTimer.current);
    msgLongPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) try { navigator.vibrate(50); } catch (e) {}
      setActiveMobileMenuId(id);
    }, 500);
  };
  const cancelMsgLongPress = () => {
    if (msgLongPressTimer.current) {
      clearTimeout(msgLongPressTimer.current);
      msgLongPressTimer.current = null;
    }
  };
  
  useEffect(() => {
    const handleClickOutside = () => setActiveMobileMenuId(null);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);`;

const newStateBlock = `  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);`;
content = content.replace(oldStateBlock, newStateBlock);


// 2. Remove long press event handlers from msg div
content = content.replace(
  `                  onTouchStart={() => msg.sender !== "user" && !msg.isError && startMsgLongPress(msg.id)}
                  onTouchEnd={cancelMsgLongPress}
                  onTouchMove={cancelMsgLongPress}
                  onMouseDown={() => msg.sender !== "user" && !msg.isError && startMsgLongPress(msg.id)}
                  onMouseUp={cancelMsgLongPress}
                  onMouseLeave={cancelMsgLongPress}
                  onContextMenu={(e) => {
                    if (msg.sender !== "user" && !msg.isError) {
                      e.preventDefault();
                      setActiveMobileMenuId(msg.id);
                    }
                  }}`,
  ``
);

// 3. Update the actions row to match requirements
const oldActionsBlock = `                  {/* Actions for Assistant */}
                  {msg.sender !== "user" && !msg.isError && (
                    <div className={\`relative flex items-center gap-1.5 mt-2 ml-3 transition-all duration-300 \${activeMobileMenuId === msg.id ? 'opacity-100 translate-y-0' : 'opacity-0 lg:opacity-0 lg:group-hover:opacity-100 translate-y-1 lg:group-hover:translate-y-0'}\`} onClick={(e) => e.stopPropagation()}>
                      
                      <AnimatePresence>
                        {copiedMsgId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            className="absolute -top-8 left-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#1a0509]/90 backdrop-blur-xl border border-red-500/20 shadow-[0_4px_20px_rgba(220,38,38,0.15)] rounded-full text-xs font-medium text-white/90 z-10"
                          >
                            <span className="text-red-400">✓</span> Copied
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleCopy(msg.id, msg.text || '')} className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Copy">
                        <Copy size={15} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleReadAloud(msg.text || '')} className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Read Aloud">
                        <Volume2 size={15} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleRegenerateMessage(msg.id)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Regenerate">
                        <RefreshCw size={15} />
                      </motion.button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'like')} className={\`p-1.5 rounded-md transition-colors cursor-pointer \${msg.feedback === 'like' ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 hover:text-white hover:bg-white/10'}\`} title="Good response">
                        <ThumbsUp size={15} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'dislike')} className={\`p-1.5 rounded-md transition-colors cursor-pointer \${msg.feedback === 'dislike' ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 hover:text-white hover:bg-white/10'}\`} title="Bad response">
                        <ThumbsDown size={15} />
                      </motion.button>
                    </div>
                  )}`;

const newActionsBlock = `                  {/* Actions for Assistant */}
                  {msg.sender !== "user" && !msg.isError && (
                    <div className="flex items-center gap-1 mt-1 ml-1" onClick={(e) => e.stopPropagation()}>
                      <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        type="button" 
                        onClick={() => handleCopy(msg.id, msg.text || '')} 
                        className="flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer group/btn" 
                        title="Copy"
                      >
                        {copiedMsgId === msg.id ? (
                          <div className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">Copied</span>
                          </div>
                        ) : (
                          <Copy size={14} className="group-active/btn:text-white" />
                        )}
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleReadAloud(msg.text || '')} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer active:text-white" title="Read Aloud">
                        <Volume2 size={14} />
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleRegenerateMessage(msg.id)} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer active:text-white" title="Regenerate">
                        <RefreshCw size={14} />
                      </motion.button>

                      <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'like')} className={\`p-2 rounded-lg transition-all duration-200 cursor-pointer \${msg.feedback === 'like' ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5 active:text-white'}\`} title="Good response">
                        <ThumbsUp size={14} />
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'dislike')} className={\`p-2 rounded-lg transition-all duration-200 cursor-pointer \${msg.feedback === 'dislike' ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5 active:text-white'}\`} title="Bad response">
                        <ThumbsDown size={14} />
                      </motion.button>
                    </div>
                  )}`;

content = content.replace(oldActionsBlock, newActionsBlock);
fs.writeFileSync('src/components/ChatPage.tsx', content);
