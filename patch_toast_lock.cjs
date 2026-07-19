const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldToast = `      {/* Update Successful Toast Overlay */}
      <AnimatePresence>
        {showUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[10px]">
              Z
            </div>
            <span className="text-sm font-medium tracking-wide">Update Successful</span>
          </motion.div>
        )}
      </AnimatePresence>`;

code = code.replace(oldToast, "");

const oldLockScreen = `            className="fixed inset-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden z-0 flex flex-col items-center justify-center text-white font-sans"
          >
            {/* Absolute background gradient container */}`;

const newLockScreen = `            className="fixed inset-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden z-0 flex flex-col items-center justify-center text-white font-sans"
          >
            {/* Update Successful Toast Overlay (Lock Screen) */}
            <AnimatePresence>
              {showUpdateToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="fixed top-16 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[10px]">
                    Z
                  </div>
                  <span className="text-sm font-medium tracking-wide">Update Successful</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Absolute background gradient container */}`;

code = code.replace(oldLockScreen, newLockScreen);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched lock screen toast");
