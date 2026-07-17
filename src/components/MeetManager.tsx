import React, { useState, useEffect } from "react";
import { 
  Video, VideoOff, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, Play, ExternalLink, HelpCircle,
  Users, Clock, Settings, ShieldAlert, ShieldCheck, Info, Sparkles,
  Layers, Calendar, ChevronRight, Activity, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface MeetSpace {
  name: string; // e.g. spaces/abc-defg-hij
  meetingUri: string; // e.g. https://meet.google.com/abc-defg-hij
  meetingCode: string; // e.g. abc-defg-hij
  config?: {
    accessType?: "ACCESS_TYPE_UNSPECIFIED" | "OPEN" | "TRUSTED" | "RESTRICTED";
    entryPointAccess?: "ENTRY_POINT_ACCESS_UNSPECIFIED" | "ALL" | "CREATOR_ONLY";
  };
}

interface ConferenceRecord {
  name: string; // e.g. conferenceRecords/abc-defg-hij
  startTime?: string;
  endTime?: string;
  space?: string; // e.g. spaces/abc-defg-hij
}

interface Participant {
  name: string;
  earliestStartTime?: string;
  latestEndTime?: string;
}

interface MeetManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function MeetManager({ onClose, isGhostMode = false, onToast }: MeetManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Spaces list and history list
  const [spaces, setSpaces] = useState<MeetSpace[]>([]);
  const [conferences, setConferences] = useState<ConferenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"spaces" | "history">("spaces");

  // Selected space and full details
  const [selectedSpace, setSelectedSpace] = useState<MeetSpace | null>(null);
  const [selectedConference, setSelectedConference] = useState<ConferenceRecord | null>(null);
  const [conferenceParticipants, setConferenceParticipants] = useState<Participant[]>([]);
  const [isLoadingConferenceDetails, setIsLoadingConferenceDetails] = useState(false);

  // Creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accessType, setAccessType] = useState<"OPEN" | "TRUSTED" | "RESTRICTED">("TRUSTED");
  const [entryPointAccess, setEntryPointAccess] = useState<"ALL" | "CREATOR_ONLY">("ALL");
  const [isCreating, setIsCreating] = useState(false);

  // Initialize Auth & load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        // Load default lists
        fetchSpaces(cachedToken);
        fetchHistory(cachedToken);
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
        onToast("Google Meet access authorized!");
        fetchSpaces(result.accessToken);
        fetchHistory(result.accessToken);
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
      setSpaces([]);
      setConferences([]);
      setSelectedSpace(null);
      setSelectedConference(null);
      setIsCreateOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Create standard or custom Google Meet Space
  const createMeetingSpace = async () => {
    if (!token) return;
    setIsCreating(true);
    try {
      const response = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          config: {
            accessType: accessType,
            entryPointAccess: entryPointAccess
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create Meet Space");
      }

      const data = await response.json();
      
      const newSpace: MeetSpace = {
        name: data.name,
        meetingUri: data.meetingUri,
        meetingCode: data.meetingCode,
        config: data.config
      };

      // Prepend to current spaces
      setSpaces(prev => [newSpace, ...prev]);
      setSelectedSpace(newSpace);
      setIsCreateOpen(false);
      onToast("Google Meet Space created successfully!");
    } catch (err) {
      console.error("Error creating space:", err);
      onToast("Could not create meeting space.");
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch or mock created spaces list
  // The Meet API doesn't have a direct simple "List Spaces" endpoint (it relies on spaces we track, or drive, or past conferences)
  // We can load some preset/cached spaces or fetch past records to infer spaces, and let users track created rooms.
  const fetchSpaces = async (accessToken: string) => {
    setIsLoading(true);
    try {
      // We will look for spaces in our local storage tracker to persist active virtual rooms
      const cached = localStorage.getItem("zoya_meet_spaces");
      if (cached) {
        setSpaces(JSON.parse(cached));
      } else {
        // Provide some initial spaces for a warm start
        const initialSpaces: MeetSpace[] = [
          {
            name: "spaces/huddles-room",
            meetingUri: "https://meet.google.com/zoy-hudl-vce",
            meetingCode: "zoy-hudl-vce",
            config: {
              accessType: "TRUSTED",
              entryPointAccess: "ALL"
            }
          }
        ];
        setSpaces(initialSpaces);
        localStorage.setItem("zoya_meet_spaces", JSON.stringify(initialSpaces));
      }
    } catch (err) {
      console.error("Error loading spaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync spaces list to local storage
  useEffect(() => {
    if (spaces.length > 0) {
      localStorage.setItem("zoya_meet_spaces", JSON.stringify(spaces));
    }
  }, [spaces]);

  // Fetch past Conference Records (History)
  const fetchHistory = async (accessToken: string) => {
    try {
      const response = await fetch("https://meet.googleapis.com/v2/conferenceRecords?pageSize=10", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conference records");
      }

      const data = await response.json();
      setConferences(data.conferenceRecords || []);
    } catch (err) {
      console.error("Error listing history:", err);
    }
  };

  // Load participants for a selected past conference
  const loadConferenceParticipants = async (conferenceName: string) => {
    if (!token) return;
    setIsLoadingConferenceDetails(true);
    try {
      const response = await fetch(`https://meet.googleapis.com/v2/${conferenceName}/participants`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load participants");
      }

      const data = await response.json();
      setConferenceParticipants(data.participants || []);
    } catch (err) {
      console.error("Error fetching participants:", err);
      setConferenceParticipants([]);
    } finally {
      setIsLoadingConferenceDetails(false);
    }
  };

  const handleDeleteSpace = (spaceCode: string) => {
    const confirmed = window.confirm("Are you sure you want to remove this space from your quick access list? This will not delete the space on Google's servers but will remove it from Zoya.");
    if (!confirmed) return;

    setSpaces(prev => prev.filter(s => s.meetingCode !== spaceCode));
    if (selectedSpace?.meetingCode === spaceCode) {
      setSelectedSpace(null);
    }
    onToast("Meeting space removed from local shortcuts.");
  };

  const handleSelectSpace = (space: MeetSpace) => {
    setSelectedSpace(space);
    setSelectedConference(null);
  };

  const handleSelectConference = (conf: ConferenceRecord) => {
    setSelectedConference(conf);
    setSelectedSpace(null);
    loadConferenceParticipants(conf.name);
  };

  // Helper to format dates
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Helper to calculate meeting duration
  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return "";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div id="meet-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="meet-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Top laser accent strip */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Side: Rooms & Records Drawer */}
        <div className="w-full md:w-[260px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-5">
            {/* Component Title */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Meet
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Communications Hub</p>
              </div>
            </div>

            {/* Quick Actions if authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setSelectedSpace(null);
                  setSelectedConference(null);
                }}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-2.5 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>CREATE SPACE</span>
              </button>
            )}

            {/* Tab Swapper */}
            {isAuthenticated && (
              <div className="grid grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setActiveTab("spaces");
                    setSelectedConference(null);
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                    activeTab === "spaces" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                  }`}
                >
                  SPACES
                </button>
                <button
                  onClick={() => {
                    setActiveTab("history");
                    setSelectedSpace(null);
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                    activeTab === "history" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                  }`}
                >
                  HISTORY
                </button>
              </div>
            )}

            {/* Left listings */}
            {isAuthenticated && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                  <span>{activeTab === "spaces" ? "Your Meeting Rooms" : "Past Conferences"}</span>
                  <button
                    onClick={() => token && (activeTab === "spaces" ? fetchSpaces(token) : fetchHistory(token))}
                    className="hover:text-white"
                    title="Refresh List"
                  >
                    <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="space-y-1">
                  {activeTab === "spaces" ? (
                    spaces.length > 0 ? (
                      spaces.map((s) => (
                        <div
                          key={s.meetingCode}
                          onClick={() => handleSelectSpace(s)}
                          className={`group w-full flex items-center justify-between rounded-xl px-3 py-2 text-left font-mono text-xs cursor-pointer transition-all ${
                            selectedSpace?.meetingCode === s.meetingCode
                              ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Video size={13} className={selectedSpace?.meetingCode === s.meetingCode ? "text-red-400" : "text-white/30"} />
                            <span className="truncate">{s.meetingCode}</span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSpace(s.meetingCode);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity"
                            title="Remove Shortcut"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] font-mono text-white/20 text-center py-4">No rooms tracked.</p>
                    )
                  ) : (
                    conferences.length > 0 ? (
                      conferences.map((c) => {
                        const code = c.name.split("/")[1];
                        return (
                          <div
                            key={c.name}
                            onClick={() => handleSelectConference(c)}
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left font-mono text-xs cursor-pointer transition-all ${
                              selectedConference?.name === c.name
                                ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                                : "text-white/60 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-white truncate">{code}</span>
                              <span className="text-[9px] text-white/30 truncate mt-0.5">
                                {formatDate(c.startTime)}
                              </span>
                            </div>
                            <ChevronRight size={12} className="text-white/20 shrink-0" />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] font-mono text-white/20 text-center py-4">No past history detected.</p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile footer */}
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
                  <p className="text-[9px] text-white/30 leading-none">Supervisor</p>
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

        {/* Center Panel: Active Workspace / Console */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                MEET SESSION MANAGER
              </h3>
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
                <Video size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Meet Access Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your workspace account to initiate video calls, create custom secured meeting spaces, and view historic meeting logs inside Zoya.
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
                <span>Authorize Google Meet</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {selectedSpace ? (
                /* SPACE DETAILS VIEW */
                <div className="space-y-6">
                  <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none rounded-2xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          ACTIVE MEETING SPACE
                        </span>
                        <h2 className="text-xl font-serif font-semibold text-white mt-2">
                          {selectedSpace.meetingCode}
                        </h2>
                        <p className="text-xs text-white/50 font-mono mt-1">
                          URI: {selectedSpace.meetingUri}
                        </p>
                      </div>

                      <a
                        href={selectedSpace.meetingUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 tracking-wider shadow-lg active:scale-95 transition-all self-start md:self-auto cursor-pointer"
                      >
                        <Play size={12} fill="white" />
                        <span>JOIN SESSION</span>
                        <ArrowUpRight size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Settings and Config Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                      Space Protection & Rules
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex gap-3.5 items-start">
                        <div className="p-2 rounded-lg bg-red-600/10 text-red-400 shrink-0">
                          <Settings size={15} />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-white/40 uppercase">Access Type</p>
                          <p className="text-xs font-semibold text-white mt-1">
                            {selectedSpace.config?.accessType || "TRUSTED"}
                          </p>
                          <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                            Controls who can join directly. OPEN lets anyone in, TRUSTED requires knocks for outsiders, and RESTRICTED limits strictly.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex gap-3.5 items-start">
                        <div className="p-2 rounded-lg bg-rose-600/10 text-rose-400 shrink-0">
                          <Users size={15} />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-white/40 uppercase">Entry Restriction</p>
                          <p className="text-xs font-semibold text-white mt-1">
                            {selectedSpace.config?.entryPointAccess || "ALL_PARTICIPANTS"}
                          </p>
                          <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                            Specifies if external dial-in methods or specific links can allow entry before the host begins.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invitation snippet */}
                  <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                    <p className="text-[10px] font-mono text-white/40 uppercase">Session Invitation</p>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/10 flex justify-between items-center">
                      <span className="text-xs font-mono text-white/80 select-all truncate">
                        Join my Google Meet: {selectedSpace.meetingUri}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Join my Google Meet: ${selectedSpace.meetingUri}`);
                          onToast("Meeting invitation copied to clipboard!");
                        }}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 ml-2 shrink-0 cursor-pointer"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedConference ? (
                /* PAST CONFERENCE DETAILS VIEW */
                <div className="space-y-6">
                  <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none rounded-2xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-2">
                      <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block self-start">
                        CONFERENCE HISTORY LOG
                      </span>
                      <h2 className="text-xl font-serif font-semibold text-white mt-2">
                        ID: {selectedConference.name.split("/")[1]}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 font-mono mt-1">
                        <span>Start: {formatDate(selectedConference.startTime)}</span>
                        <span>•</span>
                        <span>End: {formatDate(selectedConference.endTime)}</span>
                        <span>•</span>
                        <span className="text-red-400 font-bold">
                          Duration: {formatDuration(selectedConference.startTime, selectedConference.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Participant specs */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1 flex items-center justify-between">
                      <span>Verified Participants ({conferenceParticipants.length})</span>
                      {isLoadingConferenceDetails && <Loader2 size={11} className="animate-spin text-red-500" />}
                    </h4>

                    {conferenceParticipants.length > 0 ? (
                      <div className="space-y-2">
                        {conferenceParticipants.map((p, pIdx) => {
                          const pId = p.name.split("/").pop() || "Participant";
                          return (
                            <div key={pIdx} className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex justify-between items-center">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold">
                                  {pId.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-white font-mono">{pId}</p>
                                  <p className="text-[9px] text-white/40 mt-0.5">ID: {p.name}</p>
                                </div>
                              </div>

                              <div className="text-right text-[10px] font-mono text-white/50">
                                <p>In: {formatDate(p.earliestStartTime)}</p>
                                <p className="mt-0.5">Out: {formatDate(p.latestEndTime)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/30 font-mono text-xs">
                        No participants recorded or loaded for this historic session.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* NO SELECTION WELCOME SCREEN */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30">
                  <Video size={36} className="opacity-35 mb-2 text-red-500/40 animate-pulse" />
                  <p className="text-xs font-mono uppercase tracking-wider">No session selected</p>
                  <p className="text-[10px] mt-1 max-w-xs leading-normal">
                    Select an active Google Meet room shortcut from the sidebar or inspect previous conference logs to review duration data and participants.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Control: Form Space Composer / Creation */}
        <div className="hidden md:flex md:w-[360px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* SPACE DESIGN PANEL */
                <motion.div
                  key="create-space"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Configure Space Settings
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Access Privacy Level</label>
                      <select
                        value={accessType}
                        onChange={(e: any) => setAccessType(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-red-500/50 font-mono"
                      >
                        <option value="OPEN">OPEN (Anyone can join directly)</option>
                        <option value="TRUSTED">TRUSTED (Guests knock for entry)</option>
                        <option value="RESTRICTED">RESTRICTED (Pre-approved only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Entry Restrictions</label>
                      <select
                        value={entryPointAccess}
                        onChange={(e: any) => setEntryPointAccess(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-red-500/50 font-mono"
                      >
                        <option value="ALL">ALL (Allowed pre-joins)</option>
                        <option value="CREATOR_ONLY">CREATOR ONLY (No early join)</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase">
                        <Info size={10} />
                        <span>Google Meet Spaces API</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                        Spaces act as persistent virtual rooms. Once designed, the meeting code survives indefinitely, allowing you to re-use the room and access historical data.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      onClick={createMeetingSpace}
                      disabled={isCreating}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>LAUNCH SPACE</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsCreateOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.div>
              ) : selectedSpace ? (
                /* SPACE SUMMARY PANEL */
                <motion.div
                  key="space-overview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Active Space</span>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words font-mono">
                        {selectedSpace.meetingCode}
                      </h3>
                      <p className="text-[9px] font-mono text-white/30 truncate">
                        NAME: {selectedSpace.name}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-red-600/5 border border-red-500/10 space-y-2">
                      <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Session Tips</h4>
                      <ul className="text-[10px] text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                        <li>Launch the original Google Meet UI directly in your browser.</li>
                        <li>This meeting code can be distributed to external attendees.</li>
                        <li>Once finished, find session analytics under the "History" tab.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 space-y-2">
                    <div className="flex gap-2">
                      <a
                        href={selectedSpace.meetingUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play size={12} fill="white" />
                        <span>JOIN LIVE</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* GENERAL APP STATS PANEL */
                <motion.div
                  key="general-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-red-400" />
                      <h3 className="text-xs font-mono text-white uppercase tracking-wider">
                        Workspace Overview
                      </h3>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                      <p className="text-xs text-white/70 leading-relaxed font-sans">
                        Google Meet helps teams connect face-to-face. Zoya allows you to create customized virtual spaces and view past meeting participant reports immediately.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-mono text-white/40">
                        <span>Meeting Spaces Tracked</span>
                        <span className="text-white">{spaces.length}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-white/40">
                        <span>Past Conferences Saved</span>
                        <span className="text-white">{conferences.length}</span>
                      </div>
                    </div>
                  </div>

                  {isAuthenticated && (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl font-mono text-xs text-white uppercase transition-colors cursor-pointer"
                    >
                      INITIALIZE NEW SPACE
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
