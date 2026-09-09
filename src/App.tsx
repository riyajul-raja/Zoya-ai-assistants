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

  // Personal Settings: Name & Gemini Key
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("zoya_user_name") || "Riyajul";
  });
  const [userNameInput, setUserNameInput] = useState<string>(userName);
  const [isNameSaved, setIsNameSaved] = useState<boolean>(false);

  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem("zoya_gemini_api_key") || "";
  });
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(geminiKey);
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = userNameInput.trim() || "Riyajul";
    setUserName(trimmed);
    setUserNameInput(trimmed);
    localStorage.setItem("zoya_user_name", trimmed);
    resetZoyaSession();
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2500);
  };

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    setGeminiKey(trimmed);
    setGeminiKeyInput(trimmed);
    localStorage.setItem("zoya_gemini_api_key", trimmed);
    resetZoyaSession();
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2500);
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

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    if (commandResult.isBrowserAction) {
      if (geminiKey.trim()) {
        const audioBase64 = await getZoyaAudio(commandResult.action, geminiKey);
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "zoya", text: commandResult.action }]);

        if (audioBase64) {
          setAppState("speaking");
          await playPCM(audioBase64);
        }
      } else {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "zoya", text: commandResult.action }]);
      }

      if (commandResult.url) {
        window.open(commandResult.url, "_blank");
      }
      setAppState("idle");
      return;
    }

    // If the user has NOT saved a Gemini API key, Zoya must not generate or speak a Gemini AI response.
    if (!geminiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "zoya",
          text: "Please add and save your Gemini API key in Settings > Personal to chat with me.",
        },
      ]);
      setAppState("idle");
      return;
    }

    setAppState("processing");

    // 2. Chat with Gemini
    const replyText = await getZoyaResponse(finalTranscript, messagesRef.current, geminiKey, userName);
    if (!replyText) {
      setAppState("idle");
      return;
    }
    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "zoya", text: replyText }]);

    // 3. Speak using TTS
    const audioBase64 = await getZoyaAudio(replyText, geminiKey);
    if (audioBase64) {
      setAppState("speaking");
      await playPCM(audioBase64);
    }
    setAppState("idle");
  }, [isSessionActive, geminiKey, userName]);

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

    if (!geminiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "zoya",
          text: "Please add and save your Gemini API key in Settings > Personal to start voice chat.",
        },
      ]);
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
                    placeholder="e.g. Riyajul or Boss"
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
                        Name saved! Zoya will now call you {userName}.
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* 2. GEMINI API KEY */}
              <div className="rounded-3xl bg-[#141418] border border-white/5 p-6 shadow-xl space-y-4">
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
