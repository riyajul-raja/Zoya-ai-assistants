import React, { useState, useEffect } from "react";
import { 
  StickyNote, Trash2, Plus, Search, X, Info, 
  Sliders, FileText, ListPlus, CloudOff, CheckSquare, Square, Save,
  Download, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { initAuth, googleSignIn, logout, getAccessToken } from "../services/firebaseService";
import { UserPlus, Loader2, LogOut } from "lucide-react";

interface KeepListItem {
  text?: {
    text?: string;
  };
  checked?: boolean;
}

interface KeepNote {
  name: string; // e.g. notes/123-abc
  title?: string;
  body?: {
    text?: {
      text?: string;
    };
    list?: {
      listItems?: KeepListItem[];
    };
  };
  createTime?: string;
  updateTime?: string;
}

interface KeepManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function KeepManager({ onClose, isGhostMode = false, onToast }: KeepManagerProps) {
  // Notes state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [apiMode, setApiMode] = useState<"real" | "fallback">("fallback");

  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "text" | "checklist">("all");

  // Selection & detail state
  const [selectedNote, setSelectedNote] = useState<KeepNote | null>(null);

  // Note creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNoteType, setNewNoteType] = useState<"text" | "list">("text");
  const [newTextBody, setNewTextBody] = useState("");
  
  // Checklist dynamic state
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>([""]);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize and load notes from local storage on mount
  useEffect(() => {
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
        headers: { Authorization: `Bearer ${accessToken}` }
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
        throw new Error(`Keep API error: ${response.status} ${response.statusText}`);
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
  };

  const loadFallbackNotes = () => {
    try {
      const cached = localStorage.getItem("zoya_keep_notes");
      if (cached) {
        try {
          setNotes(JSON.parse(cached));
          return;
        } catch (e) {
          localStorage.removeItem("zoya_keep_notes");
        }
      }
    } catch (e) {
      console.warn("localStorage not available:", e);
    }

    // Fallback if no valid cache or localStorage failed
    const initialNotes: KeepNote[] = [
      {
        name: "notes/zoya-welcome",
        title: "Welcome to Zoya Keep",
        body: {
          text: {
            text: "This is a secure, persistent note storage workspace. Manage critical operation logs, quick ideas, and checklists seamlessly."
          }
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      {
        name: "notes/zoya-launch-checklist",
        title: "Zoya Launch Checklist",
        body: {
          list: {
            listItems: [
              { text: { text: "Verify satellite communication links" }, checked: true },
              { text: { text: "Verify AI core neural parameters" }, checked: true },
              { text: { text: "Secure Google Workspace authentications" }, checked: false },
              { text: { text: "Launch orbit huddle room on Meet" }, checked: false }
            ]
          }
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ];
    setNotes(initialNotes);
    try {
      localStorage.setItem("zoya_keep_notes", JSON.stringify(initialNotes));
    } catch (e) {
      // Ignore
    }
  };

  const saveFallbackNotesToStore = (updatedNotes: KeepNote[]) => {
    setNotes(updatedNotes);
    try {
      localStorage.setItem("zoya_keep_notes", JSON.stringify(updatedNotes));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  };

  // Create a note
  const createNote = async () => {
    if (newNoteType === "text" && !newTitle.trim() && !newTextBody.trim()) {
      onToast("Note title or content is required.");
      return;
    }
    
    setIsCreating(true);

    const bodyPayload: any = {};
    if (newNoteType === "text") {
      bodyPayload.text = { text: newTextBody };
    } else {
      const filteredItems = newChecklistItems
        .filter(item => item.trim() !== "")
        .map(item => ({ text: { text: item }, checked: false }));
      
      bodyPayload.list = { listItems: filteredItems };
    }

    const notePayload = {
      title: newTitle.trim() || "Untitled Note",
      body: bodyPayload
    };

    const localNote: KeepNote = {
      name: `notes/local-${Date.now()}`,
      title: notePayload.title,
      body: notePayload.body,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    const updated = [localNote, ...notes];
    saveFallbackNotesToStore(updated);
    onToast("Note saved to secure local workspace!");

    // Reset
    setNewTitle("");
    setNewTextBody("");
    setNewChecklistItems([""]);
    setIsCreateOpen(false);
    setIsCreating(false);
  };

  // Delete note
  const deleteNote = async (noteName: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;

    const updated = notes.filter(n => n.name !== noteName);
    saveFallbackNotesToStore(updated);
    onToast("Note removed from workspace.");

    if (selectedNote?.name === noteName) {
      setSelectedNote(null);
    }
  };

  // Toggle checklist item checked status
  const toggleChecklistItem = async (noteName: string, itemIndex: number) => {
    const noteIndex = notes.findIndex(n => n.name === noteName);
    if (noteIndex === -1) return;

    if (apiMode === "real") {
      onToast("Updating checklist items is not supported by Google Keep API yet. Read-only mode.");
      return;
    }
    const updatedNotes = [...notes];
    const targetNote = { ...updatedNotes[noteIndex] };
    
    if (targetNote.body?.list?.listItems) {
      const items = [...targetNote.body.list.listItems];
      const targetItem = { ...items[itemIndex] };
      targetItem.checked = !targetItem.checked;
      items[itemIndex] = targetItem;
      
      targetNote.body = {
        ...targetNote.body,
        list: { listItems: items }
      };
      
      updatedNotes[noteIndex] = targetNote;
      saveFallbackNotesToStore(updatedNotes);

      // Sync active view
      if (selectedNote?.name === noteName) {
        setSelectedNote(targetNote);
      }
    }
  };

  // Helper checklist item list editors
  const addChecklistItemField = () => {
    setNewChecklistItems(prev => [...prev, ""]);
  };

  const handleChecklistItemChange = (index: number, val: string) => {
    const updated = [...newChecklistItems];
    updated[index] = val;
    setNewChecklistItems(updated);
  };

  const removeChecklistItemField = (index: number) => {
    if (newChecklistItems.length === 1) return;
    setNewChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  // Backup & Restore
  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(notes, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "zoya-keep-backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onToast("Workspace data exported successfully.");
    } catch (e) {
      console.error("Backup failed", e);
      onToast("Backup failed.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === "string") {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            setNotes(parsed);
            saveFallbackNotesToStore(parsed);
            onToast("Workspace data imported successfully.");
          } else {
            throw new Error("Invalid format");
          }
        }
      } catch (err) {
        console.error("Import failed", err);
        onToast("Import failed: Invalid JSON format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const titleMatch = (n.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const bodyTextMatch = (n.body?.text?.text || "").toLowerCase().includes(searchQuery.toLowerCase());
    const listMatch = (n.body?.list?.listItems || []).some(item => 
      (item.text?.text || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesSearch = titleMatch || bodyTextMatch || listMatch;

    if (!matchesSearch) return false;

    if (activeFilter === "text") return !!n.body?.text;
    if (activeFilter === "checklist") return !!n.body?.list;
    return true;
  });

  return (
    <div id="keep-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="keep-manager-card"
        className={`w-full max-w-3xl h-[85vh] rounded-3xl flex flex-col overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.3)]" 
            : "bg-neutral-950/95 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 animate-pulse" />

        {/* 1. Top Header with Close */}
        <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                Zoya Keep
              </h2>
              <p className="text-[9px] font-mono text-white/40 uppercase">Operational Notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
            title="Close Panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 relative">
            <>
              {/* 2. COMPOSE NOTE button (toggles form) */}
          <div className="shrink-0 space-y-4">
            <button
              onClick={() => {
                setIsCreateOpen(!isCreateOpen);
                if (!isCreateOpen) setSelectedNote(null);
              }}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white py-3.5 px-4 rounded-xl font-mono text-sm tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {isCreateOpen ? <X size={16} /> : <Plus size={16} />}
              <span>{isCreateOpen ? "CANCEL COMPOSE" : "COMPOSE NOTE"}</span>
            </button>

            {/* Compose Form */}
            <AnimatePresence>
              {isCreateOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">
                        NEW OPERATIONAL NOTE
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                      <button
                        onClick={() => setNewNoteType("text")}
                        className={`py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all ${
                          newNoteType === "text" ? "bg-white/10 text-white font-medium shadow-sm" : "text-white/40 hover:text-white"
                        }`}
                      >
                        TEXT MEMO
                      </button>
                      <button
                        onClick={() => setNewNoteType("list")}
                        className={`py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all ${
                          newNoteType === "list" ? "bg-white/10 text-white font-medium shadow-sm" : "text-white/40 hover:text-white"
                        }`}
                      >
                        CHECKLIST
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Title</label>
                      <input
                        type="text"
                        placeholder="Log name or title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-amber-500/50 font-mono"
                      />
                    </div>

                    {newNoteType === "text" ? (
                      <div>
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Note Body</label>
                        <textarea
                          placeholder="Type technical notes, parameters, or logs..."
                          rows={6}
                          value={newTextBody}
                          onChange={(e) => setNewTextBody(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-amber-500/50 font-sans resize-none leading-relaxed"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">List Records</label>
                        <div className="space-y-2">
                          {newChecklistItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={`Item ${idx + 1}`}
                                value={item}
                                onChange={(e) => handleChecklistItemChange(idx, e.target.value)}
                                className="flex-1 bg-neutral-900 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 font-mono"
                              />
                              <button
                                onClick={() => removeChecklistItemField(idx)}
                                className="p-2 hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors cursor-pointer rounded-lg"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addChecklistItemField}
                          className="text-xs font-mono text-amber-500 hover:text-amber-400 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>ADD ITEM ROW</span>
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={createNote}
                        disabled={isCreating}
                        className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/30 text-white text-sm font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isCreating ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save size={14} />
                            <span>SAVE NOTE</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsCreateOpen(false);
                          setNewTitle("");
                          setNewTextBody("");
                          setNewChecklistItems([""]);
                        }}
                        className="py-3 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-sm font-mono rounded-xl transition-colors cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {selectedNote ? (
              /* DETAIL COMPONENT */
              <motion.div
                key="detail-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                    {selectedNote.body?.list ? "CHECKLIST LOG" : "MEMO RECORD"}
                  </span>
                  <h3 className="text-xl font-serif font-semibold text-white leading-relaxed break-words">
                    {selectedNote.title || "Untitled Note"}
                  </h3>
                  <p className="text-[10px] font-mono text-white/30">
                    ID: {selectedNote.name}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900 border border-white/5">
                  {!selectedNote.body?.list ? (
                    <p className="text-sm text-white/80 leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedNote.body?.text?.text}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(selectedNote.body.list.listItems || []).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleChecklistItem(selectedNote.name, idx)}
                          className="flex items-start gap-3 font-mono text-sm cursor-pointer group/item select-none text-left"
                        >
                          <span className="shrink-0 text-amber-500 mt-0.5">
                            {item.checked ? (
                              <CheckSquare size={16} />
                            ) : (
                              <Square size={16} className="group-hover/item:text-white/60 text-white/30" />
                            )}
                          </span>
                          <span className={`${item.checked ? "line-through text-white/35" : "text-white/90"}`}>
                            {item.text?.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => deleteNote(selectedNote.name)}
                    className="flex-1 py-3 px-3 bg-red-950/40 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 font-mono rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>DELETE RECORD</span>
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="py-3 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                  >
                    BACK TO LIST
                  </button>
                </div>
              </motion.div>
            ) : !isCreateOpen ? (
              <motion.div
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* 3. Local Workspace warning banner */}
                <div className="p-4 rounded-xl border flex items-center gap-3 bg-amber-500/10 border-amber-500/20 text-amber-300 shrink-0 shadow-inner">
                  <CloudOff size={18} className="text-amber-400 animate-pulse shrink-0" />
                  <p className="text-xs leading-relaxed font-sans">
                    <strong className="font-semibold mr-1">Local Workspace:</strong> 
                    Cloud Sync requires a Google Workspace account. Zoya is saving your notes locally.
                  </p>
                </div>

                {/* 4. FILTERS */}
                <div className="space-y-3 shrink-0">
                  <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1">Filters</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveFilter("all")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs transition-all border ${
                        activeFilter === "all" ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Sliders size={14} />
                      <span>All Notes</span>
                    </button>
                    <button
                      onClick={() => setActiveFilter("text")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs transition-all border ${
                        activeFilter === "text" ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <FileText size={14} />
                      <span>Plain Text</span>
                    </button>
                    <button
                      onClick={() => setActiveFilter("checklist")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs transition-all border ${
                        activeFilter === "checklist" ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <ListPlus size={14} />
                      <span>Checklists</span>
                    </button>
                    
                    {/* Backup & Restore */}
                    <div className="h-6 w-px bg-white/10 hidden sm:block mx-1"></div>
                    <button
                      onClick={handleBackup}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs transition-all border bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Backup Data</span>
                    </button>
                    <label className="flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs transition-all border bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer">
                      <Upload size={14} />
                      <span>Import Data</span>
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImport}
                      />
                    </label>

                    {/* Search inside filters row */}
                    <div className="relative flex-1 min-w-[200px] ml-auto">
                      <span className="absolute inset-y-0 left-3 flex items-center text-white/35">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 text-white text-xs pl-9 pr-3 py-2 rounded-xl font-mono focus:outline-none transition-all placeholder:text-white/30"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. THE NOTES LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNotes.length > 0 ? (
                    filteredNotes.map((note) => {
                      const isList = !!note.body?.list;
                      return (
                        <div
                          key={note.name}
                          onClick={() => setSelectedNote(note)}
                          className="p-5 rounded-2xl border cursor-pointer relative group transition-all duration-300 flex flex-col justify-between h-[180px] bg-neutral-900/80 border-white/10 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-white line-clamp-1 pr-6">
                                {note.title || "Untitled Note"}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNote(note.name);
                                }}
                                className="absolute top-4 right-4 p-1.5 bg-neutral-800 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                                title="Delete note"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="mt-3 text-xs text-white/60 line-clamp-4">
                              {!isList ? (
                                <p className="leading-relaxed font-sans font-light">
                                  {note.body?.text?.text}
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {(note.body?.list?.listItems || []).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                                      {item.checked ? (
                                        <CheckSquare size={12} className="text-amber-500 shrink-0" />
                                      ) : (
                                        <Square size={12} className="text-white/30 shrink-0" />
                                      )}
                                      <span className={`truncate ${item.checked ? "line-through text-white/30" : ""}`}>
                                        {item.text?.text}
                                      </span>
                                    </div>
                                  ))}
                                  {(note.body?.list?.listItems || []).length > 3 && (
                                    <p className="text-[10px] font-mono text-amber-500/50 mt-1.5 pl-1">
                                      + {(note.body?.list?.listItems || []).length - 3} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/30 shrink-0">
                            <span className="flex items-center gap-1.5">
                              {isList ? <ListPlus size={12} /> : <FileText size={12} />}
                              {isList ? "CHECKLIST" : "TEXT MEMO"}
                            </span>
                            <span>
                              {note.updateTime 
                                ? new Date(note.updateTime).toLocaleDateString([], { month: "short", day: "numeric" }) 
                                : "Local Record"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center text-center p-12 bg-white/2 border border-white/5 rounded-2xl border-dashed">
                      <StickyNote size={32} className="opacity-20 mb-3 text-amber-500/40 animate-pulse" />
                      <p className="text-sm font-mono uppercase text-white/40">No notes found</p>
                      <p className="text-xs mt-1 max-w-xs text-white/30 leading-normal">
                        Create a text record or checklist using the 'Compose Note' button above.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
            </>
        </div>
      </div>
    </div>
  );
}
