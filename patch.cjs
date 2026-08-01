const fs = require('fs');
let code = fs.readFileSync('src/components/KeepManager.tsx', 'utf8');

// 1. Add imports
code = code.replace('import { motion, AnimatePresence } from "motion/react";', 
`import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { initAuth, googleSignIn, logout, getAccessToken } from "../services/firebaseService";
import { UserPlus, Loader2, LogOut } from "lucide-react";`);

// 2. Add State
code = code.replace('const [notes, setNotes] = useState<KeepNote[]>([]);',
`const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [apiMode, setApiMode] = useState<"real" | "fallback">("fallback");

  const [notes, setNotes] = useState<KeepNote[]>([]);`);

// 3. Replace useEffect
code = code.replace(`  useEffect(() => {
    loadFallbackNotes();
  }, []);`,
`  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        setApiMode("real");
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
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        setApiMode("real");
        onToast("Google Keep access authorized!");
        fetchNotes(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setFirebaseUser(null);
      setToken(null);
      setApiMode("fallback");
      loadFallbackNotes();
      onToast("Logged out successfully.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchNotes = async (accessToken: string) => {
    setIsLoadingNotes(true);
    try {
      const response = await fetch("https://keep.googleapis.com/v1/notes", {
        headers: { Authorization: \`Bearer \${accessToken}\` }
      });
      if (!response.ok) {
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
  };`);

// 4. Update createNote
code = code.replace(`    const localNote: KeepNote = {
      name: \`notes/local-\${Date.now()}\`,
      title: notePayload.title,
      body: notePayload.body,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    
    const updated = [localNote, ...notes];
    saveFallbackNotesToStore(updated);
    onToast("Note saved to secure local workspace!");`,
`    if (apiMode === "real" && token) {
      try {
        const response = await fetch("https://keep.googleapis.com/v1/notes", {
          method: "POST",
          headers: {
            Authorization: \`Bearer \${token}\`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(notePayload)
        });
        if (!response.ok) throw new Error("Failed to create note");
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        onToast("Note created in Google Keep!");
      } catch (err) {
        console.error("Error creating note", err);
        onToast("Failed to create note in Google Keep.");
      }
    } else {
      const localNote: KeepNote = {
        name: \`notes/local-\${Date.now()}\`,
        title: notePayload.title,
        body: notePayload.body,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      const updated = [localNote, ...notes];
      saveFallbackNotesToStore(updated);
      onToast("Note saved to secure local workspace!");
    }`);

// 5. Update deleteNote
code = code.replace(`    const updated = notes.filter(n => n.name !== noteName);
    saveFallbackNotesToStore(updated);
    onToast("Note removed from workspace.");
    
    if (selectedNote?.name === noteName) {
      setSelectedNote(null);
    }`,
`    if (apiMode === "real" && token) {
      try {
        const response = await fetch(\`https://keep.googleapis.com/v1/\${noteName}\`, {
          method: "DELETE",
          headers: { Authorization: \`Bearer \${token}\` }
        });
        if (!response.ok) throw new Error("Failed to delete note");
        setNotes(notes.filter(n => n.name !== noteName));
        onToast("Note deleted from Google Keep.");
        if (selectedNote?.name === noteName) setSelectedNote(null);
      } catch (err) {
        console.error("Error deleting note", err);
        onToast("Failed to delete note from Google Keep.");
      }
    } else {
      const updated = notes.filter(n => n.name !== noteName);
      saveFallbackNotesToStore(updated);
      onToast("Note removed from workspace.");
      if (selectedNote?.name === noteName) setSelectedNote(null);
    }`);

// 6. Update toggleChecklistItem (since Keep API has no direct update endpoint for items, Keep API v1 only allows creating/reading/deleting? Keep API docs state notes are read/write, but updating might require full object replacement? Wait, Keep API doesn't support updating notes? Keep API documentation: "Notes cannot be updated." Actually, let's just leave the local toggle or try to use POST? Keep API doesn't have an update endpoint. I'll just check if it's real mode and if so, warn or fallback to local toggle)
// Wait, I will just do a generic check
code = code.replace(`    const updatedNotes = [...notes];
    const targetNote = { ...updatedNotes[noteIndex] };`,
`    if (apiMode === "real") {
      onToast("Updating checklist items is not supported by Google Keep API yet. Read-only mode.");
      return;
    }
    const updatedNotes = [...notes];
    const targetNote = { ...updatedNotes[noteIndex] };`);

// 7. Add auth UI near the header
code = code.replace(`          {/* Search input sub-header */}`,
`          {/* Auth Header */}
          {apiMode === "fallback" && (
            <div className="p-3 bg-amber-950/40 border-b border-amber-500/20 text-[11px] text-amber-300 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <CloudOff size={13} className="animate-pulse" />
                <span>Running in secure local-only mode. Connect Google Account to sync live Keep notes.</span>
              </div>
              <button 
                onClick={handleLogin} 
                disabled={isSigningIn}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] tracking-wide font-sans cursor-pointer transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {isSigningIn ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                <span>CONNECT ACCOUNT</span>
              </button>
            </div>
          )}

          {/* Search input sub-header */}`);

// Add logout button in Holographic Header Bar
code = code.replace(`                <span className="text-white font-medium text-sm tracking-wide">Zoya Keep Core</span>
              </div>`,
`                <span className="text-white font-medium text-sm tracking-wide">Zoya Keep Core</span>
              </div>
              
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors text-[10px] font-mono mr-2"
                  title="Disconnect Google Keep"
                >
                  <LogOut size={12} />
                  <span>DISCONNECT</span>
                </button>
              )}`);

fs.writeFileSync('src/components/KeepManager.tsx', code);
