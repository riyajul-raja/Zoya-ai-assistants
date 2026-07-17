import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, Play, ExternalLink, HelpCircle,
  FileEdit, AlignLeft, Calendar, FileDown, BookOpen, PenTool
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface DocFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface DocTextRun {
  content?: string;
  textStyle?: any;
}

interface DocParagraphElement {
  textRun?: DocTextRun;
}

interface DocBodyElement {
  paragraph?: {
    elements?: DocParagraphElement[];
  };
}

interface GoogleDocDetails {
  documentId: string;
  title: string;
  body?: {
    content?: DocBodyElement[];
  };
}

interface DocsManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function DocsManager({ onClose, isGhostMode = false, onToast }: DocsManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Lists state
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected document and full structure
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [docDetails, setDocDetails] = useState<GoogleDocDetails | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  // Creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Editing state (append content)
  const [isAppendOpen, setIsAppendOpen] = useState(false);
  const [appendText, setAppendText] = useState("");
  const [isAppending, setIsAppending] = useState(false);

  // Deletion tracking
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);

  // Initialize Auth & load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchDocuments(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
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
        onToast("Google Docs access authorized!");
        fetchDocuments(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Ensure Google Account scopes are approved.");
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
      setDocuments([]);
      setSelectedDoc(null);
      setDocDetails(null);
      setIsCreateOpen(false);
      setIsAppendOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch Google Docs from Drive API
  const fetchDocuments = async (accessToken: string, filterStr = "") => {
    setIsLoading(true);
    try {
      let q = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
      if (filterStr) {
        q += ` and name contains '${filterStr.replace(/'/g, "\\'")}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=45`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to search documents in Drive");
      }

      const data = await response.json();
      setDocuments(data.files || []);
    } catch (err) {
      console.error("Error listing documents:", err);
      onToast("Failed to fetch Google Docs files.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch individual Document content
  const loadDocumentDetails = async (docId: string, accessToken: string) => {
    setIsLoadingDoc(true);
    try {
      const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to download document structural components");
      }

      const data = await response.json();
      setDocDetails(data);
    } catch (err) {
      console.error("Error loading document:", err);
      onToast("Could not download document contents.");
      setDocDetails(null);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleSelectDoc = (doc: DocFile) => {
    setSelectedDoc(doc);
    setIsCreateOpen(false);
    setIsAppendOpen(false);
    if (token) {
      loadDocumentDetails(doc.id, token);
    }
  };

  // Create Google Doc
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !token) {
      onToast("Please supply a valid document name.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newDocTitle.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = await response.json();
      onToast(`Document "${newDoc.title}" created successfully!`);
      setNewDocTitle("");
      setIsCreateOpen(false);

      // Add to list and select it
      const updatedFile: DocFile = {
        id: newDoc.documentId,
        name: newDoc.title,
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString()
      };

      setDocuments([updatedFile, ...documents]);
      handleSelectDoc(updatedFile);
    } catch (err) {
      console.error("Error creating document:", err);
      onToast("Failed to create document.");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete Google Doc from Drive
  const handleDeleteDoc = async (doc: DocFile) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete Google Doc "${doc.name}"? This action is irreversible.`);
    if (!confirmed) return;

    if (!token) return;
    setIsDeletingDocId(doc.id);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      onToast(`"${doc.name}" deleted from your Google Drive.`);
      setDocuments(documents.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setDocDetails(null);
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      onToast("Could not delete file from Google Drive.");
    } finally {
      setIsDeletingDocId(null);
    }
  };

  // Append Text content to document
  const handleAppendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDoc || !appendText.trim()) return;

    setIsAppending(true);
    try {
      const requests = [
        {
          insertText: {
            text: appendText,
            endOfSegmentLocation: {} // Inserts at the end of the document body automatically
          }
        }
      ];

      const response = await fetch(
        `https://docs.googleapis.com/v1/documents/${selectedDoc.id}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ requests })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to insert text in document");
      }

      onToast("Text successfully appended to document!");
      setAppendText("");
      setIsAppendOpen(false);

      // Reload document content
      loadDocumentDetails(selectedDoc.id, token);
    } catch (err) {
      console.error("Error appending text:", err);
      onToast("Could not append text to Google Doc.");
    } finally {
      setIsAppending(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchDocuments(token, searchQuery);
    }
  };

  // Extract entire document text elegantly
  const extractDocText = (doc: GoogleDocDetails) => {
    if (!doc.body?.content) return "No content structural layers found";
    
    const textPieces: string[] = [];
    doc.body.content.forEach((element) => {
      if (element.paragraph?.elements) {
        element.paragraph.elements.forEach((el) => {
          if (el.textRun?.content) {
            textPieces.push(el.textRun.content);
          }
        });
      }
    });

    return textPieces.join("").trim() || "Empty Document";
  };

  return (
    <div id="docs-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="docs-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top edge strip line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Side: Document Drawer */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Docs
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Document Control</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setSelectedDoc(null);
                  setDocDetails(null);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>NEW DOCUMENT</span>
              </button>
            )}

            {/* Document listings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                <span>Google Docs</span>
              </div>

              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`group w-full flex items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs cursor-pointer transition-colors ${
                      selectedDoc?.id === doc.id
                        ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => handleSelectDoc(doc)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={14} className={selectedDoc?.id === doc.id ? "text-red-400" : "text-white/30"} />
                      <span className="truncate">{doc.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc);
                      }}
                      disabled={isDeletingDocId === doc.id}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity"
                      title="Delete Doc"
                    >
                      {isDeletingDocId === doc.id ? (
                        <Loader2 size={11} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profile footer */}
          {isAuthenticated && firebaseUser && (
            <div className="p-4 border-t border-white/10 shrink-0 bg-white/2 flex flex-col space-y-3">
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
                  <p className="text-[9px] text-white/30 leading-none">Reviewer</p>
                  <p className="text-[11px] font-medium text-white truncate mt-1">
                    {firebaseUser.displayName || firebaseUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full p-1.5 rounded-lg border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[10px] font-mono flex items-center justify-center gap-1.5"
              >
                <LogOut size={11} />
                <span>SIGN OUT</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Panel: Content Canvas Preview */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                DOCUMENT BODY CANVAS
              </h3>
              {isAuthenticated && (
                <button
                  onClick={() => token && fetchDocuments(token, searchQuery)}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Google Docs"
                >
                  <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <FileText size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Docs Authorization Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Account to list document drafts, read layout contents, write text lines directly into drafts, and inspect file details inside the console.
              </p>
              
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="bg-white hover:bg-neutral-200 text-black py-2.5 px-5 rounded-xl font-medium tracking-wide shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center gap-3 text-xs"
              >
                {isSigningIn ? (
                  <Loader2 className="animate-spin text-black" size={15} />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Connect Google Docs</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <form onSubmit={handleSearchSubmit} className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-white/40 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-xs text-white hover:bg-white/10 hover:text-white font-mono"
                >
                  FILTER
                </button>
              </form>

              {/* Document display board */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
                {isLoadingDoc ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-xs font-mono text-white/40 uppercase">Downloading document draft structure...</p>
                  </div>
                ) : docDetails ? (
                  <div className="w-full flex-1 flex flex-col justify-between space-y-6">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 min-h-[300px] max-h-[450px] overflow-y-auto relative shadow-2xl flex flex-col justify-between">
                      
                      {/* Hologram aesthetic lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none rounded-2xl" />

                      <div className="z-10 flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          DOCUMENT VIEW
                        </span>
                        <span className="text-[9px] font-mono text-white/40">
                          ID: {docDetails.documentId}
                        </span>
                      </div>

                      {/* Display content */}
                      <div className="z-10 flex-1 py-4 font-sans text-xs md:text-sm text-white/95 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[320px]">
                        {extractDocText(docDetails)}
                      </div>

                      <div className="z-10 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <AlignLeft size={12} className="text-red-400" />
                          <span className="text-[10px] font-mono text-white/40">
                            Total characters: {extractDocText(docDetails).length}
                          </span>
                        </div>

                        {selectedDoc?.webViewLink && (
                          <a
                            href={selectedDoc.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 text-[10px] font-mono uppercase"
                          >
                            <PenTool size={10} className="text-red-400" />
                            <span>OPEN IN WORKSPACE</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <FileText size={36} className="opacity-35 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No document selected</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Select a Google Doc draft from the left sidebar or initialize a new blank layout template to inspect outline text blocks and compose paragraph updates.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side Control: Composer Panel */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* CREATE DOC TEMPLATE FORM */
                <motion.form
                  key="create-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateDoc}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Create Google Doc
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Document Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Synapse Briefing Report"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase">
                        <HelpCircle size={10} />
                        <span>Google Docs Context</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                        This operation provisions a standard digital Document inside Google Drive under your personal or workspace profile. Once drafted, you can easily append text paragraphs immediately from our console.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreating || !newDocTitle.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>CREATE DOC</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : isAppendOpen && selectedDoc ? (
                /* APPEND CONTENT FORM */
                <motion.form
                  key="append-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleAppendText}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Append Text Segment
                      </h3>
                    </div>

                    <p className="text-[10px] font-mono text-white/40 uppercase leading-none truncate">
                      File: {selectedDoc.name}
                    </p>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Content to Append</label>
                      <textarea
                        required
                        placeholder="Type standard paragraphs, lines, or status items to merge into this document file..."
                        rows={10}
                        value={appendText}
                        onChange={(e) => setAppendText(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none font-sans leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isAppending || !appendText.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAppending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>APPEND TEXT</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAppendOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : selectedDoc && docDetails ? (
                /* DOCUMENT SUMMARY / OVERVIEW PANEL */
                <motion.div
                  key="doc-overview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Active File</span>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {docDetails.title}
                      </h3>
                      <p className="text-[9px] font-mono text-white/30">
                        DOCUMENT ID: {docDetails.documentId}
                      </p>
                    </div>

                    <div className="border-t border-b border-white/5 py-4 space-y-3 font-mono text-[11px] text-white/50">
                      <div className="flex gap-2.5 items-center">
                        <FileText size={12} className="text-red-400" />
                        <span className="text-white/80">
                          MimeType: <strong className="font-semibold text-white">Google Doc</strong>
                        </span>
                      </div>
                      {selectedDoc.modifiedTime && (
                        <div className="flex gap-2.5 items-center">
                          <Calendar size={12} className="text-rose-400" />
                          <span className="text-white/80">
                            Modified: {new Date(selectedDoc.modifiedTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick helper tips */}
                    <div className="p-4 rounded-2xl bg-red-600/5 border border-red-500/10 space-y-2">
                      <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Holographic Document Tips</h4>
                      <ul className="text-[10px] text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                        <li>The body preview extracts structural text layers in real-time.</li>
                        <li>Click "Append Text" below to insert bullet items or headers at the end of the file.</li>
                        <li>Launch "Open in Workspace" to access Google's original full-featured Docs rich editor.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button
                      onClick={() => setIsAppendOpen(true)}
                      className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileEdit size={12} />
                      <span>APPEND CONTENT</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDoc(selectedDoc)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-mono rounded-xl cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* EMPTY PLACEHOLDER */
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <FileText size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No document selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a document template from the left side panel list or compose a brand new draft to begin writing texts, editing summaries, and archiving folders.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
