const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldHeader = `              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer md:hidden"
                title="Close Panel"
              >
                <X size={14} />
              </button>`;

const newHeader = `              {/* Mobile Auth Button */}
              <div className="md:hidden flex items-center">
                {!isAuthenticated ? (
                  <button
                    onClick={handleLogin}
                    disabled={isSigningIn}
                    className="p-1.5 rounded bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1 border border-red-500/20"
                  >
                    {isSigningIn ? <Loader2 size={12} className="animate-spin" /> : <User size={12} />}
                    <span className="hidden sm:inline">LOGIN</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                       setIsCreateOpen(true);
                       setSelectedEvent(null);
                    }}
                    className="p-1.5 rounded bg-white/5 text-white/70 hover:text-white transition-colors cursor-pointer mr-1"
                    title="Add Event"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer md:hidden"
                title="Close Panel"
              >
                <X size={14} />
              </button>`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Mobile Auth");
