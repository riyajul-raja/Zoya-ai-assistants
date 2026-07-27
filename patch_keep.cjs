const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

code = code.replace(/initAuth\(\s*\(\w+, cachedToken\) => \{/, "initAuth(\n      (user, cachedToken) => {");

const oldInit = `    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchNotes(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
        setApiMode("fallback");
        loadFallbackNotes();
      }
    );`;

const newInit = `    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchNotes(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
        setApiMode("fallback");
        loadFallbackNotes();
      },
      'zoya_google_keep_token'
    );`;

code = code.replace(oldInit, newInit);

code = code.replace(
  "const result = await googleSignIn();",
  "const result = await googleSignIn(['https://www.googleapis.com/auth/keep'], 'zoya_google_keep_token');"
);

code = code.replace(
  "await logout();",
  "await logout('zoya_google_keep_token');"
);

// If fetchNotes fails with 401/403, we need to show a Reconnect state instead of just red toast and fallback
// Wait, the prompt says: 
// CLEAN EMPTY STATE: If there's no data because of missing auth, just show a clean 'Please log in to sync' message instead of a red error toast.

const oldFetchNotesCatch = `        if (response.status === 401 || response.status === 403) {
          setIsAuthenticated(false);
          setToken(null);
          setApiMode("fallback");
          loadFallbackNotes();
          onToast("Please sign in again to grant Keep permissions.");
          throw new Error("Insufficient scopes or invalid token.");
        }`;
const newFetchNotesCatch = `        if (response.status === 401 || response.status === 403) {
          setIsAuthenticated(false);
          setToken(null);
          setApiMode("fallback");
          loadFallbackNotes();
          // Silently fail auth instead of error toast
          return;
        }`;
code = code.replace(oldFetchNotesCatch, newFetchNotesCatch);

fs.writeFileSync('src/components/KeepManager.tsx', code);
console.log("Patched KeepManager");
