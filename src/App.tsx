import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Keyboard, Send, Menu, X, Settings, ArrowLeft, User, ChevronRight, Lock, Lightbulb, Check } from "lucide-react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// User Profile Isolation
// Each user has their own separate isolated profile and Gemini API key.
// User A's key will never be visible, accessible, or usable by User B.
function getActiveUserId(): string {
  if (typeof window === "undefined") return "default_profile";
  try {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("user") || params.get("u") || params.get("profile");
    if (u && u.trim()) {
      return u.trim();
    }
  } catch {}
  let id = localStorage.getItem("zoya_active_user_profile_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("zoya_active_user_profile_id", id);
  }
  return id;
}

function getIsolatedUserKey(userId: string): string {
  if (typeof window === "undefined") return "";
  const userKey = localStorage.getItem(`zoya_user_${userId}_gemini_key`);
  if (userKey !== null) return userKey;

  const isUrlScoped = typeof window !== "undefined" && (window.location.search.includes("user=") || window.location.search.includes("u="));
  if (!isUrlScoped) {
    return localStorage.getItem("zoya_gemini_api_key") || "";
  }
  return "";
}

function setIsolatedUserKey(userId: string, key: string) {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(`zoya_user_${userId}_gemini_key`, trimmed);
    localStorage.setItem("zoya_gemini_api_key", trimmed);
  } else {
    localStorage.removeItem(`zoya_user_${userId}_gemini_key`);
    localStorage.removeItem("zoya_gemini_api_key");
  }
}

function getIsolatedUserName(userId: string): string {
  if (typeof window === "undefined") return "";
  const name = localStorage.getItem(`zoya_user_${userId}_name`);
  if (name !== null) return name;
  const isUrlScoped = typeof window !== "undefined" && (window.location.search.includes("user=") || window.location.search.includes("u="));
  if (!isUrlScoped) {
    return localStorage.getItem("zoya_user_name") || "";
  }
  return "";
}

function setIsolatedUserName(userId: string, name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(`zoya_user_${userId}_name`, trimmed);
    localStorage.setItem("zoya_user_name", trimmed);
  } else {
    localStorage.removeItem(`zoya_user_${userId}_name`);
    localStorage.removeItem("zoya_user_name");
  }
}

