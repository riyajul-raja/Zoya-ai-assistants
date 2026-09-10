import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Menu, X, Settings, ArrowLeft, User, ChevronRight, Lock, Lightbulb, Check, Heart, Download, History, MessageSquare, PictureInPicture2, Brain, Plus, Pencil, Trash2 } from "lucide-react";
import { resetZoyaSession } from "./services/geminiService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import { motion, AnimatePresence } from "motion/react";
import {
  ChatMessage,
  SavedConversation,
  getIsolatedUserChatHistory,
  saveIsolatedUserChatHistory,
  isConversationCompleted,
  generateConversationTitle,
  groupConversationsByDate,
  formatConversationTime,
  formatFullDateTime,
} from "./services/historyService";
import {
  isPictureInPictureSupported,
  requestZoyaPictureInPicture,
  PiPController,
} from "./services/pipService";
import {
  ZoyaMemory,
  getIsolatedUserMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  isSensitiveMemory,
  extractExplicitMemory,
  formatMemoriesForPrompt,
  getRelevantMemories,
} from "./services/memoryService";

type AppState = "idle" | "listening" | "processing" | "speaking";

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

function getIsolatedAssistantName(userId: string): string {
  if (typeof window === "undefined") return "Zoya";
  const name = localStorage.getItem(`zoya_user_${userId}_assistant_name`);
  if (name !== null && name.trim()) return name.trim();
  const legacy = localStorage.getItem("zoya_assistant_name");
  if (legacy && legacy.trim()) return legacy.trim();
  return "Zoya";
}

function setIsolatedAssistantName(userId: string, name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(`zoya_user_${userId}_assistant_name`, trimmed);
    localStorage.setItem("zoya_assistant_name", trimmed);
  } else {
    localStorage.removeItem(`zoya_user_${userId}_assistant_name`);
    localStorage.removeItem("zoya_assistant_name");
  }
}

function getIsolatedGirlfriendMode(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(`zoya_user_${userId}_girlfriend_mode`);
  if (val !== null) return val === "true";
  return localStorage.getItem("zoya_girlfriend_mode") === "true";
}

