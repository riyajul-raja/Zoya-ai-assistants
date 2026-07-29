const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const oldActions = `                  {/* Actions for Assistant */}
                  {msg.sender !== "user" && !msg.isError && (
                    <div className="flex items-center gap-1.5 mt-2 ml-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                      <button type="button" onClick={() => navigator.clipboard.writeText(msg.text || '')} className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Copy">
                        <Copy size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Read Aloud">
                        <Volume2 size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Regenerate">
                        <RefreshCw size={15} />
                      </button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Good response">
                        <ThumbsUp size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Bad response">
                        <ThumbsDown size={15} />
                      </button>
                    </div>
                  )}`;

const newActions = `                  {/* Actions for Assistant */}
                  {msg.sender !== "user" && !msg.isError && (
                    <div className="relative flex items-center gap-1.5 mt-2 ml-3 opacity-0 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 translate-y-1 lg:group-hover:translate-y-0 active-mobile-menu">
                      
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

content = content.replace(oldActions, newActions);
fs.writeFileSync('src/components/ChatPage.tsx', content);