function extractNameFromText(text: string, wasAskedForName: boolean): string | null {
  const clean = text.trim();
  if (!clean) return null;

  // Patterns like "Mera naam Rahul hai", "My name is John", "I am Priya", "I'm Alex", "Call me Vikram"
  const patterns = [
    /(?:mera naam|my name is|call me|i am|iam|i'm|im|naam hai)\s+([A-Za-z]+)/i,
    /([A-Za-z]+)\s+(?:naam hai mera|mera naam hai)/i,
  ];

  for (const p of patterns) {
    const match = clean.match(p);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const lower = candidate.toLowerCase();
      const forbidden = ["zoya", "maya", "boss", "user", "guest", "naam", "name", "kya", "hai", "what", "hello", "hi", "hey", "the", "a", "an", "is"];
      if (!forbidden.includes(lower) && candidate.length >= 2) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
      }
    }
  }

  // If Zoya explicitly asked for name ("Aapka naam kya hai?"), and user replies with 1 or 2 words (e.g. "Riyajul" or "Riyajul Ansari")
  if (wasAskedForName) {
    const words = clean.split(/\s+/);
    if (words.length >= 1 && words.length <= 2) {
      const firstWord = words[0].replace(/[^a-zA-Z]/g, "");
      const lower = firstWord.toLowerCase();
      const forbidden = [
        "zoya", "maya", "boss", "user", "guest", "naam", "name", "kya", "hai", 
        "what", "hello", "hi", "hey", "no", "nahi", "why", "kyun", "yes", "haan",
        "ok", "okay", "hmmm", "hmm", "open", "play", "search", "stop", "cancel"
      ];
      if (firstWord.length >= 2 && !forbidden.includes(lower)) {
        return words.map(w => {
          const cleanWord = w.replace(/[^a-zA-Z]/g, "");
          return cleanWord ? cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase() : "";
        }).filter(Boolean).join(" ");
      }
    }
  }

  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "settings" | "personal">("home");
  const [appState, setAppState] = useState<AppState>("idle");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  // Active user profile identifier
  const activeUserId = useRef(getActiveUserId()).current;

  // Personal Settings: Name & Gemini Key
  // Field must be empty by default (no Boss, Riyajul, User, Guest)
  const [userName, setUserName] = useState<string>(() => {
    return getIsolatedUserName(activeUserId);
  });
  const [userNameInput, setUserNameInput] = useState<string>(userName);
  const [isNameSaved, setIsNameSaved] = useState<boolean>(false);

  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return getIsolatedUserKey(activeUserId);
  });
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(geminiKey);
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  // Gemini API Key Notice Popup state
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const askedForNameRef = useRef<boolean>(false);

  // When a user opens Zoya and that user's own Gemini API key is not configured, show the notice popup.
  useEffect(() => {
    if (!geminiKey.trim()) {
      setShowApiKeyModal(true);
    }
  }, []);

  const updateUserName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setUserNameInput(trimmed);
    setIsolatedUserName(activeUserId, trimmed);
    resetZoyaSession();
  }, [activeUserId]);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = userNameInput.trim();
    setUserName(trimmed);
    setUserNameInput(trimmed);
    setIsolatedUserName(activeUserId, trimmed);
    resetZoyaSession();
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2500);
  };

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    setGeminiKey(trimmed);
    setGeminiKeyInput(trimmed);
    setIsolatedUserKey(activeUserId, trimmed);
    resetZoyaSession();
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2500);

    // Once that user's valid Gemini API key is saved: stop showing the notice popup.
    // If the user later deletes their Gemini API key: the notice popup must become active again.
    if (trimmed) {
      setShowApiKeyModal(false);
    } else {
      setShowApiKeyModal(true);
    }
  };

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    // If no Gemini API key is saved, and the user tries to use Zoya's AI/Gemini functionality, show a clear popup.
    // Do NOT generate a fake response. Do NOT silently use another API key.
    if (!geminiKey.trim()) {
      setShowApiKeyModal(true);
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // Check if user is sharing their name when Zoya doesn't have it yet
    if (!userName) {
      const extracted = extractNameFromText(finalTranscript, askedForNameRef.current);
      if (extracted) {
        updateUserName(extracted);
        askedForNameRef.current = false;
      }
    }

    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    if (commandResult.isBrowserAction) {
      const audioBase64 = await getZoyaAudio(commandResult.action, geminiKey);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "zoya", text: commandResult.action }]);

      if (audioBase64) {
        setAppState("speaking");
        await playPCM(audioBase64);
      }

      if (commandResult.url) {
        window.open(commandResult.url, "_blank");
      }
      setAppState("idle");
      return;
    }

    setAppState("processing");

    // 2. Chat with Gemini
    const replyText = await getZoyaResponse(
      finalTranscript,
      messagesRef.current,
      geminiKey,
      userName,
      (detectedName) => {
        updateUserName(detectedName);
        askedForNameRef.current = false;
      }
    );

    if (!replyText) {
      setAppState("idle");
      return;
    }

    // If Zoya asked for user's name, note it so next user message can be auto-saved as name
    if (!userName && (/naam\s+kya/i.test(replyText) || /aapka\s+naam/i.test(replyText))) {
      askedForNameRef.current = true;
    }

    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "zoya", text: replyText }]);

    // 3. Speak using TTS
    const audioBase64 = await getZoyaAudio(replyText, geminiKey);
    if (audioBase64) {
      setAppState("speaking");
      await playPCM(audioBase64);
    }
    setAppState("idle");
  }, [isSessionActive, geminiKey, userName, updateUserName]);

  const toggleListening = async () => {
    if (isSessionActive) {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setIsSessionActive(false);
      setAppState("idle");
      return;
    }

    // If no Gemini key, show missing key popup modal directly
    if (!geminiKey.trim()) {
      setShowApiKeyModal(true);
      return;
    }

    try {
      setAppState("listening");
      const manager = new LiveSessionManager(geminiKey, userName);
      manager.onStateChange = (state) => {
        setAppState(state);
      };
      manager.onMessage = (sender, text) => {
        setMessages((prev) => [...prev, { id: Date.now().toString(), sender, text }]);
        if (!userName && sender === "zoya" && (/naam\s+kya/i.test(text) || /aapka\s+naam/i.test(text))) {
          askedForNameRef.current = true;
        }
      };
      manager.onNameDetected = (detectedName) => {
        updateUserName(detectedName);
        askedForNameRef.current = false;
      };
      manager.onCommand = (url) => {
        window.open(url, "_blank");
      };

      await manager.start();
      liveSessionRef.current = manager;
      setIsSessionActive(true);
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setIsSessionActive(false);
      setAppState("idle");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setShowPermissionModal(true);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden m-0 p-0">
      <AnimatePresence mode="wait">
        {currentPage === "home" ? (
          <motion.div
            key="home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full flex flex-col items-center justify-between relative overflow-hidden"
          >
            {showPermissionModal && (
              <PermissionModal 
                onClose={() => setShowPermissionModal(false)} 
              />
            )}

            {/* Cinematic Background Gradients */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
                  Z
                </div>
                <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Zoya</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNavOpen(true)}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  title="Menu"
                  aria-label="Open Navigation Menu"
                >
                  <Menu size={18} className="opacity-80" />
                </button>
              </div>
            </header>

            {/* Main Content - Visualizer & Chat */}
            <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
              
              {/* Left Column: Zoya Status */}
              <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
                <div className="h-6">
                  <AnimatePresence>
                    {appState === "processing" && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-2 text-cyan-300/80 text-sm md:text-base italic font-serif"
                      >
                        <Loader2 size={16} className="animate-spin" />
                        Replying...
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Center Visualizer (Fixed Full Screen Background) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <Visualizer state={appState} />
              </div>

              {/* Right Column: User Status */}
              <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
                <div className="h-6 flex justify-end">
                  <AnimatePresence>
                    {appState === "listening" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2 text-violet-300/80 text-sm md:text-base italic"
                      >
                        <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                        Listening...
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </main>

            {/* Controls */}
            <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
              <AnimatePresence>
                {showTextInput && (
                  <motion.form 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    onSubmit={handleTextSubmit}
                    className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
                  >
                    <input 
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type a message to Zoya..."
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={!textInput.trim()}
                      className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleListening}
                  className={`
                    group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
                    ${
                      isSessionActive
                        ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                        : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
                    }
                  `}
                >
                  {isSessionActive ? (
                    <>
                      <MicOff size={20} />
                      <span>End Session</span>
                    </>
                  ) : (
                    <>
                      <Mic size={20} className="group-hover:animate-bounce" />
                      <span>Start Session</span>
                    </>
                  )}
                </button>
                
                {!isSessionActive && (
                  <button
                    onClick={() => setShowTextInput(!showTextInput)}
                    className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl"
                    title="Type instead"
                  >
                    <Keyboard size={20} className="opacity-70" />
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        ) : currentPage === "settings" ? (
          <motion.div
            key="settings-page"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="h-full w-full flex flex-col relative overflow-hidden"
          >
            {/* Cinematic Background Gradients */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/15 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/15 blur-[120px] rounded-full" />
            </div>

            {/* Header with Back Arrow in Top-Left Corner */}
            <header className="w-full flex items-center gap-4 px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <button
                onClick={() => setCurrentPage("home")}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                title="Back to Zoya"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-medium tracking-wide text-white">Settings</h1>
            </header>

            {/* Settings Page Content */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-6 md:p-8 z-10 overflow-y-auto">
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentPage("personal")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-base font-medium border border-white/5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <User size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
                    <span>Personal</span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </button>
              </div>
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="personal-page"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="h-full w-full flex flex-col relative overflow-hidden"
          >
            {/* Cinematic Background Gradients */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/15 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/15 blur-[120px] rounded-full" />
            </div>

            {/* Header with Back Arrow in Top-Left Corner returning to Settings */}
            <header className="w-full flex items-center gap-4 px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <button
                onClick={() => setCurrentPage("settings")}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                title="Back to Settings"
                aria-label="Back to Settings"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-medium tracking-wide text-white">Personal</h1>
            </header>

            {/* Personal page content: ONLY Your Name and Gemini API key */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-5 md:p-8 z-10 overflow-y-auto space-y-6">
              {/* 1. YOUR NAME */}
              <div className="rounded-3xl bg-[#141418] border border-white/5 p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-wide">Your name</h2>
                    <p className="text-xs text-zinc-400">How Zoya addresses you</p>
                  </div>
                </div>

                <form onSubmit={handleSaveName} className="space-y-4 pt-1">
                  <input
                    type="text"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#1b1b20] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 text-base focus:outline-none focus:border-amber-500/60 transition-all font-medium"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-md shadow-orange-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isNameSaved ? (
                        <>
                          <Check size={16} />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </button>
                    {isNameSaved && (
                      <span className="text-xs text-emerald-400 font-medium">
                        {userName ? `Name saved! Zoya will now call you ${userName}.` : "Name updated."}
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* 2. GEMINI API KEY */}
              <div id="gemini-key-section" className="rounded-3xl bg-[#141418] border border-white/5 p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-wide">Gemini API key</h2>
                    <p className="text-xs text-zinc-400">Powers Zoya's voice and brain</p>
                  </div>
                </div>

                {/* AI Studio Tip Callout */}
                <div className="p-4 rounded-2xl bg-[#231b14] border border-amber-900/40 text-amber-200/90 text-xs sm:text-sm flex gap-3 items-start leading-relaxed">
                  <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Get a free key from Google AI Studio: sign in, click "Create API key", then paste it here. It starts with "AIza".
                  </span>
                </div>

                {/* Get a Gemini key link */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => window.open("https://aistudio.google.com/app/api-keys", "_blank", "noopener,noreferrer")}
                    className="text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors flex items-center gap-1 cursor-pointer group"
                  >
                    <span>Get a Gemini key</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </div>

                {/* Secure Masked Key Input */}
                <form onSubmit={handleSaveKey} className="space-y-4">
                  <div className="relative">
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••••••••••"
                      className="w-full bg-[#1b1b20] border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-amber-500/60 transition-all font-mono tracking-widest"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                      <Lock size={18} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-sm transition-all shadow-md shadow-orange-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isKeySaved ? (
                        <>
                          <Check size={16} />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </button>
                    {isKeySaved && (
                      <span className="text-xs text-emerald-400 font-medium">
                        Gemini API key saved securely!
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gemini API Key Notice Popup */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowApiKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-md rounded-3xl bg-[#141419] border border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 relative overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Row: Lock Icon & Close Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Lock size={20} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Title & Message */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Gemini API Key Required
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  To use Zoya's AI features, you need to add your own Gemini API key.
                </p>
              </div>

              {/* Clear Instruction */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Go to <span className="text-amber-400 font-medium">Settings → Personal → Gemini API Key</span> to add your key.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Navigation Panel */}
      <AnimatePresence>
        {isNavOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsNavOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Side Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-[#131317] border-r border-white/10 shadow-2xl flex flex-col z-10 rounded-r-3xl overflow-hidden"
            >
              {/* Header inside Panel (Maya-like style) */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-900/40 border border-white/10">
                    Z
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-wide text-white leading-tight">Zoya</h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">AI Voice Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNavOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                  aria-label="Close Navigation Menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Panel Body: ONLY Settings */}
              <div className="flex-1 p-4 overflow-y-auto">
                <button
                  onClick={() => {
                    setIsNavOpen(false);
                    setCurrentPage("settings");
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-sm font-medium border border-white/5 cursor-pointer"
                >
                  <Settings size={18} className="text-zinc-400" />
                  <span>Settings</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
