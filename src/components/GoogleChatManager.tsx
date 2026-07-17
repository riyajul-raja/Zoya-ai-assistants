import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Users, User, Plus, X, Loader2, LogOut, 
  RefreshCw, Send, Trash2, Search, ExternalLink, Hash, Info, 
  ChevronRight, AlertCircle, Sparkles, MessageCircle, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAA"
  displayName?: string;
  spaceType?: "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE";
  singleUserBotDm?: boolean;
  threaded?: boolean;
}

interface ChatMessage {
  name: string; // e.g. "spaces/AAAA/messages/BBBB"
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: "HUMAN" | "BOT";
  };
  text?: string;
  createTime?: string;
}

interface SpaceMembership {
  name: string; // e.g. "spaces/AAAA/memberships/BBBB"
  state?: "JOINED" | "INVITED" | "NOT_A_MEMBER";
  role?: "ROLE_MEMBER" | "ROLE_MANAGER";
  member?: {
    name?: string;
    displayName?: string;
    type?: "HUMAN" | "BOT";
    avatarUrl?: string;
  };
}

interface GoogleChatManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function GoogleChatManager({ onClose, isGhostMode = false, onToast }: GoogleChatManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Spaces List State
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "SPACE" | "DIRECT_MESSAGE">("ALL");

  // Active Space & Message Thread State
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Memberships list inside the selected space
  const [memberships, setMemberships] = useState<SpaceMembership[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // Create Space Form States
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  // Bottom scroll ref for messages
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchSpaces(cachedToken);
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

  // Auto-scroll to bottom when messages list updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingMessages]);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        onToast("Google Chat API authorized!");
        fetchSpaces(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Ensure scopes are approved.");
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
      setSelectedSpace(null);
      setMessages([]);
      setMemberships([]);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch Spaces from Google Chat API
  const fetchSpaces = async (accessToken: string) => {
    setIsLoadingSpaces(true);
    try {
      // Endpoint: GET https://chat.googleapis.com/v1/spaces
      const response = await fetch("https://chat.googleapis.com/v1/spaces?pageSize=100", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch spaces");
      }

      const data = await response.json();
      setSpaces(data.spaces || []);
    } catch (err: any) {
      console.error("Error listing spaces:", err);
      onToast(err.message || "Failed to load Google Chat Spaces.");
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Fetch Messages in Selected Space
  const fetchMessages = async (spaceName: string, accessToken: string) => {
    setIsLoadingMessages(true);
    try {
      // Endpoint: GET https://chat.googleapis.com/v1/{spaceName}/messages
      const response = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=50`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load message thread");
      }

      const data = await response.json();
      // Google Chat messages come oldest first usually or in chronological order. 
      // If we want newest at bottom, sorting might be helpful or default is fine.
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Error listing messages:", err);
      onToast("Could not retrieve messages in this space.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Fetch memberships in Selected Space
  const fetchMemberships = async (spaceName: string, accessToken: string) => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`https://chat.googleapis.com/v1/${spaceName}/memberships`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load memberships");
      }

      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (err) {
      console.error("Error listing memberships:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleSelectSpace = (space: ChatSpace) => {
    setSelectedSpace(space);
    setMessages([]);
    setMemberships([]);
    setShowMembersPanel(false);
    if (token) {
      fetchMessages(space.name, token);
      fetchMemberships(space.name, token);
    }
  };

  // Send message to active space
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedSpace || !token) return;

    setIsSendingMessage(true);
    const content = messageInput.trim();
    setMessageInput("");

    try {
      // Endpoint: POST https://chat.googleapis.com/v1/{spaceName}/messages
      const response = await fetch(`https://chat.googleapis.com/v1/${selectedSpace.name}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: content
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send message to Google Chat");
      }

      const sentMsg = await response.json();
      setMessages((prev) => [...prev, sentMsg]);
    } catch (err) {
      console.error("Error sending message:", err);
      onToast("Failed to dispatch message.");
      setMessageInput(content); // Restore content on fail
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Create Space
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || !token) return;

    setIsCreatingSpace(true);
    try {
      // Endpoint: POST https://chat.googleapis.com/v1/spaces
      const response = await fetch("https://chat.googleapis.com/v1/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          spaceType: "SPACE",
          displayName: newSpaceName.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Cannot create space. Ensure workspace permissions allow it.");
      }

      const newSpaceObj = await response.json();
      onToast(`Created Google Chat space: "${newSpaceObj.displayName}"!`);
      setNewSpaceName("");
      setIsCreateSpaceOpen(false);
      
      // Update local space list and select it
      setSpaces((prev) => [newSpaceObj, ...prev]);
      handleSelectSpace(newSpaceObj);
    } catch (err: any) {
      console.error("Error creating space:", err);
      onToast(err.message || "Failed to create space.");
    } finally {
      setIsCreatingSpace(false);
    }
  };

  // Delete/Leave space or clear history
  const handleDeleteSpace = async (space: ChatSpace) => {
    const isDM = space.spaceType === "DIRECT_MESSAGE";
    const confirmed = window.confirm(
      isDM 
        ? "Hide or delete history for this direct conversation?"
        : `Are you sure you want to delete or leave space "${space.displayName || "Untitled"}"?`
    );
    if (!confirmed) return;

    if (!token) return;
    try {
      // Try to call DELETE on space
      const response = await fetch(`https://chat.googleapis.com/v1/${space.name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Could not delete. Only managers can delete spaces.");
      }

      onToast("Space deleted from console.");
      setSpaces((prev) => prev.filter((s) => s.name !== space.name));
      if (selectedSpace?.name === space.name) {
        setSelectedSpace(null);
        setMessages([]);
        setMemberships([]);
      }
    } catch (err: any) {
      console.error("Error deleting space:", err);
      onToast("Could not complete delete. Standard users can't delete corporate spaces.");
    }
  };

  // Filter and Search spaces
  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch = (space.displayName || "Direct Chat").toLowerCase().includes(spaceSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "SPACE") {
      return space.spaceType === "SPACE";
    }
    if (activeTab === "DIRECT_MESSAGE") {
      return space.spaceType === "DIRECT_MESSAGE" || space.spaceType === "GROUP_CHAT";
    }
    return true;
  });

  return (
    <div id="chat-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="chat-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top edge highlight */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Drawer: Space Lists */}
        <div className="w-full md:w-[260px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Chat
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Workspace Network</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateSpaceOpen(true);
                  setSelectedSpace(null);
                  setMessages([]);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>CREATE SPACE</span>
              </button>
            )}

            {/* Tab Switches */}
            <div className="grid grid-cols-3 bg-white/5 p-1 rounded-lg border border-white/5 font-mono text-[9px] text-center">
              <button 
                onClick={() => setActiveTab("ALL")}
                className={`py-1 rounded-md transition-all cursor-pointer ${activeTab === "ALL" ? "bg-red-600 text-white font-bold" : "text-white/40 hover:text-white"}`}
              >
                ALL
              </button>
              <button 
                onClick={() => setActiveTab("SPACE")}
                className={`py-1 rounded-md transition-all cursor-pointer ${activeTab === "SPACE" ? "bg-red-600 text-white font-bold" : "text-white/40 hover:text-white"}`}
              >
                ROOMS
              </button>
              <button 
                onClick={() => setActiveTab("DIRECT_MESSAGE")}
                className={`py-1 rounded-md transition-all cursor-pointer ${activeTab === "DIRECT_MESSAGE" ? "bg-red-600 text-white font-bold" : "text-white/40 hover:text-white"}`}
              >
                DMs
              </button>
            </div>

            {/* Filter search bar */}
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-white/30" />
              <input
                type="text"
                placeholder="Find conversation..."
                value={spaceSearchQuery}
                onChange={(e) => setSpaceSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1 font-mono text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
              />
              {spaceSearchQuery && (
                <button onClick={() => setSpaceSearchQuery("")} className="absolute right-2 text-white/40 hover:text-white">
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Conversation list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest px-1">
                <span>CONVERSATIONS</span>
                {isLoadingSpaces && <Loader2 size={9} className="animate-spin text-red-500" />}
              </div>

              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {filteredSpaces.map((space) => {
                  const isDM = space.spaceType === "DIRECT_MESSAGE" || space.spaceType === "GROUP_CHAT";
                  const spaceTitle = space.displayName || "Direct Chat";
                  const isActive = selectedSpace?.name === space.name;

                  return (
                    <div
                      key={space.name}
                      onClick={() => handleSelectSpace(space)}
                      className={`group w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left font-mono text-xs cursor-pointer transition-colors ${
                        isActive
                          ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isDM ? (
                          <User size={13} className={isActive ? "text-red-400 animate-pulse" : "text-white/30"} />
                        ) : (
                          <Hash size={13} className={isActive ? "text-red-400" : "text-white/30"} />
                        )}
                        <span className="truncate">{spaceTitle}</span>
                      </div>

                      {/* Delete button option */}
                      {!isDM && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpace(space);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/30 transition-opacity"
                          title="Delete / Leave Space"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredSpaces.length === 0 && !isLoadingSpaces && (
                  <p className="text-[10px] text-white/20 text-center py-4 italic font-mono">
                    No active channels
                  </p>
                )}
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
                  <p className="text-[9px] text-white/30 leading-none">Communicator</p>
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

        {/* Center Panel: Active Chat Thread */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Main header row */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/1">
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageSquare size={18} className="text-red-500 animate-pulse" />
              <div className="min-w-0">
                <h3 className="text-xs font-mono text-white uppercase tracking-widest truncate">
                  {selectedSpace ? (selectedSpace.displayName || "Direct Message Chat") : "SELECT CHAT CONVERSATION"}
                </h3>
                {selectedSpace && (
                  <p className="text-[8px] font-mono text-white/30 uppercase mt-0.5">
                    {selectedSpace.name} {selectedSpace.threaded ? "• THREADED CHAT" : ""}
                  </p>
                )}
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    if (token) {
                      fetchSpaces(token);
                      if (selectedSpace) {
                        fetchMessages(selectedSpace.name, token);
                        fetchMemberships(selectedSpace.name, token);
                      }
                    }
                  }}
                  disabled={isLoadingSpaces || isLoadingMessages}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Space Thread"
                >
                  <RefreshCw size={11} className={isLoadingSpaces || isLoadingMessages ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedSpace && (
                <button
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                  className={`p-1.5 rounded-lg border text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                    showMembersPanel
                      ? "bg-red-500/10 border-red-500/50 text-red-400"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  }`}
                  title="View Space Members"
                >
                  <Users size={12} />
                  <span className="hidden sm:inline">Members</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Close Panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <MessageSquare size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Chat Authorization Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Log in to link your Google Workspace account to read chats, list project workspaces, coordinate team threads, and reply to notifications.
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
                <span>Authorize Chat Account</span>
              </button>
            </div>
          ) : selectedSpace ? (
            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* Messages Thread Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <p className="text-[10px] font-mono text-white/30 uppercase">Downloading space transmissions...</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.sender?.displayName === firebaseUser?.displayName || msg.sender?.name?.includes(firebaseUser?.uid || "never_matches");
                    const senderName = msg.sender?.displayName || "Workspace Member";
                    const formattedTime = msg.createTime ? new Date(msg.createTime).toLocaleString() : "";
                    
                    return (
                      <div 
                        key={msg.name} 
                        className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        {/* Avatar */}
                        {msg.sender?.avatarUrl ? (
                          <img
                            src={msg.sender.avatarUrl}
                            alt={senderName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full border border-white/10 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-red-600/15 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5">
                            {senderName.charAt(0)}
                          </div>
                        )}

                        {/* Speech Bubble body */}
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-[9px] font-mono text-white/40 ${isMe ? "justify-end" : ""}`}>
                            <span className="font-semibold text-white/60">{senderName}</span>
                            <span>•</span>
                            <span>{formattedTime}</span>
                          </div>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                            isMe 
                              ? "bg-red-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                              : "bg-white/5 border border-white/10 text-white rounded-tl-none"
                          }`}>
                            {msg.text || <em className="text-white/30 font-serif italic">Empty text content</em>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <MessageCircle size={32} className="opacity-30 mb-2 text-red-500" />
                    <p className="text-xs font-mono uppercase tracking-wider">Empty Conversation</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      No messages recorded in this space. Compose a transmission packet below to initialize communication.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/2 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Send to ${selectedSpace.displayName || "Direct Message"}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={isSendingMessage}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !messageInput.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono text-xs"
                >
                  {isSendingMessage ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={12} />
                      <span className="hidden sm:inline">SEND</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30">
              <MessageSquare size={36} className="opacity-35 mb-2 text-red-500/40" />
              <p className="text-xs font-mono uppercase tracking-wider">No channel selected</p>
              <p className="text-[10px] mt-1 max-w-sm leading-normal">
                Select a room, space thread, or direct discussion from the left console pane to begin secure communications.
              </p>
            </div>
          )}
        </div>

        {/* Right Pane: Members Overlay OR Workspace Info Panel */}
        <div className="hidden lg:flex lg:w-[320px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateSpaceOpen ? (
                /* CREATE NEW SPACE DECK */
                <motion.form
                  key="create-space"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateSpace}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Create Workspace Space
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Space Room Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Synapse Development Group"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-2">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-white/40 uppercase">
                        <HelpCircle size={10} />
                        <span>Spaces Context</span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Google Chat spaces allow multi-user collaboration in standalone rooms. Newly created spaces will use standard space schemas accessible on your Google Chat workspace layout.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreatingSpace || !newSpaceName.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreatingSpace ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>CREATE ROOM</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateSpaceOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : showMembersPanel && selectedSpace ? (
                /* MEMBERSHIP DIRECTORY */
                <motion.div
                  key="memberships"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Space Members Directory
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {isLoadingMembers ? (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 size={12} className="animate-spin text-red-500" />
                          <span className="text-[10px] font-mono text-white/30 uppercase">Syncing member directory...</span>
                        </div>
                      ) : memberships.length > 0 ? (
                        memberships.map((member) => {
                          const mName = member.member?.displayName || "Hologram User";
                          const mRole = member.role === "ROLE_MANAGER" ? "Manager" : "Member";
                          const isBot = member.member?.type === "BOT";
                          
                          return (
                            <div 
                              key={member.name}
                              className="flex items-center justify-between p-2 rounded-xl bg-white/2 border border-white/5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {member.member?.avatarUrl ? (
                                  <img 
                                    src={member.member.avatarUrl} 
                                    alt={mName} 
                                    referrerPolicy="no-referrer"
                                    className="w-6 h-6 rounded-full border border-white/10 shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center text-[9px] font-mono font-bold shrink-0">
                                    {mName.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="text-[11px] text-white font-mono block truncate">{mName}</span>
                                  <span className="text-[8px] font-mono text-white/35 block uppercase leading-none mt-0.5">
                                    {isBot ? "SYSTEM BOT" : mRole}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-white/30 font-mono italic">No membership listings retrieved.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={() => setShowMembersPanel(false)}
                      className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      BACK TO DIRECTORY
                    </button>
                  </div>
                </motion.div>
              ) : selectedSpace ? (
                /* CHAT CONTEXT STATS PANEL */
                <motion.div
                  key="chat-stats"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 flex-1 overflow-y-auto">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Active Channel</span>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {selectedSpace.displayName || "Direct Chat Discussion"}
                      </h3>
                    </div>

                    <div className="border-t border-b border-white/5 py-4 space-y-3 font-mono text-[11px] text-white/50">
                      <div className="flex gap-2.5 items-center">
                        <MessageSquare size={12} className="text-red-400" />
                        <span className="text-white/80">
                          Type: <strong className="font-semibold text-white">{selectedSpace.spaceType || "SPACE"}</strong>
                        </span>
                      </div>
                      <div className="flex gap-2.5 items-center">
                        <Users size={12} className="text-rose-400" />
                        <span className="text-white/80">
                          Subscribed: <strong className="font-semibold text-white">{memberships.length || "..."}</strong> members
                        </span>
                      </div>
                    </div>

                    {/* Quick helper tips */}
                    <div className="p-4 rounded-2xl bg-red-600/5 border border-red-500/10 space-y-2">
                      <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Communication Protocol</h4>
                      <ul className="text-[10px] text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                        <li>Secure corporate transmissions are dispatched instantly to Google workspace relays.</li>
                        <li>Toggle space memberships on the upper header menu to view teammates.</li>
                        <li>You can invite other users or launch Google Chat via Drive permissions if needed.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex gap-2">
                    <button
                      onClick={() => setShowMembersPanel(true)}
                      className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Users size={12} />
                      <span>MEMBER DIRECTORY</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Empty selection info */
                <motion.div
                  key="empty-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <MessageSquare size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No active channel</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a secure communication channel from the left sidebar pane or create a workspace space to view active teammate memberships, transmit instant messages, and supervise threads.
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
