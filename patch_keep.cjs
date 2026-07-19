const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

// 1. Fix fetchNotes error handling
code = code.replace(
  /const fetchNotes = async \(\s*accessToken\s*:\s*string\s*\) => \{[\s\S]*?setIsLoadingNotes\(false\);\n    \}\n  \};/,
  `const fetchNotes = async (accessToken: string) => {
    setIsLoadingNotes(true);
    try {
      const response = await fetch("https://keep.googleapis.com/v1/notes", {
        headers: { Authorization: \`Bearer \${accessToken}\` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsAuthenticated(false);
          setToken(null);
          setApiMode("fallback");
          loadFallbackNotes();
          onToast("Please sign in again to grant Keep permissions.");
          throw new Error("Insufficient scopes or invalid token.");
        }
        throw new Error(\`Keep API error: \${response.status} \${response.statusText}\`);
      }
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error("Failed to fetch Google Keep notes", error);
      onToast("Failed to sync with Google Keep. Falling back to local storage.");
      setApiMode("fallback");
      loadFallbackNotes();
    } finally {
      setIsLoadingNotes(false);
    }
  };`
);

// 2. Wrap the Keep content in isAuthenticated check
const uiToReplace = `{/* 2. COMPOSE NOTE button (toggles form) */}`;
const uiReplacement = `{isAuthChecking ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <UserPlus size={28} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Keep Connection Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Account to view, create, edit, and sync your operational notes directly within Zoya Keep.
              </p>
              
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="relative group overflow-hidden bg-white hover:bg-neutral-200 text-black py-3 px-6 rounded-xl font-medium tracking-wide shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center gap-3"
              >
                {isSigningIn ? (
                  <Loader2 className="animate-spin text-black" size={18} />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* 2. COMPOSE NOTE button (toggles form) */}`;

code = code.replace(uiToReplace, uiReplacement);

// Close the fragment at the end
code = code.replace(
  `            ) : null}
          </AnimatePresence>
        </div>`,
  `            ) : null}
          </AnimatePresence>
            </>
          )}
        </div>`
);

fs.writeFileSync('src/components/KeepManager.tsx', code);
