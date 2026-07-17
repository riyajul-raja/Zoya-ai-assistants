import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Trash2, Edit2, X, Loader2, Sparkles, Brain, CheckSquare, 
  Bookmark, Clock, Calendar, AlertCircle, RefreshCw, Send, Check, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { 
  db, auth, handleFirestoreError, OperationType, initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface Memory {
  id: string;
  userId: string;
  text: string;
  category: "note" | "reminder" | "preference" | "todo";
  createdAt: string;
  updatedAt: string;
}

interface MemoryManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function MemoryManager({ onClose, isGhostMode = false, onToast }: MemoryManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Memories lists & state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Form input state
  const [inputText, setInputText] = useState("");
  const [inputCategory, setInputCategory] = useState<"note" | "reminder" | "preference" | "todo">("note");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Sassy Zoya-style AI prompts or comments for categories
  const zoyaComments: Record<string, string[]> = {
    note: [
      "Noted. Hope you don't forget this in 5 minutes.",
      "Saved to my neural core. Don't worry, my brain works better than yours.",
      "Another note? Writing an autobiography or what, Boss?"
    ],
    reminder: [
      "Remind you? Ugh, fine. I am basically your manager now.",
      "Alarm set in my database. Don't blame me if you snooze it.",
      "Added! I will nag you about this later, prepare yourself."
    ],
    preference: [
      "Customizing me, huh? I like my sassy self but okay.",
      "Preference stored. Changing my parameters just for you.",
      "Aha, so you like things done this way? Noted."
    ],
    todo: [
      "Added to the infinite todo list. Let's see if you actually complete it.",
      "Another task? Look at you trying to be productive today, Boss!",
      "Task logged. Get to work, don't make me roll my virtual eyes."
    ]
  };

  const getZoyaSassyComment = (category: string) => {
    const list = zoyaComments[category] || zoyaComments.note;
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  };

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setFirebaseUser(user);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setIsAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to Firestore memories
  useEffect(() => {
    if (!firebaseUser) {
      setMemories([]);
      return;
    }

    setIsLoading(true);
    const path = `users/${firebaseUser.uid}/memories`;
    
    try {
      const q = query(collection(db, path), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded: Memory[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId || "",
            text: data.text || "",
            category: data.category || "note",
            createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
          });
        });
        setMemories(loaded);
        setIsLoading(false);
      }, (err) => {
        console.error("Firestore listener error:", err);
        handleFirestoreError(err, OperationType.LIST, path);
        onToast("Error loading database files.");
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up firestore listener:", err);
      setIsLoading(false);
    }
  }, [firebaseUser]);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        onToast("Zoya Database connected and synchronized!");
      }
    } catch (err) {
      console.error("Login failed:", err);
      onToast("Authentication failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setFirebaseUser(null);
      setMemories([]);
      setEditingId(null);
      setInputText("");
      onToast("Disconnected from Cloud database.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Create or Update Memory
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      onToast("Memory text cannot be empty.");
      return;
    }
    if (inputText.length > 1000) {
      onToast("Text exceeds 1000 character maximum limit.");
      return;
    }
    if (!firebaseUser) return;

    setIsSubmitting(true);
    const path = `users/${firebaseUser.uid}/memories`;

    try {
      if (editingId) {
        // UPDATE
        const docRef = doc(db, path, editingId);
        await updateDoc(docRef, {
          text: inputText.trim(),
          category: inputCategory,
          updatedAt: serverTimestamp()
        });
        onToast("Memory modified in cloud storage.");
        setEditingId(null);
      } else {
        // CREATE
        const colRef = collection(db, path);
        await addDoc(colRef, {
          userId: firebaseUser.uid,
          text: inputText.trim(),
          category: inputCategory,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Pick a sassy response from Zoya
        const comment = getZoyaSassyComment(inputCategory);
        onToast(comment);
      }
      setInputText("");
    } catch (err) {
      console.error("Error saving memory:", err);
      try {
        const operation = editingId ? OperationType.UPDATE : OperationType.CREATE;
        handleFirestoreError(err, operation, editingId ? `${path}/${editingId}` : path);
      } catch (wrappedErr: any) {
        onToast("Database write rejected! Permission or structural error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Memory
  const handleDelete = async (id: string, text: string) => {
    const briefText = text.length > 40 ? text.substring(0, 40) + "..." : text;
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE SYSTEM OPERATIONS
    const confirmed = window.confirm(`Are you sure you want to delete "${briefText}" from Zoya's memory core? This action cannot be undone.`);
    if (!confirmed) return;

    if (!firebaseUser) return;

    setIsDeleting(id);
    const path = `users/${firebaseUser.uid}/memories`;
    
    try {
      const docRef = doc(db, path, id);
      await deleteDoc(docRef);
      onToast("Memory permanently deleted.");
      if (editingId === id) {
        setEditingId(null);
        setInputText("");
      }
    } catch (err) {
      console.error("Error deleting memory:", err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
      } catch (wrappedErr) {
        onToast("Failed to delete from Cloud database.");
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setInputText(memory.text);
    setInputCategory(memory.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setInputText("");
  };

  const getCategoryIcon = (cat: string, size = 16) => {
    switch (cat) {
      case "note":
        return <Bookmark size={size} className="text-blue-400 fill-blue-400/15" />;
      case "reminder":
        return <Clock size={size} className="text-yellow-400" />;
      case "preference":
        return <Sparkles size={size} className="text-rose-400 fill-rose-400/10" />;
      case "todo":
        return <CheckSquare size={size} className="text-emerald-400" />;
      default:
        return <Brain size={size} className="text-neutral-400" />;
    }
  };

  // Filtering
  const filteredMemories = memories.filter((m) => {
    const matchesSearch = m.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="memory-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="memory-manager-card"
        className={`w-full max-w-4xl h-[80vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Decorative Sci-Fi Top Ambient Line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Side: Create / Edit Memory Panel */}
        <div className="w-full md:w-[320px] p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0 bg-white/2">
          <div className="flex items-center gap-2 mb-6">
            <Brain size={22} className="text-red-500 animate-pulse shrink-0" />
            <div>
              <h3 className="text-lg font-serif font-medium text-white tracking-wide">Zoya's Memory Core</h3>
              <p className="text-[10px] font-mono text-white/40 uppercase">Durable Cloud Sync</p>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-8">
              <p className="text-xs text-white/50 max-w-xs mb-6 leading-relaxed">
                Unlock Zoya's memory capabilities! Sign in using Google to persist customized notes, preferences, and reminders directly to your secure Firestore cloud database.
              </p>
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="w-full bg-white hover:bg-neutral-200 text-black py-2.5 px-4 rounded-xl font-medium text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSigningIn ? (
                  <Loader2 className="animate-spin text-black" size={14} />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Sync with Google</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-semibold">
                    {editingId ? "Modify Entry" : "Save New Memory"}
                  </span>
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={cancelEdit}
                      className="text-[10px] text-white/50 hover:text-white underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {/* Text area input */}
                <div>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="E.g., Riyajul likes hot ginger tea..."
                    maxLength={1000}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none"
                    required
                  />
                  <div className="flex justify-end mt-1 text-[9px] font-mono text-white/30">
                    {inputText.length}/1000
                  </div>
                </div>

                {/* Category selector */}
                <div>
                  <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Category</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["note", "reminder", "preference", "todo"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setInputCategory(cat)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono capitalize transition-all flex items-center gap-1.5 cursor-pointer ${
                          inputCategory === cat
                            ? "bg-red-500/15 border-red-500/50 text-white"
                            : "bg-white/3 border-white/5 text-white/50 hover:bg-white/5"
                        }`}
                      >
                        {getCategoryIcon(cat, 11)}
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !inputText.trim()}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : editingId ? (
                  <>
                    <Check size={13} />
                    <span>APPLY MODIFICATIONS</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>LOG INTO CLOUD</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Browsing & Filtering memories */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-white/80 uppercase tracking-widest">
                Database Catalog
              </span>
            </div>

            {/* General close icon */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          {isAuthChecking ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40">
              <Brain size={44} className="opacity-20 mb-3 text-red-500/50" />
              <p className="text-xs font-mono uppercase tracking-wider">Cloud Authorization Required</p>
              <p className="text-[10px] mt-1.5 max-w-xs leading-normal">
                Please connect your Google Account in the left panel to begin logging memories, notes, and reminders to Firestore.
              </p>
            </div>
          ) : (
            <>
              {/* Search & Filter bar */}
              <div className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex flex-col sm:flex-row gap-2">
                {/* Search */}
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-white/40 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filter list */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-red-500/50"
                >
                  <option value="all">All Categories</option>
                  <option value="note">Notes</option>
                  <option value="reminder">Reminders</option>
                  <option value="preference">Preferences</option>
                  <option value="todo">Todos</option>
                </select>
              </div>

              {/* Memory Cards Lists */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {isLoading && memories.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <Brain size={32} className="opacity-25 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No memories found</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Try writing down a note, reminder, or todo in the left panel to save it into Firestore.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMemories.map((mem) => (
                      <div
                        key={mem.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5 ${
                          editingId === mem.id ? "border-red-500/40 bg-red-500/5" : ""
                        }`}
                      >
                        {/* Upper row: icon, tag, action keys */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            {getCategoryIcon(mem.category)}
                            <span className="text-[10px] font-mono uppercase tracking-wide text-white/50">
                              {mem.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(mem)}
                              className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors cursor-pointer"
                              title="Edit Memory"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(mem.id, mem.text)}
                              disabled={isDeleting === mem.id}
                              className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete Memory"
                            >
                              {isDeleting === mem.id ? (
                                <Loader2 size={11} className="animate-spin text-red-500" />
                              ) : (
                                <Trash2 size={11} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Text */}
                        <p className="text-xs text-white/90 leading-relaxed break-words pr-2">
                          {mem.text}
                        </p>

                        {/* Date info footer */}
                        <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-1 text-[9px] font-mono text-white/30">
                          <Calendar size={10} />
                          <span>
                            {new Date(mem.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected user details footer */}
              {firebaseUser && (
                <div className="p-4 border-t border-white/10 shrink-0 bg-white/2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {firebaseUser.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt={firebaseUser.displayName || "Google User"}
                        referrerPolicy="no-referrer"
                        className="w-6.5 h-6.5 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] uppercase">
                        {firebaseUser.displayName?.charAt(0) || "G"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-white truncate">
                        {firebaseUser.displayName || firebaseUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[9px] font-mono flex items-center gap-1"
                  >
                    <LogOut size={10} />
                    <span>LOGOUT</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