function setIsolatedGirlfriendMode(userId: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`zoya_user_${userId}_girlfriend_mode`, enabled ? "true" : "false");
  localStorage.setItem("zoya_girlfriend_mode", enabled ? "true" : "false");
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
  const [currentPage, setCurrentPage] = useState<"home" | "settings" | "personal" | "zoya" | "chat-history" | "memory">("home");
  const [appState, setAppState] = useState<AppState>("idle");
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Active user profile identifier
  const activeUserId = useRef(getActiveUserId()).current;

  // Memories for Zoya (strictly isolated per user)
  const [memories, setMemories] = useState<ZoyaMemory[]>(() => getIsolatedUserMemories(activeUserId));
  const memoriesRef = useRef<ZoyaMemory[]>(memories);
  memoriesRef.current = memories;

  // Memory Page UI states
  const [isAddingMemory, setIsAddingMemory] = useState<boolean>(false);
  const [memoryInput, setMemoryInput] = useState<string>("");
  const [memoryError, setMemoryError] = useState<string>("");

  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemoryText, setEditMemoryText] = useState<string>("");
  const [editMemoryError, setEditMemoryError] = useState<string>("");

  // Saved Conversations for Chat History (strictly isolated per user)
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>(() => {
    const list = getIsolatedUserChatHistory(activeUserId);
    if (list.length === 0) {
      try {
        const legacy = localStorage.getItem("zoya_chat_history");
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && isConversationCompleted(parsed)) {
            const initialConv: SavedConversation = {
              id: "conv_" + Date.now(),
              title: generateConversationTitle(parsed),
              createdAt: Date.now() - 3600000,
              updatedAt: Date.now() - 3600000,
              messages: parsed,
            };
            saveIsolatedUserChatHistory(activeUserId, [initialConv]);
            return [initialConv];
          }
        }
      } catch {}
    }
    return list;
  });
  const savedConversationsRef = useRef(savedConversations);
  savedConversationsRef.current = savedConversations;

  // Active conversation being continued or newly recorded
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  // Selected conversation when opened inside Chat History view
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);

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

  // Zoya Persona Settings: Assistant Name & Girlfriend Mode (isolated per user)
  const [assistantName, setAssistantName] = useState<string>(() => {
    return getIsolatedAssistantName(activeUserId);
  });
  const [assistantNameInput, setAssistantNameInput] = useState<string>(assistantName);
  const [isAssistantNameSaved, setIsAssistantNameSaved] = useState<boolean>(false);

  const [girlfriendMode, setGirlfriendMode] = useState<boolean>(() => {
    return getIsolatedGirlfriendMode(activeUserId);
  });

  // Gemini API Key Notice Popup state (shown ONLY when user clicks Start Session without a saved key)
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [modalKeyInput, setModalKeyInput] = useState<string>("");
  const [modalKeyError, setModalKeyError] = useState<string>("");
  const askedForNameRef = useRef<boolean>(false);

  // PWA Installation & Standalone Detection
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://")
    );
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://")
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps && apps.length > 0) {
          setIsInstalled(true);
        }
      }).catch(() => {});
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsStandalone(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayChange);
    } else {
      (mediaQuery as any).addListener(handleDisplayChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleDisplayChange);
      } else {
        (mediaQuery as any).removeListener(handleDisplayChange);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      setShowInstallHelp(true);
    }
  };

  const showInstallButton = !isStandalone && !isInstalled;

  const handleSaveAssistantName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = assistantNameInput.trim() || "Zoya";
    setAssistantName(trimmed);
    setAssistantNameInput(trimmed);
    setIsolatedAssistantName(activeUserId, trimmed);
    resetZoyaSession();
    setIsAssistantNameSaved(true);
    setTimeout(() => setIsAssistantNameSaved(false), 2500);
  };

  const handleToggleGirlfriendMode = () => {
    const next = !girlfriendMode;
    setGirlfriendMode(next);
    setIsolatedGirlfriendMode(activeUserId, next);
    resetZoyaSession();
  };

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

    if (trimmed) {
      setShowApiKeyModal(false);
    }
  };

  const handleMemoryDetected = useCallback((memoryText: string) => {
    const clean = memoryText.trim();
    if (!clean || isSensitiveMemory(clean)) return;
    const added = addMemory(activeUserId, clean);
    if (added) {
      const updated = getIsolatedUserMemories(activeUserId);
      setMemories(updated);
      memoriesRef.current = updated;
    }
  }, [activeUserId]);

  const handleSaveNewMemory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = memoryInput.trim();
    if (!clean) {
      setMemoryError("Please enter something to remember.");
      return;
    }
    if (isSensitiveMemory(clean)) {
      setMemoryError("For security, passwords, API keys, and sensitive tokens cannot be saved.");
      return;
    }
    const added = addMemory(activeUserId, clean);
    if (added) {
      const updated = getIsolatedUserMemories(activeUserId);
      setMemories(updated);
      memoriesRef.current = updated;
      setMemoryInput("");
      setMemoryError("");
      setIsAddingMemory(false);
    }
  };

  const handleStartEditMemory = (mem: ZoyaMemory) => {
    setEditingMemoryId(mem.id);
    setEditMemoryText(mem.text);
    setEditMemoryError("");
  };

  const handleCancelEditMemory = () => {
    setEditingMemoryId(null);
    setEditMemoryText("");
    setEditMemoryError("");
  };

  const handleSaveEditedMemory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingMemoryId) return;
    const clean = editMemoryText.trim();
    if (!clean) {
      setEditMemoryError("Memory cannot be empty.");
      return;
    }
    if (isSensitiveMemory(clean)) {
      setEditMemoryError("For security, passwords, API keys, and sensitive tokens cannot be saved.");
      return;
    }
    const updated = updateMemory(activeUserId, editingMemoryId, clean);
    if (updated) {
      const fresh = getIsolatedUserMemories(activeUserId);
      setMemories(fresh);
      memoriesRef.current = fresh;
      setEditingMemoryId(null);
      setEditMemoryText("");
      setEditMemoryError("");
    }
  };

  const handleDeleteMemory = (id: string) => {
    deleteMemory(activeUserId, id);
    const fresh = getIsolatedUserMemories(activeUserId);
    setMemories(fresh);
    memoriesRef.current = fresh;
    if (editingMemoryId === id) {
      setEditingMemoryId(null);
      setEditMemoryText("");
    }
  };

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

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

  const handleIncomingMessage = (sender: "user" | "zoya", text: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6),
      sender,
      text,
      timestamp: Date.now(),
    };

    if (sender === "user") {
      const explicitMem = extractExplicitMemory(text);
      if (explicitMem && !isSensitiveMemory(explicitMem)) {
        handleMemoryDetected(explicitMem);
      }
    }

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      messagesRef.current = updated;

      // Automatically save completed conversations to Chat History
      if (isConversationCompleted(updated)) {
        let targetId = activeConversationIdRef.current;
        if (!targetId) {
          targetId = "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
          activeConversationIdRef.current = targetId;
          setActiveConversationId(targetId);
        }

        setSavedConversations((prevSaved) => {
          const existingIndex = prevSaved.findIndex((c) => c.id === targetId);
          let updatedList: SavedConversation[];

          if (existingIndex >= 0) {
            const existing = prevSaved[existingIndex];
            const updatedConv: SavedConversation = {
              ...existing,
              updatedAt: Date.now(),
              messages: updated,
              title: existing.title && existing.title !== "Conversation with Zoya"
                ? existing.title
                : generateConversationTitle(updated),
            };
            updatedList = [
              updatedConv,
              ...prevSaved.slice(0, existingIndex),
              ...prevSaved.slice(existingIndex + 1),
            ];
          } else {
            const newConv: SavedConversation = {
              id: targetId!,
              title: generateConversationTitle(updated),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: updated,
            };
            updatedList = [newConv, ...prevSaved];
          }

          savedConversationsRef.current = updatedList;
          saveIsolatedUserChatHistory(activeUserId, updatedList);
          return updatedList;
        });
      }

      return updated;
    });
  };

  // Picture-in-Picture (PiP) State & Refs for zero-latency bidirectional synchronization
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);
  const pipControllerRef = useRef<PiPController | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const appStateRef = useRef<AppState>("idle");
  const assistantNameRef = useRef<string>(assistantName);
  const toggleListeningRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    assistantNameRef.current = assistantName;
  }, [assistantName]);

  const handleCloseApiKeyModal = () => {
    setShowApiKeyModal(false);
    setModalKeyError("");
  };

  const handleSaveKeyFromModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = modalKeyInput.trim();
    if (!trimmed) {
      setModalKeyError("Please enter your Gemini API key.");
      return;
    }

    setModalKeyError("");
    // Save key immediately using the same existing per-user storage as Settings -> Personal -> Gemini API Key
    setIsolatedUserKey(activeUserId, trimmed);
    setGeminiKey(trimmed);
    setGeminiKeyInput(trimmed);
    resetZoyaSession();

    // Close the popup
    setShowApiKeyModal(false);

    // Automatically start the Zoya voice session with the newly saved key without requiring a second click
    await startVoiceSession(messagesRef.current, activeConversationIdRef.current || undefined, trimmed);
  };

  const startVoiceSession = async (
    history: ChatMessage[] = messagesRef.current,
    convId?: string,
    keyToUse?: string
  ) => {
    if (convId) {
      setActiveConversationId(convId);
      activeConversationIdRef.current = convId;
    }

    // Check the current user's saved Gemini API key first
    const effectiveKey = (keyToUse !== undefined ? keyToUse : (geminiKey || getIsolatedUserKey(activeUserId))).trim();
    if (!effectiveKey) {
      setModalKeyInput(geminiKeyInput || "");
      setModalKeyError("");
      setShowApiKeyModal(true);
      return;
    }

    try {
      setAppState("processing");
      appStateRef.current = "processing";
      if (pipControllerRef.current?.isActive) {
        pipControllerRef.current.updateState("processing", assistantNameRef.current, true);
      }

      const initialHistory = history.map((m) => ({ sender: m.sender, text: m.text }));
      const fullContextText = history.map((m) => m.text).join(" ");
      const relevant = getRelevantMemories(memoriesRef.current, fullContextText);
      const formattedMemories = formatMemoriesForPrompt(relevant);

      const manager = new LiveSessionManager(
        effectiveKey, 
        userName, 
        assistantName, 
        girlfriendMode,
        initialHistory,
        formattedMemories
      );
      manager.onStateChange = (state) => {
        setAppState(state);
        appStateRef.current = state;
        if (pipControllerRef.current?.isActive) {
          pipControllerRef.current.updateState(state, assistantNameRef.current, isSessionActiveRef.current);
        }
      };
      manager.onActiveChange = (active) => {
        setIsSessionActive(active);
        isSessionActiveRef.current = active;
        if (!active) {
          setAppState("idle");
          appStateRef.current = "idle";
          if (pipControllerRef.current?.isActive) {
            pipControllerRef.current.updateState("idle", assistantNameRef.current, false);
          }
          liveSessionRef.current = null;
        }
      };
      manager.onMessage = (sender, text) => {
        handleIncomingMessage(sender, text);
        if (!userName && sender === "zoya" && (/naam\s+kya/i.test(text) || /aapka\s+naam/i.test(text))) {
          askedForNameRef.current = true;
        }
      };
      manager.onNameDetected = (detectedName) => {
        updateUserName(detectedName);
        askedForNameRef.current = false;
      };
      manager.onMemoryDetected = (detectedMemory) => {
        handleMemoryDetected(detectedMemory);
      };
      manager.onCommand = (url) => {
        window.open(url, "_blank");
      };

      await manager.start();
      liveSessionRef.current = manager;
      setIsSessionActive(true);
      isSessionActiveRef.current = true;
      if (pipControllerRef.current?.isActive) {
        pipControllerRef.current.updateState(manager.getState(), assistantNameRef.current, true);
      }
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
      setAppState("idle");
      appStateRef.current = "idle";
      if (pipControllerRef.current?.isActive) {
        pipControllerRef.current.updateState("idle", assistantNameRef.current, false);
      }
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setShowPermissionModal(true);
      }
    }
  };

  const toggleListening = async () => {
    if (isSessionActiveRef.current || liveSessionRef.current) {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
      setAppState("idle");
      appStateRef.current = "idle";
      if (pipControllerRef.current?.isActive) {
        pipControllerRef.current.updateState("idle", assistantNameRef.current, false);
      }
      return;
    }

    await startVoiceSession(messagesRef.current, activeConversationIdRef.current || undefined);
  };

  useEffect(() => {
    toggleListeningRef.current = toggleListening;
  });

  const handleContinueConversation = (conv: SavedConversation) => {
    setMessages(conv.messages);
    messagesRef.current = conv.messages;
    setActiveConversationId(conv.id);
    activeConversationIdRef.current = conv.id;
    setSelectedConversation(null);
    setCurrentPage("home");

    // Seamlessly initiate voice session with conversation context
    setTimeout(() => {
      startVoiceSession(conv.messages, conv.id);
    }, 250);
  };

  const getLastMessagePreview = (conv: SavedConversation): string => {
    if (!conv.messages || conv.messages.length === 0) return "No messages yet";
    const last = conv.messages[conv.messages.length - 1];
    const prefix = last.sender === "user" ? "You: " : `${assistantName || "Zoya"}: `;
    return prefix + last.text;
  };

  // Sync PiP visuals when state, assistant name, or session status changes
  useEffect(() => {
    if (pipControllerRef.current?.isActive) {
      pipControllerRef.current.updateState(appState, assistantName, isSessionActive);
    }
  }, [appState, assistantName, isSessionActive]);

  // Clean up PiP controller on component unmount
  useEffect(() => {
    return () => {
      if (pipControllerRef.current) {
        pipControllerRef.current.close();
        pipControllerRef.current = null;
      }
    };
  }, []);

  const handleTogglePiP = async () => {
    // If PiP is currently active, turn it OFF cleanly and return to normal screen
    if (isPiPActive || pipControllerRef.current?.isActive) {
      if (pipControllerRef.current) {
        pipControllerRef.current.close();
        pipControllerRef.current = null;
      }
      setIsPiPActive(false);
      return;
    }

    // Check browser native PiP support directly
    if (!isPictureInPictureSupported()) {
      setIsPiPActive(false);
      return;
    }

    try {
      const controller = await requestZoyaPictureInPicture({
        appState: appStateRef.current,
        assistantName: assistantNameRef.current,
        isSessionActive: isSessionActiveRef.current,
        onToggleSession: () => {
          toggleListeningRef.current();
        },
        onClose: () => {
          pipControllerRef.current = null;
          setIsPiPActive(false);
        },
      });

      pipControllerRef.current = controller;
      setIsPiPActive(true);
    } catch (err) {
      console.warn("Could not activate Picture-in-Picture:", err);
      pipControllerRef.current = null;
      setIsPiPActive(false);
    }
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
              <div className="flex items-center gap-2 sm:gap-3">
                {showInstallButton && (
                  <button
                    id="install-zoya-header-btn"
                    onClick={handleInstallClick}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                    title="Install Zoya"
                    aria-label="Install Zoya"
                  >
                    <Download size={14} className="text-amber-400 shrink-0" />
                    <span>Install Zoya</span>
                  </button>
                )}
                <button
                  id="pip-header-btn"
                  onClick={handleTogglePiP}
                  aria-pressed={isPiPActive}
                  className={`relative p-2.5 rounded-full transition-all border cursor-pointer ${
                    isPiPActive
                      ? "bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/50 ring-2 ring-violet-400/40"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10"
                  }`}
                  title={isPiPActive ? "Picture-in-Picture: ON (Tap to turn OFF)" : "Picture-in-Picture: OFF (Tap to turn ON)"}
                  aria-label={isPiPActive ? "Picture-in-Picture is ON. Tap to turn OFF." : "Picture-in-Picture is OFF. Tap to turn ON."}
                >
                  <PictureInPicture2 size={18} strokeWidth={2} className={isPiPActive ? "text-white" : "text-zinc-300"} />
                  {isPiPActive && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center pointer-events-none">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#050505] shadow-sm shadow-emerald-500/80" />
                    </span>
                  )}
                </button>
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
            <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0">
              <div className="flex flex-col items-center gap-3">
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

                <p className="text-xs tracking-wide text-zinc-400 font-medium select-none text-center">
                  Created by Riyajul
                </p>
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
            <header className="w-full flex items-center justify-between px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage("home")}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                  title="Back to Zoya"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-medium tracking-wide text-white">Settings</h1>
              </div>
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  title="Install Zoya"
                  aria-label="Install Zoya"
                >
                  <Download size={14} className="text-amber-400 shrink-0" />
                  <span>Install Zoya</span>
                </button>
              )}
            </header>

            {/* Settings Page Content */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-6 md:p-8 z-10 overflow-y-auto space-y-3">
              {/* Personal Card */}
              <button
                onClick={() => setCurrentPage("personal")}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-base font-medium border border-white/5 hover:border-amber-500/30 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white group-hover:text-white">Personal</div>
                    <div className="text-xs text-zinc-400">Your name &amp; Gemini API key</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* Zoya Card */}
              <button
                onClick={() => setCurrentPage("zoya")}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-base font-medium border border-white/5 hover:border-amber-500/30 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Heart size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white group-hover:text-white">{assistantName || "Zoya"}</div>
                    <div className="text-xs text-zinc-400">Assistant name &amp; girlfriend mode</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* Memory Card */}
              <button
                onClick={() => setCurrentPage("memory")}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-base font-medium border border-white/5 hover:border-amber-500/30 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Brain size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white group-hover:text-white">Memory</div>
                    <div className="text-xs text-zinc-400">Things Zoya remembers about you</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>
            </main>
          </motion.div>
        ) : currentPage === "personal" ? (
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
            <header className="w-full flex items-center justify-between px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage("settings")}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                  title="Back to Settings"
                  aria-label="Back to Settings"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-medium tracking-wide text-white">Personal</h1>
              </div>
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  title="Install Zoya"
                  aria-label="Install Zoya"
                >
                  <Download size={14} className="text-amber-400 shrink-0" />
                  <span>Install Zoya</span>
                </button>
              )}
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
        ) : currentPage === "zoya" ? (
          <motion.div
            key="zoya-page"
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
            <header className="w-full flex items-center justify-between px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage("settings")}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                  title="Back to Settings"
                  aria-label="Back to Settings"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-medium tracking-wide text-white">Zoya</h1>
              </div>
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  title="Install Zoya"
                  aria-label="Install Zoya"
                >
                  <Download size={14} className="text-amber-400 shrink-0" />
                  <span>Install Zoya</span>
                </button>
              )}
            </header>

            {/* Zoya Page Content: ONLY Assistant name and Girlfriend mode */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-5 md:p-8 z-10 overflow-y-auto space-y-6">
              {/* 1. ASSISTANT NAME */}
              <div className="rounded-3xl bg-[#141418] border border-white/5 p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-wide">Assistant name</h2>
                    <p className="text-xs text-zinc-400">What you call her</p>
                  </div>
                </div>

                <form onSubmit={handleSaveAssistantName} className="space-y-4 pt-1">
                  <div className="w-full bg-[#1b1b22] border border-white/10 focus-within:border-amber-400/60 rounded-2xl p-3.5 transition-all">
                    <input
                      type="text"
                      value={assistantNameInput}
                      onChange={(e) => setAssistantNameInput(e.target.value)}
                      onBlur={() => handleSaveAssistantName()}
                      placeholder="e.g. Maya, Aria, Jarvis..."
                      className="w-full bg-transparent text-white placeholder:text-zinc-500 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                    >
                      {isAssistantNameSaved ? (
                        <>
                          <Check size={16} />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </button>
                    {isAssistantNameSaved && (
                      <span className="text-xs text-amber-400 font-medium">
                        Assistant name saved!
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* 2. GIRLFRIEND MODE */}
              <div className="rounded-3xl bg-[#141418] border border-white/5 p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Heart size={20} className={girlfriendMode ? "fill-amber-500" : ""} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-wide">Girlfriend mode</h2>
                    <p className="text-xs text-zinc-400">Zoya's romantic side</p>
                  </div>
                </div>

                {/* Enable girlfriend mode toggle row */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="space-y-1 pr-2">
                    <span className="text-sm font-medium text-white block">
                      Enable girlfriend mode
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Zoya talks like a close friend — warm and caring, no romance.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={girlfriendMode}
                    onClick={handleToggleGirlfriendMode}
                    className={`w-13 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer flex items-center shrink-0 ${
                      girlfriendMode ? "bg-amber-500" : "bg-zinc-700/70"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        girlfriendMode ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Lightbulb callout note */}
                <div className="rounded-2xl bg-[#1a1815] border border-amber-500/20 p-3.5 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
                  <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Takes effect the next time Zoya starts. Can't be switched by voice.</span>
                </div>
              </div>
            </main>
          </motion.div>
        ) : currentPage === "memory" ? (
          <motion.div
            key="memory-page"
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
            <header className="w-full flex items-center justify-between px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setCurrentPage("settings");
                    setIsAddingMemory(false);
                    setEditingMemoryId(null);
                  }}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                  title="Back to Settings"
                  aria-label="Back to Settings"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-medium tracking-wide text-white">Memory</h1>
              </div>
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  title="Install Zoya"
                  aria-label="Install Zoya"
                >
                  <Download size={14} className="text-amber-400 shrink-0" />
                  <span>Install Zoya</span>
                </button>
              )}
            </header>

            {/* Memory Page Content */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-5 md:p-8 z-10 overflow-y-auto space-y-5">
              {/* + Add Memory Button */}
              {!isAddingMemory && editingMemoryId === null && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingMemory(true);
                    setMemoryInput("");
                    setMemoryError("");
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 flex items-center justify-center gap-2 font-medium text-sm transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Plus size={18} />
                  <span>+ Add Memory</span>
                </button>
              )}

              {/* Add Memory Form */}
              {isAddingMemory && (
                <form
                  onSubmit={handleSaveNewMemory}
                  className="rounded-3xl bg-[#141418] border border-amber-500/30 p-5 sm:p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white tracking-wide">Add New Memory</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMemory(false);
                        setMemoryInput("");
                        setMemoryError("");
                      }}
                      className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      aria-label="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <textarea
                      value={memoryInput}
                      onChange={(e) => {
                        setMemoryInput(e.target.value);
                        if (memoryError) setMemoryError("");
                      }}
                      placeholder="e.g., User prefers short answers or Remember that my favorite color is black"
                      rows={3}
                      autoFocus
                      className="w-full bg-[#1b1b20] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-500/60 transition-all resize-none"
                    />
                    {memoryError && (
                      <p className="text-xs text-rose-400 font-medium px-1">{memoryError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMemory(false);
                        setMemoryInput("");
                        setMemoryError("");
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-xs sm:text-sm transition-all shadow-md shadow-orange-900/30 cursor-pointer active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* Memory List */}
              {memories.length > 0 && (
                <div className="space-y-3">
                  {memories.map((mem) => {
                    const isEditingThis = editingMemoryId === mem.id;
                    if (isEditingThis) {
                      return (
                        <form
                          key={mem.id}
                          onSubmit={handleSaveEditedMemory}
                          className="rounded-2xl bg-[#18181d] border border-amber-500/40 p-4 sm:p-5 shadow-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-400">Edit Memory</span>
                            <button
                              type="button"
                              onClick={handleCancelEditMemory}
                              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <textarea
                            value={editMemoryText}
                            onChange={(e) => {
                              setEditMemoryText(e.target.value);
                              if (editMemoryError) setEditMemoryError("");
                            }}
                            rows={2}
                            autoFocus
                            className="w-full bg-[#1b1b20] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-all resize-none"
                          />
                          {editMemoryError && (
                            <p className="text-xs text-rose-400 font-medium px-1">{editMemoryError}</p>
                          )}
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={handleCancelEditMemory}
                              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-xs transition-all shadow-sm cursor-pointer active:scale-95"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={mem.id}
                        className="flex items-start justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/5 hover:border-white/10 transition-all group shadow-md"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/15">
                            <Brain size={15} />
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                            {mem.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditMemory(mem)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit memory"
                            aria-label="Edit memory"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete memory"
                            aria-label="Delete memory"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {memories.length === 0 && !isAddingMemory && (
                <div className="py-16 text-center space-y-3 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                    <Brain size={26} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white">No memories yet</h3>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      You can add memories manually using the button above, or simply tell Zoya to remember something during a conversation (e.g., &quot;Zoya, ye yaad rakho...&quot;).
                    </p>
                  </div>
                </div>
              )}
            </main>
          </motion.div>
        ) : currentPage === "chat-history" ? (
          <motion.div
            key={selectedConversation ? `chat-detail-${selectedConversation.id}` : "chat-history-page"}
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

            {selectedConversation ? (
              <>
                {/* Header for Open Conversation */}
                <header className="w-full flex items-center justify-between px-6 py-4 md:px-12 md:py-5 border-b border-white/5 z-20 shrink-0 bg-[#050505]/70 backdrop-blur-md">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer shrink-0"
                      title="Back to History"
                      aria-label="Back to History"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-lg font-medium tracking-wide text-white truncate">
                        {selectedConversation.title}
                      </h1>
                      <p className="text-xs text-zinc-400 truncate">
                        {formatFullDateTime(selectedConversation.updatedAt || selectedConversation.createdAt)} • {selectedConversation.messages.length} {selectedConversation.messages.length === 1 ? "message" : "messages"}
                      </p>
                    </div>
                  </div>
                  {showInstallButton && (
                    <button
                      onClick={handleInstallClick}
                      className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      title="Install Zoya"
                      aria-label="Install Zoya"
                    >
                      <Download size={14} className="text-amber-400 shrink-0" />
                      <span>Install Zoya</span>
                    </button>
                  )}
                </header>

                {/* Conversation Messages Thread */}
                <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 z-10 overflow-y-auto space-y-4">
                  {selectedConversation.messages.map((msg, index) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[78%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                          {!isUser ? (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-1 shadow-md shadow-violet-900/30">
                              Z
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 text-xs font-medium shrink-0 mt-1">
                              <User size={14} />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              isUser
                                ? "bg-violet-600/25 border border-violet-500/30 text-white rounded-tr-sm"
                                : "bg-white/5 border border-white/10 text-zinc-200 rounded-tl-sm"
                            }`}
                          >
                            <div className="text-[11px] font-medium text-zinc-400 mb-1">
                              {isUser ? (userName || "You") : (assistantName || "Zoya")}
                            </div>
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </main>

                {/* Bottom Action: Continue Conversation */}
                <footer className="w-full border-t border-white/5 bg-[#050505]/80 backdrop-blur-md p-4 sm:p-5 z-20 shrink-0">
                  <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <button
                      onClick={() => handleContinueConversation(selectedConversation)}
                      className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-lg shadow-violet-900/25 cursor-pointer"
                    >
                      <Mic size={18} />
                      <span>Continue Conversation</span>
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <>
                {/* Header with Back Arrow in Top-Left Corner */}
                <header className="w-full flex items-center justify-between px-6 py-5 md:px-12 md:py-6 border-b border-white/5 z-20 shrink-0">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage("home")}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
                      title="Back"
                      aria-label="Back"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-medium tracking-wide text-white">Chat History</h1>
                  </div>
                  {showInstallButton && (
                    <button
                      onClick={handleInstallClick}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      title="Install Zoya"
                      aria-label="Install Zoya"
                    >
                      <Download size={14} className="text-amber-400 shrink-0" />
                      <span>Install Zoya</span>
                    </button>
                  )}
                </header>

                {/* Chat History Page Content */}
                {savedConversations.length === 0 ? (
                  <main className="flex-1 w-full max-w-2xl mx-auto p-6 md:p-8 z-10 overflow-y-auto flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
                      <History size={28} />
                    </div>
                    <h2 className="text-lg font-medium text-white mb-1">Chat History</h2>
                    <p className="text-sm text-zinc-400 max-w-sm">
                      No chat history yet.
                    </p>
                  </main>
                ) : (
                  <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 z-10 overflow-y-auto space-y-6">
                    {groupConversationsByDate(savedConversations).map((group) => (
                      <div key={group.group} className="space-y-2.5">
                        <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase px-2">
                          {group.group}
                        </h3>
                        <div className="space-y-2">
                          {group.conversations.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConversation(conv)}
                              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group cursor-pointer"
                            >
                              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                                  <MessageSquare size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-medium text-white group-hover:text-amber-200 transition-colors truncate">
                                      {conv.title}
                                    </h4>
                                    <span className="text-xs text-zinc-400 shrink-0">
                                      {formatConversationTime(conv.updatedAt || conv.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-400 truncate mt-1">
                                    {getLastMessagePreview(conv)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-block text-[11px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                      {conv.messages.length} {conv.messages.length === 1 ? "message" : "messages"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={18} className="text-zinc-500 group-hover:text-white/80 transition-colors shrink-0 ml-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </main>
                )}
              </>
            )}
          </motion.div>
        ) : null}
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
            onClick={handleCloseApiKeyModal}
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
                  onClick={handleCloseApiKeyModal}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Title & Message */}
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Gemini API Key Required
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  To start a Zoya AI voice session, you need to add your own Gemini API key.
                </p>
              </div>

              {/* Instruction */}
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Enter your Gemini API key below, or get a new key from Google AI Studio.
              </p>

              {/* Get a Gemini key link */}
              <div>
                <button
                  type="button"
                  onClick={() => window.open("https://aistudio.google.com/app/api-keys", "_blank", "noopener,noreferrer")}
                  className="text-amber-400 hover:text-amber-300 font-medium text-xs sm:text-sm transition-colors inline-flex items-center gap-1 cursor-pointer group"
                >
                  <span>Get a Gemini key</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </div>

              {/* Masked Password-Style Input Form */}
              <form onSubmit={handleSaveKeyFromModal} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="password"
                      value={modalKeyInput}
                      onChange={(e) => {
                        setModalKeyInput(e.target.value);
                        if (modalKeyError) setModalKeyError("");
                      }}
                      placeholder="Enter Gemini API key"
                      className="w-full bg-[#1b1b20] border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-amber-500/60 transition-all font-mono tracking-wider"
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                      <Lock size={18} />
                    </div>
                  </div>

                  {modalKeyError && (
                    <p className="text-xs text-rose-400 font-medium px-1">
                      {modalKeyError}
                    </p>
                  )}
                </div>

                {/* Actions: Save Key and Cancel */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm transition-all shadow-md shadow-amber-950/40 text-center cursor-pointer active:scale-[0.98]"
                  >
                    Save Key
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseApiKeyModal}
                    className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Install Help Modal when native prompt is not yet ready or running in iframe */}
        {showInstallHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowInstallHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-md rounded-3xl bg-[#141419] border border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 relative overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Download size={20} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstallHelp(false)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Install Zoya
                </h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Install Zoya to your home screen or desktop for instant full-screen voice assistant access.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-xs sm:text-sm text-zinc-300 space-y-2.5 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <span>Open Zoya in Chrome, Edge, or Safari browser</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <span>Tap <strong>Install Zoya</strong>, or open browser menu <strong>(⋮) → Install / Add to Home screen</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.open(window.location.href, "_blank");
                    setShowInstallHelp(false);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs sm:text-sm transition-all shadow-md shadow-amber-950/40 text-center cursor-pointer"
                >
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallHelp(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
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
              {/* Header inside Panel */}
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

              {/* Panel Body: Settings and Chat History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
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

                <button
                  onClick={() => {
                    setIsNavOpen(false);
                    setCurrentPage("chat-history");
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-sm font-medium border border-white/5 cursor-pointer"
                >
                  <History size={18} className="text-zinc-400" />
                  <span>Chat History</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
