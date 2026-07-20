const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

const replacement = `          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus Menu Bottom Sheet Overlay */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlusMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-[#1a1a1a] p-4 pb-8 shadow-2xl flex flex-col gap-2 border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
              
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Upload Photo</div>
                  <div className="text-white/50 text-sm">Analyze with Zoya</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setTextInput("/generate ");
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

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
