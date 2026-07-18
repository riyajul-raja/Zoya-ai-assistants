import React, { useState, useEffect } from "react";
import { 
  StickyNote, Trash2, Plus, Search, X, Info, 
  Sliders, FileText, ListPlus, CloudOff, CheckSquare, Square, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "text" | "list">("all");

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
    loadFallbackNotes();
  }, []);

  const loadFallbackNotes = () => {
    const cached = localStorage.getItem("zoya_keep_notes");
    if (cached) {
      setNotes(JSON.parse(cached));
    } else {
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
      localStorage.setItem("zoya_keep_notes", JSON.stringify(initialNotes));
    }
  };

  const saveFallbackNotesToStore = (updatedNotes: KeepNote[]) => {
    setNotes(updatedNotes);
    localStorage.setItem("zoya_keep_notes", JSON.stringify(updatedNotes));
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

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const titleMatch = (n.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const bodyTextMatch = (n.body?.text?.text || "").toLowerCase().includes(searchQuery.toLowerCase());
    const listMatch = (n.body?.list?.listItems || []).some(item => 
      (item.text?.text || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesSearch = titleMatch || bodyTextMatch || listMatch;

    if (!matchesSearch) return false;

    if (filterType === "text") return !!n.body?.text;
    if (filterType === "list") return !!n.body?.list;
    return true;
  });

  return (
    <div id="keep-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="keep-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.3)]" 
            : "bg-neutral-950/95 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
        }`}
      >
        {/* Top glowing amber accent strip */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 animate-pulse" />

        {/* Absolute Universal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Close Panel"
        >
          <X size={16} />
        </button>

        {/* Left Drawer */}
        <div className="w-full md:w-[260px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-full overflow-y-auto space-y-5">
            {/* Header / Brand */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Keep
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Operational Notes</p>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => {
                setIsCreateOpen(true);
                setSelectedNote(null);
              }}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white py-2.5 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>COMPOSE NOTE</span>
            </button>

            {/* Sync Mode Information */}
            <div className="p-3 rounded-xl border flex flex-col gap-1.5 bg-amber-500/5 border-amber-500/20 text-amber-400">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider font-semibold">
                <CloudOff size={11} />
                <span>LOCAL WORKSPACE</span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed font-sans">
                Cloud Sync requires a Google Workspace account. Zoya is saving your notes locally.
              </p>
            </div>

            {/* Filter Swapper */}
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest px-1">Filters</p>
              <div className="space-y-1">
                <button
                  onClick={() => setFilterType("all")}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-mono text-xs transition-all ${
                    filterType === "all" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                  }`}
                >
                  <Sliders size={12} />
                  <span>All Notes</span>
                </button>
                <button
                  onClick={() => setFilterType("text")}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-mono text-xs transition-all ${
                    filterType === "text" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                  }`}
                >
                  <FileText size={12} />
                  <span>Plain Text</span>
                </button>
                <button
                  onClick={() => setFilterType("list")}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-mono text-xs transition-all ${
                    filterType === "list" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                  }`}
                >
                  <ListPlus size={12} />
                  <span>Checklists</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-neutral-900/10">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <StickyNote size={18} className="text-amber-500 animate-pulse" />
                <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                  KEEP LOG CONSOLE
                </h3>
              </div>

              <div className="relative max-w-xs w-full md:w-64">
                <span className="absolute inset-y-0 left-3 flex items-center text-white/35">
                  <Search size={12} />
                </span>
                <input
                  type="text"
                  placeholder="Search operational records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500/50 text-white text-xs pl-8.5 pr-3 py-1.5 rounded-xl font-mono focus:outline-none transition-all placeholder:text-white/30"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 ml-4 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
            <span className="flex items-center gap-2">
              <CloudOff size={14} className="text-amber-400 animate-pulse" />
              <span>Cloud Sync requires a Google Workspace account. Zoya is saving your notes locally.</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {filteredNotes.length > 0 ? (
              /* NOTES GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map((note) => {
                  const isList = !!note.body?.list;
                  return (
                     <div
                      key={note.name}
                      onClick={() => setSelectedNote(note)}
                      className="p-5 rounded-2xl border cursor-pointer relative group transition-all duration-300 flex flex-col justify-between h-[180px] bg-neutral-900/60 border-white/5 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                    >
                      <div>
                        {/* Note Header Title & Action */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white line-clamp-1">
                            {note.title || "Untitled Note"}
                          </h4>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.name);
                              }}
                              className="p-1 hover:bg-white/5 rounded-md text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete note"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Note Body Content */}
                        <div className="mt-3 text-xs text-white/60 line-clamp-4 space-y-1">
                          {!isList ? (
                            <p className="leading-relaxed font-sans font-light">
                              {note.body?.text?.text}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {(note.body?.list?.listItems || []).slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                                  {item.checked ? (
                                    <CheckSquare size={11} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <Square size={11} className="text-white/30 shrink-0" />
                                  )}
                                  <span className={`truncate ${item.checked ? "line-through text-white/30" : ""}`}>
                                    {item.text?.text}
                                  </span>
                                </div>
                              ))}
                              {(note.body?.list?.listItems || []).length > 3 && (
                                <p className="text-[9px] font-mono text-amber-500/50 mt-1 pl-1">
                                  + {(note.body?.list?.listItems || []).length - 3} more records
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp footer */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-white/30 shrink-0">
                        <span>{isList ? "CHECKLIST" : "TEXT MEMO"}</span>
                        <span>
                          {note.updateTime 
                            ? new Date(note.updateTime).toLocaleDateString([], { month: "short", day: "numeric" }) 
                            : "Local Record"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/30">
                <StickyNote size={32} className="opacity-20 mb-2 text-amber-500/40 animate-pulse" />
                <p className="text-xs font-mono uppercase">No records found</p>
                <p className="text-[10px] mt-1 max-w-xs leading-normal">
                  Create a text record or checklist dynamically in the sidebar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel Composer */}
        <div className="hidden md:flex md:w-[360px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* COMPOSE COMPONENT */
                <motion.div
                  key="composer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4 flex-1 overflow-y-auto pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">
                        NEW OPERATIONAL NOTE
                      </h3>
                    </div>

                    {/* Note Type Selector */}
                    <div className="grid grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                      <button
                        onClick={() => setNewNoteType("text")}
                        className={`py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                          newNoteType === "text" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                        }`}
                      >
                        TEXT MEMO
                      </button>
                      <button
                        onClick={() => setNewNoteType("list")}
                        className={`py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                          newNoteType === "list" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                        }`}
                      >
                        CHECKLIST
                      </button>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="Log name or title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500/50 font-mono"
                      />
                    </div>

                    {newNoteType === "text" ? (
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Content Body</label>
                        <textarea
                          placeholder="Type technical notes, parameters, or logs..."
                          rows={8}
                          value={newTextBody}
                          onChange={(e) => setNewTextBody(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500/50 font-sans resize-none leading-relaxed"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">List Records</label>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {newChecklistItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder={`Item ${idx + 1}`}
                                value={item}
                                onChange={(e) => handleChecklistItemChange(idx, e.target.value)}
                                className="flex-1 bg-neutral-900 border border-white/10 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 font-mono"
                              />
                              <button
                                onClick={() => removeChecklistItemField(idx)}
                                className="p-1 hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addChecklistItemField}
                          className="text-[10px] font-mono text-amber-500 hover:text-amber-400 flex items-center gap-1 pt-1.5 cursor-pointer"
                        >
                          <Plus size={10} />
                          <span>ADD ITEM ROW</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-6 shrink-0">
                    <button
                      onClick={createNote}
                      disabled={isCreating}
                      className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save size={12} />
                          <span>SAVE RECORD</span>
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
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.div>
              ) : selectedNote ? (
                /* DETAIL COMPONENT */
                <motion.div
                  key="detail-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest">
                        {selectedNote.body?.list ? "CHECKLIST LOG" : "MEMO RECORD"}
                      </span>
                      <h3 className="text-base font-serif font-semibold text-white leading-relaxed break-words">
                        {selectedNote.title || "Untitled Note"}
                      </h3>
                      <p className="text-[9px] font-mono text-white/30">
                        ID: {selectedNote.name}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-white/1 mt-4">
                      {!selectedNote.body?.list ? (
                        <p className="text-xs text-white/70 leading-relaxed font-sans whitespace-pre-wrap">
                          {selectedNote.body?.text?.text}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(selectedNote.body.list.listItems || []).map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => toggleChecklistItem(selectedNote.name, idx)}
                              className="flex items-center gap-3 font-mono text-xs cursor-pointer group/item select-none text-left"
                            >
                              <span className="shrink-0 text-amber-500">
                                {item.checked ? (
                                  <CheckSquare size={14} />
                                ) : (
                                  <Square size={14} className="group-hover/item:text-white/60 text-white/30" />
                                )}
                              </span>
                              <span className={`text-xs ${item.checked ? "line-through text-white/35" : "text-white/85"}`}>
                                {item.text?.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button
                      onClick={() => deleteNote(selectedNote.name)}
                      className="flex-1 py-2.5 px-3 bg-red-950/40 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 font-mono rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>DELETE RECORD</span>
                    </button>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      BACK
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* WELCOME INFO */
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-amber-400" />
                      <h3 className="text-xs font-mono text-white uppercase tracking-wider">
                        Workspace Guidelines
                      </h3>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                      <p className="text-xs text-white/70 leading-relaxed font-sans">
                        Use Keep logs to manage dynamic, custom launch requirements, persistent team parameters, and fast notes.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-mono text-white/40">
                        <span>Total Tracked Notes</span>
                        <span className="text-white">{notes.length}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-white/40">
                        <span>Database Mode</span>
                        <span className="text-white uppercase font-bold text-[10px]">
                          Local Workspace
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl font-mono text-xs text-white uppercase transition-colors cursor-pointer"
                  >
                    COMPOSE NEW RECORD
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
