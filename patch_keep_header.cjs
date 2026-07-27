const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

const oldHeader = `            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"`;

const newHeader = `            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <button
                onClick={handleLogin}
                disabled={isSigningIn}
                className="mr-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-mono text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSigningIn ? <Loader2 size={12} className="animate-spin" /> : <CloudOff size={12} />}
                <span>Reconnect Google</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="mr-2 p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Disconnect Google Keep"
              >
                <LogOut size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"`;

code = code.replace(oldHeader, newHeader);

// Change empty state from "No notes found" to "Please log in to sync" if !isAuthenticated
const oldEmpty = `<p className="text-sm font-mono uppercase text-white/40">No notes found</p>
                      <p className="text-xs mt-1 max-w-xs text-white/30 leading-normal">
                        Create a text record or checklist using the 'Compose Note' button above.
                      </p>`;

const newEmpty = `{isAuthenticated ? (
                        <>
                          <p className="text-sm font-mono uppercase text-white/40">No notes found</p>
                          <p className="text-xs mt-1 max-w-xs text-white/30 leading-normal">
                            Create a text record or checklist using the 'Compose Note' button above.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-mono uppercase text-amber-500/70">Please log in to sync</p>
                          <p className="text-xs mt-1 max-w-xs text-white/30 leading-normal">
                            Reconnect your Google account to access your Keep notes.
                          </p>
                        </>
                      )}`;
code = code.replace(oldEmpty, newEmpty);

fs.writeFileSync('src/components/KeepManager.tsx', code);
console.log("Patched KeepManager Header");
