const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const targetStr = `                      <motion.button 
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
                      </motion.button>`;

const replacementStr = `                      <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        type="button" 
                        onClick={() => handleCopy(msg.id, msg.text || '')} 
                        className="flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer" 
                        title="Copy"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </motion.button>`;

// Replace with no text if that's what ChatGPT does, or keep the text but avoid flicker.
// Wait, the prompt said: "Small text appears: Copied"
