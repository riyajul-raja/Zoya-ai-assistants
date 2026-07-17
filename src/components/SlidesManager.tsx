import React, { useState, useEffect } from "react";
import { 
  Tv, Presentation, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, Layout, FileText, Image as ImageIcon, 
  Layers, PlusCircle, ArrowLeft, ArrowRight, Play, ExternalLink, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface SlideshowFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface SlidePage {
  objectId: string;
  slideLayoutReference?: {
    predefinedLayout?: string;
  };
  pageElements?: Array<{
    objectId: string;
    size?: {
      width: { magnitude: number; unit: string };
      height: { magnitude: number; unit: string };
    };
    transform?: any;
    shape?: {
      shapeType: string;
      text?: {
        textElements?: Array<{
          endIndex: number;
          paragraphMarker?: any;
          textRun?: {
            content: string;
            style?: any;
          };
        }>;
      };
    };
    image?: {
      contentUrl: string;
    };
  }>;
}

interface PresentationDetails {
  presentationId: string;
  title: string;
  slides?: SlidePage[];
}

interface SlidesManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function SlidesManager({ onClose, isGhostMode = false, onToast }: SlidesManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Slideshow lists state
  const [presentations, setPresentations] = useState<SlideshowFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected Presentation and Slide Details
  const [selectedPres, setSelectedPres] = useState<SlideshowFile | null>(null);
  const [presDetails, setPresDetails] = useState<PresentationDetails | null>(null);
  const [isLoadingPres, setIsLoadingPres] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Create Presentation Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presTitle, setPresTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Add Slide Form States
  const [isAddSlideOpen, setIsAddSlideOpen] = useState(false);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideBody, setSlideBody] = useState("");
  const [isAddingSlide, setIsAddingSlide] = useState(false);

  // Deleting States
  const [isDeletingPresId, setIsDeletingPresId] = useState<string | null>(null);
  const [isDeletingSlideId, setIsDeletingSlideId] = useState<string | null>(null);

  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchPresentations(cachedToken);
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
        onToast("Google Slides access authorized!");
        fetchPresentations(result.accessToken);
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
      setPresentations([]);
      setSelectedPres(null);
      setPresDetails(null);
      setIsCreateOpen(false);
      setIsAddSlideOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch presentations using Drive API search
  const fetchPresentations = async (accessToken: string, queryStr = "") => {
    setIsLoading(true);
    try {
      let q = "mimeType = 'application/vnd.google-apps.presentation' and trashed = false";
      if (queryStr) {
        q += ` and name contains '${queryStr.replace(/'/g, "\\'")}'`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=40`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load presentations from Drive");
      }

      const data = await response.json();
      setPresentations(data.files || []);
    } catch (err) {
      console.error("Error listing presentations:", err);
      onToast("Failed to fetch slideshow presentations.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch full details of selected presentation
  const loadPresentationDetails = async (presId: string, accessToken: string) => {
    setIsLoadingPres(true);
    try {
      const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load presentation slides");
      }

      const data = await response.json();
      setPresDetails(data);
      setActiveSlideIndex(0);
    } catch (err) {
      console.error("Error loading slides details:", err);
      onToast("Could not retrieve presentation slides.");
      setPresDetails(null);
    } finally {
      setIsLoadingPres(false);
    }
  };

  const handleSelectPresentation = (pres: SlideshowFile) => {
    setSelectedPres(pres);
    setIsCreateOpen(false);
    setIsAddSlideOpen(false);
    if (token) {
      loadPresentationDetails(pres.id, token);
    }
  };

  // Create presentation
  const handleCreatePres = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presTitle.trim() || !token) {
      onToast("Please input a presentation name.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("https://slides.googleapis.com/v1/presentations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: presTitle.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to create presentation");
      }

      const newPres = await response.json();
      onToast(`Created presentation "${newPres.title}"!`);
      setPresTitle("");
      setIsCreateOpen(false);
      
      // Update local list
      const updatedFile: SlideshowFile = {
        id: newPres.presentationId,
        name: newPres.title,
        mimeType: "application/vnd.google-apps.presentation",
        modifiedTime: new Date().toISOString()
      };

      setPresentations([updatedFile, ...presentations]);
      handleSelectPresentation(updatedFile);
    } catch (err) {
      console.error("Error creating presentation:", err);
      onToast("Failed to create presentation.");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete presentation from Google Drive
  const handleDeletePres = async (pres: SlideshowFile) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE SYSTEM WORKSPACE OPERATIONS
    const confirmed = window.confirm(`Permanently delete "${pres.name}" from your Google Slides and Google Drive? This cannot be undone.`);
    if (!confirmed) return;

    if (!token) return;
    setIsDeletingPresId(pres.id);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${pres.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete slideshow");
      }

      onToast("Presentation deleted from Drive.");
      setPresentations(presentations.filter((p) => p.id !== pres.id));
      if (selectedPres?.id === pres.id) {
        setSelectedPres(null);
        setPresDetails(null);
      }
    } catch (err) {
      console.error("Error deleting presentation:", err);
      onToast("Failed to delete presentation.");
    } finally {
      setIsDeletingPresId(null);
    }
  };

  // Add slide to current presentation
  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPres || !presDetails) return;

    if (!slideTitle.trim() && !slideBody.trim()) {
      onToast("Please supply slide title or body text.");
      return;
    }

    setIsAddingSlide(true);
    try {
      const slideId = `slide_custom_${Date.now()}`;
      const titleId = `title_custom_${Date.now()}`;
      const bodyId = `body_custom_${Date.now()}`;

      // We'll construct requests for a title & body layout slide
      const requests = [
        // 1. Create a slide
        {
          createSlide: {
            objectId: slideId,
            slideLayoutReference: {
              predefinedLayout: "TITLE_AND_BODY"
            },
            placeholderIdBindings: [
              {
                layoutPlaceholder: {
                  type: "TITLE",
                  index: 0
                },
                objectId: titleId
              },
              {
                layoutPlaceholder: {
                  type: "BODY",
                  index: 0
                },
                objectId: bodyId
              }
            ]
          }
        },
        // 2. Set Slide Title text if provided
        {
          insertText: {
            objectId: titleId,
            text: slideTitle.trim()
          }
        },
        // 3. Set Slide Body text if provided
        {
          insertText: {
            objectId: bodyId,
            text: slideBody.trim()
          }
        }
      ];

      const response = await fetch(
        `https://slides.googleapis.com/v1/presentations/${selectedPres.id}:batchUpdate`,
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
        throw new Error("Failed to add slide");
      }

      onToast("New slide inserted successfully!");
      setSlideTitle("");
      setSlideBody("");
      setIsAddSlideOpen(false);

      // Reload presentation details
      loadPresentationDetails(selectedPres.id, token);
    } catch (err) {
      console.error("Error adding slide:", err);
      onToast("Could not insert slide layout.");
    } finally {
      setIsAddingSlide(false);
    }
  };

  // Delete slide from presentation
  const handleDeleteSlide = async (slideObjectId: string) => {
    if (!token || !selectedPres || !presDetails) return;
    
    const confirmed = window.confirm(`Permanently delete slide index #${activeSlideIndex + 1} from this presentation?`);
    if (!confirmed) return;

    setIsDeletingSlideId(slideObjectId);
    try {
      const requests = [
        {
          deleteObject: {
            objectId: slideObjectId
          }
        }
      ];

      const response = await fetch(
        `https://slides.googleapis.com/v1/presentations/${selectedPres.id}:batchUpdate`,
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
        throw new Error("Failed to delete slide");
      }

      onToast("Slide removed from presentation.");
      loadPresentationDetails(selectedPres.id, token);
    } catch (err) {
      console.error("Error deleting slide:", err);
      onToast("Failed to delete slide.");
    } finally {
      setIsDeletingSlideId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchPresentations(token, searchQuery);
    }
  };

  // Extract text elements inside slide
  const extractSlideText = (slide: SlidePage) => {
    if (!slide.pageElements) return "Empty slide canvas";
    
    const texts: string[] = [];
    slide.pageElements.forEach((el) => {
      if (el.shape?.text?.textElements) {
        const textRuns = el.shape.text.textElements
          .map((te) => te.textRun?.content || "")
          .join("")
          .trim();
        if (textRuns) {
          texts.push(textRuns);
        }
      }
    });

    return texts.join("\n\n") || "No text content found on this slide page.";
  };

  return (
    <div id="slides-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="slides-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top strip bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Side: Presentations list drawer and Profile */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Slides
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Presentation Console</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setSelectedPres(null);
                  setPresDetails(null);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>NEW SLIDESHOW</span>
              </button>
            )}

            {/* List Navigation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                <span>Presentations</span>
              </div>

              <div className="space-y-1">
                {presentations.map((pres) => (
                  <div
                    key={pres.id}
                    className={`group w-full flex items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs cursor-pointer transition-colors ${
                      selectedPres?.id === pres.id
                        ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => handleSelectPresentation(pres)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Presentation size={14} className={selectedPres?.id === pres.id ? "text-red-400" : "text-white/30"} />
                      <span className="truncate">{pres.name}</span>
                    </div>
                    
                    {/* Delete list button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePres(pres);
                      }}
                      disabled={isDeletingPresId === pres.id}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity"
                      title="Delete presentation"
                    >
                      {isDeletingPresId === pres.id ? (
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

          {/* User Profile Footer */}
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
                  <p className="text-[9px] text-white/30 leading-none">Presenter</p>
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

        {/* Center Pane: Slide Viewer */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Tv size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                SLIDE CANAVS PREVIEW
              </h3>
              {isAuthenticated && (
                <button
                  onClick={() => token && fetchPresentations(token, searchQuery)}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Presentations"
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
                <Presentation size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Slides Authorization Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Account to create presentations, inspect slide deck layers, and coordinate live displays inside the cockpit.
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
                <span>Connect Google Slides</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <form onSubmit={handleSearch} className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search presentations..."
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

              {/* Main Preview Container */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative">
                {isLoadingPres ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-xs font-mono text-white/40 uppercase">Mapping holographic presentation slides...</p>
                  </div>
                ) : presDetails && presDetails.slides && presDetails.slides.length > 0 ? (
                  <div className="w-full max-w-2xl flex flex-col space-y-4">
                    {/* Interactive Virtual Slide Canvas (16:9 Aspect Ratio Container) */}
                    <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between p-6 overflow-hidden group">
                      
                      {/* Holographic scanner effect line */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none" />

                      {/* Header context */}
                      <div className="flex items-center justify-between z-10">
                        <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Slide {activeSlideIndex + 1} of {presDetails.slides.length}
                        </span>
                        <div className="flex gap-1">
                          <span className="text-[9px] font-mono text-white/40">
                            ID: {presDetails.slides[activeSlideIndex].objectId}
                          </span>
                        </div>
                      </div>

                      {/* Render Slide Text content using premium displays */}
                      <div className="flex-1 flex flex-col justify-center my-4 z-10 text-center max-h-[70%] overflow-y-auto">
                        <p className="text-lg md:text-xl font-serif font-medium text-white tracking-wide leading-relaxed whitespace-pre-wrap">
                          {extractSlideText(presDetails.slides[activeSlideIndex])}
                        </p>
                      </div>

                      {/* Interactive slide navigation controls */}
                      <div className="flex items-center justify-between mt-auto z-10 pt-2 border-t border-white/5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                            disabled={activeSlideIndex === 0}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-25 text-white cursor-pointer"
                            title="Previous Slide"
                          >
                            <ArrowLeft size={13} />
                          </button>
                          <button
                            onClick={() => setActiveSlideIndex(Math.min(presDetails.slides!.length - 1, activeSlideIndex + 1))}
                            disabled={activeSlideIndex === presDetails.slides.length - 1}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-25 text-white cursor-pointer"
                            title="Next Slide"
                          >
                            <ArrowRight size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteSlide(presDetails.slides![activeSlideIndex].objectId)}
                            disabled={isDeletingSlideId !== null}
                            className="p-1.5 rounded-lg border border-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete This Slide"
                          >
                            {isDeletingSlideId === presDetails.slides[activeSlideIndex].objectId ? (
                              <Loader2 size={12} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                          
                          {selectedPres?.webViewLink && (
                            <a
                              href={selectedPres.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1 text-[10px] font-mono uppercase"
                            >
                              <Play size={10} className="text-red-400" />
                              <span>LIVE SHOW</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Quick navigation thumbnail indices */}
                    <div className="flex flex-wrap gap-1.5 items-center justify-center max-h-[70px] overflow-y-auto pt-1">
                      {presDetails.slides.map((slide, index) => (
                        <button
                          key={slide.objectId}
                          onClick={() => setActiveSlideIndex(index)}
                          className={`w-7 h-7 rounded-lg border font-mono text-[10px] flex items-center justify-center transition-all ${
                            activeSlideIndex === index 
                              ? "bg-red-500 border-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)] font-bold scale-105" 
                              : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                      
                      {/* Plus Button to insert slide inline */}
                      <button
                        onClick={() => setIsAddSlideOpen(true)}
                        className="w-7 h-7 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 flex items-center justify-center transition-all cursor-pointer"
                        title="Add Slide to presentation"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ) : selectedPres ? (
                  <div className="text-center p-6 text-white/30 flex flex-col items-center">
                    <Layers size={32} className="opacity-35 mb-3 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">Presentation Deck Empty</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      No slides found inside this presentation. Click below to add your first presentation slide page.
                    </p>
                    <button
                      onClick={() => setIsAddSlideOpen(true)}
                      className="mt-4 border border-red-500/30 hover:border-red-500 bg-red-600/10 hover:bg-red-600 text-white py-1.5 px-4 rounded-xl text-[11px] font-mono uppercase tracking-wider"
                    >
                      Add First Slide
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 text-white/30 flex flex-col items-center">
                    <Presentation size={36} className="opacity-35 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No presentation selected</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Select a slide deck presentation from the left sidebar or create a brand new one to inspect individual slides, edit content, and view details.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Pane: Slide Composer OR Slideshow Creator */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* Slideshow Deck Creator Form */
                <motion.form
                  key="slideshow-creator"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreatePres}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Create Presentation
                      </h3>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Presentation Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Synapse Product Pitch"
                        value={presTitle}
                        onChange={(e) => setPresTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase">
                        <HelpCircle size={10} />
                        <span>Slides Integration Info</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        This operation initializes a standard 16:9 widescreen layout presentation under your primary Google Account in Drive. Once created, you can append slides, title layouts, and texts immediately.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreating || !presTitle.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>CREATE DECK</span>
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
              ) : isAddSlideOpen && selectedPres ? (
                /* Add Slide Composer Form */
                <motion.form
                  key="slide-composer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleAddSlide}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Add New Slide
                      </h3>
                    </div>

                    <p className="text-[10px] font-mono text-white/40 uppercase leading-none">
                      Deck: {selectedPres.name}
                    </p>

                    {/* Slide Title */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Slide Header / Title</label>
                      <input
                        type="text"
                        placeholder="E.g., Key Milestones"
                        value={slideTitle}
                        onChange={(e) => setSlideTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Slide Body */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Slide Body / Bullet text</label>
                      <textarea
                        placeholder="Write paragraph sentences or bullet summaries for this page canvas..."
                        rows={8}
                        value={slideBody}
                        onChange={(e) => setSlideBody(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none font-sans leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isAddingSlide || (!slideTitle.trim() && !slideBody.trim())}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAddingSlide ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>INSERT SLIDE</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddSlideOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : selectedPres && presDetails ? (
                /* Selected Presentation Overview Panel */
                <motion.div
                  key="pres-overview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Selected Deck</span>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {presDetails.title}
                      </h3>
                      <p className="text-[9px] font-mono text-white/30">
                        DECK ID: {presDetails.presentationId}
                      </p>
                    </div>

                    <div className="border-t border-b border-white/5 py-4 space-y-3 font-mono text-[11px] text-white/50">
                      <div className="flex gap-2.5 items-center">
                        <Layout size={12} className="text-red-400" />
                        <span className="text-white/80">
                          Slides: <strong className="font-semibold text-white">{presDetails.slides?.length || 0}</strong> pages
                        </span>
                      </div>
                      {selectedPres.modifiedTime && (
                        <div className="flex gap-2.5 items-center">
                          <FileText size={12} className="text-rose-400" />
                          <span className="text-white/80">
                            Modified: {new Date(selectedPres.modifiedTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick helper tips */}
                    <div className="p-4 rounded-2xl bg-red-600/5 border border-red-500/10 space-y-2">
                      <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Holographic Deck Tips</h4>
                      <ul className="text-[10px] text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed">
                        <li>Toggle slide thumbnails in the center console preview screen.</li>
                        <li>Click "Insert Slide" to append slide layouts dynamically.</li>
                        <li>Use "Live Show" to open the deck inside the full Google Workspace Slides editor.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button
                      onClick={() => setIsAddSlideOpen(true)}
                      className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={12} />
                      <span>ADD NEW SLIDE</span>
                    </button>

                    <button
                      onClick={() => handleDeletePres(selectedPres)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-mono rounded-xl cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Empty Selection Placeholder */
                <motion.div
                  key="select-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <Presentation size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No deck selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a slideshow presentation or initialize a new presentation template to configure outline page structures, add body bullet points, or delete whole slide files.
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
