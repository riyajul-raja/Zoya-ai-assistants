import React, { useState, useEffect } from "react";
import { 
  Search, Trash2, X, Loader2, LogOut, RefreshCw, Mail, Send, Check, 
  Inbox, FileText, Star, AlertCircle, ChevronRight, PenTool, User, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout, getAccessToken 
} from "../services/firebaseService";

interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labels: string[];
}

interface GmailManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function GmailManager({ onClose, isGhostMode = false, onToast }: GmailManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Email States
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string>("INBOX");

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Action States
  const [isTrashing, setIsTrashing] = useState<string | null>(null);

  // Initialize Auth & Auto-fetch
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchEmails(cachedToken, "INBOX");
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
        onToast("Gmail access authorized!");
        fetchEmails(result.accessToken, "INBOX");
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
      setEmails([]);
      setSelectedEmail(null);
      setIsComposeOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Helper parsers for Gmail API response
  const getHeader = (headers: any[], name: string): string => {
    if (!headers) return "";
    const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return found ? found.value : "";
  };

  const decodeBase64Url = (base64UrlStr: string) => {
    let base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
      try {
        return atob(base64);
      } catch (err) {
        return "[Unable to decode body]";
      }
    }
  };

  const getEmailBody = (payload: any): string => {
    if (!payload) return "";
    if (payload.body?.data) {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      // Look for text/html
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return decodeBase64Url(part.body.data);
        }
      }
      // Look for text/plain
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return decodeBase64Url(part.body.data);
        }
      }
      // Recursively search nested parts
      for (const part of payload.parts) {
        if (part.parts) {
          const body = getEmailBody(part);
          if (body) return body;
        }
      }
    }
    return "";
  };

  // Fetch emails list + details
  const fetchEmails = async (accessToken: string, label: string, queryStr = "") => {
    setIsLoading(true);
    try {
      let q = `label:${label}`;
      if (queryStr) {
        q = `${queryStr}`;
      }
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=20`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error("Failed to list messages");
      }
      
      const data = await response.json();
      const messagesList = data.messages || [];
      
      // Fetch details for each message
      const detailedEmails = await Promise.all(
        messagesList.map(async (msg: { id: string }) => {
          try {
            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!detailRes.ok) return null;
            const detailData = await detailRes.json();
            
            const headers = detailData.payload?.headers || [];
            return {
              id: detailData.id,
              threadId: detailData.threadId,
              snippet: detailData.snippet || "",
              subject: getHeader(headers, "subject") || "(No Subject)",
              from: getHeader(headers, "from") || "Unknown Sender",
              to: getHeader(headers, "to") || "Me",
              date: getHeader(headers, "date") || "",
              body: getEmailBody(detailData.payload),
              labels: detailData.labelIds || []
            } as EmailMessage;
          } catch (e) {
            console.error("Error fetching detail for message", msg.id, e);
            return null;
          }
        })
      );

      setEmails(detailedEmails.filter((m): m is EmailMessage => m !== null));
    } catch (err) {
      console.error("Error loading emails:", err);
      onToast("Error loading emails from Gmail API.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trash message
  const handleTrashEmail = async (email: EmailMessage) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE WORKSPACE OPERATIONS
    const confirmed = window.confirm(`Move "${email.subject}" to Trash? This action can be undone from Gmail Trash.`);
    if (!confirmed) return;

    if (!token) return;
    setIsTrashing(email.id);

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}/trash`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) {
        throw new Error("Failed to trash message");
      }
      onToast("Message moved to Trash.");
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      fetchEmails(token, currentLabel, searchQuery);
    } catch (err) {
      console.error("Error trashing email:", err);
      onToast("Failed to move email to Trash.");
    } finally {
      setIsTrashing(null);
    }
  };

  // Send Email Compose
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      onToast("Recipient field (To) is required.");
      return;
    }
    if (!composeBody.trim()) {
      onToast("Email body content is required.");
      return;
    }
    
    // MANDATORY USER CONFIRMATION FOR SENSITIVE / MUTATING ACTIONS (SENDING EMAILS)
    const confirmed = window.confirm(`Send this email to ${composeTo}?`);
    if (!confirmed) return;

    if (!token) return;
    setIsSending(true);

    try {
      // Construct RFC 2822 format email
      const emailHeaders = [
        `To: ${composeTo}`,
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(composeSubject)))}?=`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "",
        composeBody.replace(/\n/g, "<br/>")
      ].join("\r\n");

      // base64url encode helper
      const base64UrlSafe = btoa(unescape(encodeURIComponent(emailHeaders)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: base64UrlSafe })
        }
      );

      if (!response.ok) {
        throw new Error("Gmail API send failed");
      }

      onToast("Email sent successfully!");
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      fetchEmails(token, currentLabel, searchQuery);
    } catch (err) {
      console.error("Error sending email:", err);
      onToast("Failed to send email.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchEmails(token, currentLabel, searchQuery);
    }
  };

  const cleanLabelValue = (label: string) => {
    setCurrentLabel(label);
    setSearchQuery("");
    if (token) {
      fetchEmails(token, label, "");
    }
  };

  return (
    <div id="gmail-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="gmail-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top strip bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Drawer Navigation: Label selector & quick details */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Mailroom
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Secure Gmail Client</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsComposeOpen(true);
                  setSelectedEmail(null);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <PenTool size={13} />
                <span>COMPOSE EMAIL</span>
              </button>
            )}

            {/* Folder / Labels lists */}
            <div className="space-y-1">
              {[
                { id: "INBOX", name: "Inbox", icon: <Inbox size={14} /> },
                { id: "SENT", name: "Sent", icon: <Send size={14} /> },
                { id: "DRAFT", name: "Drafts", icon: <FileText size={14} /> },
                { id: "STARRED", name: "Starred", icon: <Star size={14} /> },
                { id: "TRASH", name: "Trash", icon: <Trash2 size={14} /> }
              ].map((lbl) => (
                <button
                  key={lbl.id}
                  onClick={() => cleanLabelValue(lbl.id)}
                  disabled={!isAuthenticated}
                  className={`w-full text-left py-2 px-3 rounded-lg flex items-center gap-2.5 font-mono text-xs transition-colors cursor-pointer ${
                    !isAuthenticated 
                      ? "text-white/20" 
                      : currentLabel === lbl.id
                        ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={currentLabel === lbl.id ? "text-red-400" : "text-white/30"}>
                    {lbl.icon}
                  </span>
                  <span>{lbl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Signout/Sign-In Footer */}
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
                  <p className="text-[9px] text-white/30 leading-none">Mail Owner</p>
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

        {/* Center Pane: Emails lists and browsing */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                {currentLabel} LISTING
              </h3>
              {isAuthenticated && (
                <button
                  onClick={() => fetchEmails(token!, currentLabel, searchQuery)}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Mailbox"
                >
                  <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            {/* Mobile close overlay icon */}
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
                <Mail size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Gmail Authorization Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Unlock Zoya's advanced mail core to read, organize, compose, and send secure emails directly from this terminal console using OAuth.
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
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* Search input sub-header */}
              <form onSubmit={handleSearch} className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search messages (e.g., from:me, subject:urgent)..."
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
                  QUERY
                </button>
              </form>

              {/* Emails Content List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isLoading && emails.length === 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={28} />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <Mail size={32} className="opacity-35 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No emails found</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Your mailbox is clear, or no messages match the filter constraints.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => {
                          setSelectedEmail(email);
                          setIsComposeOpen(false);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col relative overflow-hidden group hover:border-white/10 hover:bg-white/4 ${
                          selectedEmail?.id === email.id
                            ? "bg-red-500/10 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                            : "bg-white/2 border-white/5"
                        }`}
                      >
                        {/* Header: Sender, Date, and Actions */}
                        <div className="flex items-center justify-between mb-2 text-[11px]">
                          <span className="font-mono text-white/70 font-medium truncate max-w-[200px]">
                            {email.from.replace(/<.*>/, "")}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 font-mono text-[9px]">
                              {email.date ? new Date(email.date).toLocaleDateString() : ""}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTrashEmail(email);
                              }}
                              disabled={isTrashing === email.id}
                              className="p-1 rounded hover:bg-red-500/25 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Move to Trash"
                            >
                              {isTrashing === email.id ? (
                                <Loader2 size={10} className="animate-spin text-red-500" />
                              ) : (
                                <Trash2 size={11} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Subject */}
                        <h4 className="text-xs font-medium text-white truncate leading-snug">
                          {email.subject}
                        </h4>

                        {/* Snippet */}
                        <p className="text-[11px] text-white/40 truncate mt-1 leading-normal">
                          {email.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Pane: Selected Email Viewer OR Composer */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isComposeOpen ? (
                /* Email Compose Panel Form */
                <motion.form
                  key="email-composer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSendEmail}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Send Message
                      </h3>
                    </div>

                    {/* To */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">To</label>
                      <input
                        type="email"
                        required
                        placeholder="recipient@example.com"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="E.g., Custom requirements..."
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Message Body</label>
                      <textarea
                        required
                        placeholder="Write your email content..."
                        rows={7}
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isSending || !composeTo.trim() || !composeBody.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>SEND EMAIL</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsComposeOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : selectedEmail ? (
                /* Selected Email Details View */
                <motion.div
                  key="email-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                    {/* Header Details */}
                    <div>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {selectedEmail.subject}
                      </h3>
                      <div className="mt-4 space-y-2 border-t border-b border-white/5 py-3 text-[11px] font-mono text-white/50">
                        <div className="flex gap-2.5">
                          <span className="w-12 shrink-0 text-white/30 uppercase">From:</span>
                          <span className="text-white/80 truncate">{selectedEmail.from}</span>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="w-12 shrink-0 text-white/30 uppercase">To:</span>
                          <span className="text-white/80 truncate">{selectedEmail.to}</span>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="w-12 shrink-0 text-white/30 uppercase">Date:</span>
                          <span className="text-white/80">{selectedEmail.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Decoded Email Body */}
                    <div className="text-xs text-white/80 leading-relaxed overflow-x-hidden pt-2 break-words">
                      {selectedEmail.body ? (
                        selectedEmail.body.includes("<html") || selectedEmail.body.includes("<div") || selectedEmail.body.includes("<p") ? (
                          // Render as safe html container iframe or strip script style blocks
                          <div 
                            className="bg-neutral-900/60 rounded-xl p-4 border border-white/5 overflow-y-auto max-h-[350px] font-sans"
                            dangerouslySetInnerHTML={{ 
                              __html: selectedEmail.body
                                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
                            }} 
                          />
                        ) : (
                          <div className="bg-neutral-900/60 rounded-xl p-4 border border-white/5 whitespace-pre-wrap font-sans">
                            {selectedEmail.body}
                          </div>
                        )
                      ) : (
                        <div className="bg-neutral-900/60 rounded-xl p-4 border border-white/5 whitespace-pre-wrap font-sans text-white/40 italic">
                          {selectedEmail.snippet || "(No body text found)"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-white/10 shrink-0">
                    <button
                      onClick={() => handleTrashEmail(selectedEmail)}
                      disabled={isTrashing === selectedEmail.id}
                      className="w-full py-2.5 px-3 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-xs font-mono flex items-center justify-center gap-2"
                    >
                      {isTrashing === selectedEmail.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      <span>TRASH EMAIL</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Empty Placeholder */
                <motion.div
                  key="select-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <Mail size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No message selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select an email from your inbox to read its decrypted header metadata, full text bodies, and attachments.
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
