const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsImageMode(true);
                  setTextInput("");
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Create Image</div>
                  <div className="text-white/50 text-sm">Generate with AI</div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}`;

const replacement = `              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsImageMode(true);
                  setTextInput("");
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Create Image</div>
                  <div className="text-white/50 text-sm">Generate with AI</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsDeepThinking(prev => !prev);
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className={\`p-3 rounded-full \${isDeepThinking ? 'bg-indigo-500/40 text-indigo-300' : 'bg-indigo-500/20 text-indigo-400'}\`}>
                  <Brain size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Deep Thinking {isDeepThinking ? '(On)' : ''}</div>
                  <div className="text-white/50 text-sm">Advanced, focused reasoning</div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
