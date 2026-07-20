const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              ) : (
              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                {isDeepThinking && (
                  <div className="pl-1 shrink-0" title="Deep Thinking Mode Active">
                    <Brain className="text-purple-400 animate-pulse w-5 h-5" />
                  </div>
                )}
                <textarea`;

const replacement = `              ) : (
              <div className="flex flex-col mt-1 pt-1.5 border-t border-white/10 shrink-0 gap-1.5">
                {isDeepThinking && (
                  <div className="px-1">
                    <button 
                      type="button" 
                      onClick={() => setIsDeepThinking(false)}
                      className="bg-purple-900/40 text-purple-200 px-3 py-1.5 rounded-full flex items-center w-fit gap-2 text-sm font-semibold hover:bg-purple-900/60 transition-colors cursor-pointer"
                    >
                      <Brain size={14} />
                      Deep Thinking
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 w-full">
                  <textarea`;

code = code.replace(target, replacement);

const target2 = `                    <Send size={13} />
                  </button>
                </div>
              </div>
              )}`;

const replacement2 = `                    <Send size={13} />
                  </button>
                </div>
                </div>
              </div>
              )}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/App.tsx', code);
