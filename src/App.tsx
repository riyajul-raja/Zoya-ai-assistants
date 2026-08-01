import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, X, Settings, Camera, CameraOff, RefreshCw, Maximize2, Minimize2, Tv, Download, PictureInPicture, Shield, Fingerprint, Lock, Unlock, Box, Layers, Ghost, Users, User, HardDrive, Brain, Mail, Calendar, ListTodo, Presentation, MessageSquare, FileText, ClipboardList, Video, StickyNote, GraduationCap, Menu, ArrowRight, ChevronRight, ArrowLeft, ImagePlus, Paperclip, PlusCircle, Sparkles, Image as ImageIcon , Copy, Check } from "lucide-react";
import { getZoyaResponse, getZoyaResponseStream, DebugInfo, LOCKED_MODE_MESSAGE, isGeminiKeyConfigured, getZoyaAudio } from "./services/geminiService";
import { playPCM } from "./utils/audioUtils";
import { detectIntent } from "./services/intentService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import TypingIndicator from "./components/TypingIndicator";
import ChatPage from "./components/ChatPage";
import { motion, AnimatePresence } from "motion/react";
import ContactsManager from "./components/ContactsManager";
import DriveManager from "./components/DriveManager";
import MemoryManager from "./components/MemoryManager";
import GmailManager from "./components/GmailManager";
import CalendarManager from "./components/CalendarManager";
import TasksManager from "./components/TasksManager";
import SlidesManager from "./components/SlidesManager";
import GoogleChatManager from "./components/GoogleChatManager";
import DocsManager from "./components/DocsManager";
import FormsManager from "./components/FormsManager";
import MeetManager from "./components/MeetManager";
import KeepManager from "./components/KeepManager";
import ClassroomManager from "./components/ClassroomManager";
import PersonalSettings from "./components/PersonalSettings";
import ActivationSuccessModal from "./components/ActivationSuccessModal";
import { memoryOrchestrator, searchMemories } from "./modules/memory";

type AppState = "idle" | "listening" | "processing" | "speaking";

export interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  role?: "user" | "model";
  text: string;
  image?: string;
  images?: string[];
  isError?: boolean;
  isHighThinking?: boolean;
  generatedImageUrl?: string;
  generatedImagePrompt?: string;
  feedback?: "like" | "dislike";
  debugInfo?: Partial<DebugInfo>;
  showOpenSettingsButton?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "clear sky";
  if (code >= 1 && code <= 3) return "mainly clear, partly cloudy, or overcast";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 51 && code <= 55) return "drizzling";
  if (code >= 61 && code <= 65) return "rainy";
  if (code >= 71 && code <= 77) return "snowy";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "pleasant";
}

function getTimeOfDayDescription(): { timeOfDay: string; timeStr: string } {
  const now = new Date();
  const hrs = now.getHours();
  const minutesStr = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hrs % 12 || 12}:${minutesStr} ${hrs >= 12 ? "PM" : "AM"}`;
  let timeOfDay = "night";
  if (hrs >= 5 && hrs < 12) {
    timeOfDay = "morning";
  } else if (hrs >= 12 && hrs < 17) {
    timeOfDay = "afternoon";
  } else if (hrs >= 17 && hrs < 21) {
    timeOfDay = "evening";
  }
  return { timeOfDay, timeStr };
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const appStateRef = useRef<AppState>(appState);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [messagesBeforeGhost, setMessagesBeforeGhost] = useState<ChatMessage[] | null>(null);
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
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const messagesRef = useRef(messages);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const speechKeepAliveRef = useRef<any>(null);
  const hasLoggedVoicesRef = useRef(false);

  const getRuntimeEnvironment = useCallback(() => {
    if (typeof window === "undefined") return "Unknown (SSR)";
    const ua = navigator.userAgent || "";
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isWebView = /wv|Android.*Version\/[0-9.]+/i.test(ua) || (window as any).AndroidInterface !== undefined;
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg|OPR/i.test(ua);

    if (isPWA) return "PWA";
    if (isWebView) return "Android WebView";
    if (isChrome) return "Chrome";
    return `Browser (${ua})`;
  }, []);

  const selectStrictZoyaVoice = useCallback((voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;

    if (!hasLoggedVoicesRef.current && typeof console !== "undefined") {
      hasLoggedVoicesRef.current = true;
      console.log("[DIAGNOSTICS] Runtime Environment:", getRuntimeEnvironment());
      console.log("[DIAGNOSTICS] All Available SpeechSynthesis Voices:");
      if (console.table) {
        console.table(
          voices.map(v => ({
            name: v.name,
            lang: v.lang,
            voiceURI: v.voiceURI,
            default: v.default
          }))
        );
      } else {
        console.log(voices.map(v => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI, default: v.default })));
      }
    }

    // Strict priority matchers:
    // 1. Google हिन्दी
    let voice = voices.find(v => v.name.includes("Google") && v.name.includes("हिन्दी") && !v.name.includes("India"));
    if (!voice) voice = voices.find(v => v.name.includes("Google") && v.name.includes("हिन्दी"));

    // 2. Google Hindi
    if (!voice) voice = voices.find(v => v.name.includes("Google") && v.name.toLowerCase().includes("hindi"));

    // 3. Google हिन्दी (India)
    if (!voice) voice = voices.find(v => v.name.includes("Google") && v.name.includes("हिन्दी") && v.name.includes("India"));

    // 4. Google English India
    if (!voice) voice = voices.find(v => v.name.includes("Google") && (v.name.toLowerCase().includes("english india") || (v.name.includes("English") && v.name.includes("India")) || v.lang.includes("en-IN") || v.lang.includes("en_IN")));

    // 5. hi-IN Female
    if (!voice) voice = voices.find(v => (v.lang.includes("hi-IN") || v.lang.includes("hi_IN") || v.lang.includes("hi")) && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("swara") || v.name.toLowerCase().includes("neerja")));

    // 6. en-IN Female
    if (!voice) voice = voices.find(v => (v.lang.includes("en-IN") || v.lang.includes("en_IN")) && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("swara") || v.name.toLowerCase().includes("neerja") || v.name.toLowerCase().includes("heera") || v.name.toLowerCase().includes("kalpana")));

    // 7. Microsoft Swara
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("swara"));

    // 8. Microsoft Neerja
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("neerja"));

    // 9. Microsoft Heera
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("heera"));

    // 10. Microsoft Kalpana
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("kalpana"));

    // 11. Samantha
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("samantha"));

    // 12. Victoria
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("victoria"));

    // 13. Karen
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("karen"));

    // Fallback: Never select a US voice if an Indian female voice exists
    if (!voice) voice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("hi_IN") || v.lang.includes("hi"));
    if (!voice) voice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("en_IN"));
    if (!voice) voice = voices.find(v => v.name.toLowerCase().includes("female"));
    if (!voice && voices.length > 0) voice = voices[0];

    return voice || null;
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const voice = selectStrictZoyaVoice(voices);
        if (voice) {
          selectedVoiceRef.current = voice;
        }
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectStrictZoyaVoice]);

  const getZoyaVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    let selected: SpeechSynthesisVoice | null = null;

    if (selectedVoiceRef.current) {
      const activeMatch = voices.find(v => v.name === selectedVoiceRef.current?.name || v.voiceURI === selectedVoiceRef.current?.voiceURI);
      if (activeMatch) {
        selected = activeMatch;
      }
    }

    if (!selected) {
      const voice = selectStrictZoyaVoice(voices);
      if (voice) {
        selectedVoiceRef.current = voice;
        selected = voice;
      }
    }

    if (selected) {
      console.log("[DIAGNOSTICS] EXACT Voice Selected by getZoyaVoice():", {
        name: selected.name,
        lang: selected.lang,
        voiceURI: selected.voiceURI,
        default: selected.default
      });
    }

    return selected;
  }, [selectStrictZoyaVoice]);

  const cleanTextForSpeech = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/```[\s\S]*?```/g, " code block. ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#+\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  useEffect(() => {
    messagesRef.current = messages;
    if (!isGhostMode) {
      const cleanMessages = messages.filter((msg) => !msg.isError);
      localStorage.setItem("zoya_chat_history", JSON.stringify(cleanMessages));
    }
  }, [messages, isGhostMode]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('justUpdated') === 'true') {
      setShowUpdateToast(true);
      localStorage.removeItem('justUpdated');
      const timer = setTimeout(() => setShowUpdateToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(window.location.href, { cache: 'no-cache' });
        const etag = response.headers.get('ETag') || response.headers.get('Last-Modified');
        if (etag) {
          const storedEtag = localStorage.getItem('appVersionHeader');
          if (storedEtag && storedEtag !== etag) {
            localStorage.setItem('justUpdated', 'true');
            localStorage.setItem('appVersionHeader', etag);
            setIsUpdating(true);
            setTimeout(() => {
              window.location.reload();
            }, 2500);
          } else if (!storedEtag) {
            localStorage.setItem('appVersionHeader', etag);
          }
        }
      } catch (err) {
        // Silently ignore update check errors in preview environments
      }
    };

    checkForUpdates();

    document.addEventListener("visibilitychange", checkForUpdates);
    return () => {
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);
  const [showDrive, setShowDrive] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showGmail, setShowGmail] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showGoogleChat, setShowGoogleChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showForms, setShowForms] = useState(false);
  const [showMeet, setShowMeet] = useState(false);
  const [showKeep, setShowKeep] = useState(false);
  const [showClassroom, setShowClassroom] = useState(false);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(false);
  const [isPersonalSettingsOpen, setIsPersonalSettingsOpen] = useState(false);
  const [autoFocusApiKey, setAutoFocusApiKey] = useState(false);
  const [showActivationSuccessModal, setShowActivationSuccessModal] = useState(false);

  const handleApiKeyVerified = () => {
    setShowActivationSuccessModal(true);
    speakMessageText("Hello! Main ab poori tarah activate ho chuki hoon. Meri AI Brain safaltapoorvak activate ho gayi hai aur ab main aapki madad ke liye taiyar hoon. Chaliye, baat shuru karte hain!");
  };

  const handleStartChatFromActivationModal = () => {
    setShowActivationSuccessModal(false);
    setIsPersonalSettingsOpen(false);
    setAutoFocusApiKey(false);
    setShowChat(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleCloseActivationSuccessModal = () => {
    setShowActivationSuccessModal(false);
  };

  const handleOpenSettingsFromLockedMode = () => {
    if (isPersonalSettingsOpen) {
      setAutoFocusApiKey(false);
      setTimeout(() => {
        setAutoFocusApiKey(true);
      }, 50);
    } else {
      setIsPersonalSettingsOpen(true);
      setAutoFocusApiKey(true);
    }
  };
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isInputReadOnly, setIsInputReadOnly] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImages((prev) => [...prev, result.split(",")[1]]);
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = "";
  };
  const [chatHeight, setChatHeight] = useState(150);
  const chatContainerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isToolMenuOpen && toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setIsToolMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolMenuOpen]);


  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const isSessionActiveRef = useRef(isSessionActive);
  const isListeningRef = useRef(isListening);
  const listeningTimeoutRef = useRef<any>(null);
  const handleTextCommandRef = useRef<any>(null);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Biometric Security Lock Screen states
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  useEffect(() => {
    sessionStorage.removeItem('isZoyaUnlocked');
  }, []);
  const [unlockStatus, setUnlockStatus] = useState<"awaiting" | "granted" | "failed" | "unregistered">("awaiting");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<any>(null);

  const [passkeyInput, setPasskeyInput] = useState("");
  const [passkeyError, setPasskeyError] = useState(false);

  const handlePasskeySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passkeyInput === "#zoya") {
      setPasskeyError(false);
      localStorage.setItem("isRegisteredDevice", "true");
      setUnlockStatus("granted");
      setTimeout(() => {
        sessionStorage.setItem('isZoyaUnlocked', 'true');
        setIsUnlocked(true);
      }, 1000);
    } else {
      setPasskeyError(true);
      setUnlockStatus("failed");
      setTimeout(() => setUnlockStatus("awaiting"), 2000);
    }
  };

  const triggerBiometrics = async () => {
    if (unlockStatus === "granted") return;
    
    const isRegistered = localStorage.getItem("isRegisteredDevice") === "true";
    if (!isRegistered) {
      setUnlockStatus("unregistered");
      setTimeout(() => setUnlockStatus("awaiting"), 3000);
      return;
    }
    
    // Start scanning progress simulation
    setUnlockStatus("awaiting");
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    
    let currentProgress = 0;
    holdTimerRef.current = setInterval(() => {
      currentProgress = Math.min(currentProgress + 3, 90);
      setHoldProgress(currentProgress);
    }, 100);

    if (navigator.credentials && navigator.credentials.create) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const options: CredentialCreationOptions = {
          publicKey: {
            challenge: challenge,
            rp: {
              name: "Zoya Assistant",
              id: window.location.hostname || "localhost"
            },
            user: {
              id: new Uint8Array([1, 2, 3, 4]),
              name: localStorage.getItem("zoya_user_name") || "User",
              displayName: localStorage.getItem("zoya_user_name") || "User"
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 }
            ],
            timeout: 15000,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            }
          }
        };
        
        console.log("Requesting Biometrics credential...");
        await navigator.credentials.create(options);
        
        // Success
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setHoldProgress(100);
        setUnlockStatus("granted");
        setTimeout(() => {
          sessionStorage.setItem('isZoyaUnlocked', 'true');
          setIsUnlocked(true);
        }, 1000);
      } catch (err: any) {
        console.warn("Biometrics error / Not supported / Cancelled:", err);
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setHoldProgress(0);
        setUnlockStatus("failed");
        setTimeout(() => setUnlockStatus("awaiting"), 2000);
      }
    } else {
      console.warn("navigator.credentials is not supported.");
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setHoldProgress(0);
      setUnlockStatus("failed");
      setTimeout(() => setUnlockStatus("awaiting"), 2000);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  // Behavioral Mood Switcher states
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Ghost Mode (Stealth Protocol) handler
  const toggleGhostMode = () => {
    if (isGhostMode) {
      setIsGhostMode(false);
      if (messagesBeforeGhost !== null) {
        setMessages(messagesBeforeGhost);
        setMessagesBeforeGhost(null);
      }
      triggerToast("GHOST PROTOCOL DEACTIVATED");
    } else {
      setMessagesBeforeGhost(messages);
      setIsGhostMode(true);
      triggerToast("GHOST MODE ACTIVE: Traces will not be saved.");
    }
  };

  // AR Hologram Mode states
  const [isARMode, setIsARMode] = useState(false);
  const [arStatus, setArStatus] = useState<"calibrating" | "anchored" | "failed">("calibrating");
  const [xrSession, setXrSession] = useState<any>(null);
  const wasCameraActivatedByAR = useRef(false);

  // Device orientation angles for physical tracking
  const [arOrientation, setArOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [baselineOrientation, setBaselineOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);

  // Normalized cursor coordinates for desktop fallback tracking
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Listen for mouse moves for desktop tracking fallback
  useEffect(() => {
    if (!isARMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x: nx, y: ny });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isARMode]);

  // Listen for device orientation for mobile physical tracking
  useEffect(() => {
    if (!isARMode) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        setArOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
        setBaselineOrientation((prev) => {
          if (!prev) {
            return { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 };
          }
          return prev;
        });
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isARMode]);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const checkAIIntentAndAutoOpen = useCallback((userInput: string, aiResponse: string) => {
    const lowerInput = userInput.toLowerCase();
    const lowerAI = aiResponse.toLowerCase();

    // 1. Google Keep Note Intent
    if (
      lowerInput.includes("note") || 
      lowerInput.includes("keep") || 
      lowerAI.includes("note") || 
      lowerAI.includes("keep")
    ) {
      setShowKeep(true);

      const makeNoteRegex = /(?:make a note to|write a note to|create a note to|make a note about|add a note about|save a note to|note to|note about)\s+(.+)/i;
      const match = userInput.match(makeNoteRegex);
      if (match && match[1]) {
        const noteContent = match[1].trim();
        const noteTitle = noteContent.charAt(0).toUpperCase() + noteContent.slice(1);
        
        const cached = localStorage.getItem("zoya_keep_notes");
        let notesList = [];
        if (cached) {
          notesList = JSON.parse(cached);
        }
        
        const alreadyExists = notesList.some((n: any) => n.title === noteTitle);
        if (!alreadyExists) {
          const newNote = {
            name: `notes/zoya-auto-${Date.now()}`,
            title: noteTitle,
            body: {
              text: {
                text: `Saved automatically by Zoya AI: "${noteContent}".`
              }
            },
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          };
          notesList = [newNote, ...notesList];
          localStorage.setItem("zoya_keep_notes", JSON.stringify(notesList));
          
          triggerToast(`Zoya created a note: "${noteTitle}"`);
          window.dispatchEvent(new CustomEvent("zoya_notes_updated"));
        }
      }
    }

    // 2. Google Calendar Event Intent
    if (
      lowerInput.includes("calendar") || 
      lowerInput.includes("schedule") || 
      lowerInput.includes("event") || 
      lowerInput.includes("meeting") || 
      lowerAI.includes("calendar") || 
      lowerAI.includes("schedule") || 
      lowerAI.includes("meeting")
    ) {
      setShowCalendar(true);

      const scheduleRegex = /(?:schedule a meeting|schedule an event|create an event|schedule|add event|add to calendar)\s+(?:for|about|to)?\s*(.+)/i;
      const match = userInput.match(scheduleRegex);
      if (match && match[1]) {
        const eventSummary = match[1].trim();
        const capitalizedSummary = eventSummary.charAt(0).toUpperCase() + eventSummary.slice(1);

        const cached = localStorage.getItem("zoya_calendar_events");
        let eventsList = [];
        if (cached) {
          eventsList = JSON.parse(cached);
        }

        const alreadyExists = eventsList.some((e: any) => e.summary === capitalizedSummary);
        if (!alreadyExists) {
          const newEvent = {
            id: `local-ev-${Date.now()}`,
            summary: capitalizedSummary,
            description: `Scheduled via Zoya AI Voice/Text assistant command: "${userInput}".`,
            location: "Virtual Meeting Room",
            start: { dateTime: new Date(Date.now() + 3600000).toISOString() }, 
            end: { dateTime: new Date(Date.now() + 7200000).toISOString() }
          };
          eventsList = [newEvent, ...eventsList];
          localStorage.setItem("zoya_calendar_events", JSON.stringify(eventsList));
          
          triggerToast(`Zoya scheduled an event: "${capitalizedSummary}"`);
          window.dispatchEvent(new CustomEvent("zoya_calendar_updated"));
        }
      }
    }

    // 3. Gmail Inbox/Email Intent
    if (
      lowerInput.includes("gmail") || 
      lowerInput.includes("email") || 
      lowerInput.includes("mail") || 
      lowerInput.includes("inbox") || 
      lowerAI.includes("gmail") || 
      lowerAI.includes("email") || 
      lowerAI.includes("mailroom")
    ) {
      setShowGmail(true);

      const emailRegex = /(?:send an email to|email to|compose an email to)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/i;
      const match = userInput.match(emailRegex);
      if (match && match[1]) {
        const recipient = match[1].trim();
        triggerToast(`Opening Zoya Mailroom composer for: ${recipient}`);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("zoya_gmail_compose", { detail: { to: recipient } }));
        }, 300);
      }
    }

    // 4. Tasks Intent
    if (
      lowerInput.includes("task") || 
      lowerInput.includes("todo") || 
      lowerInput.includes("to-do") || 
      lowerAI.includes("task") || 
      lowerAI.includes("todo")
    ) {
      setShowTasks(true);

      const taskRegex = /(?:add a task to|create a task to|add task|create task|todo to|remind me to)\s+(.+)/i;
      const match = userInput.match(taskRegex);
      if (match && match[1]) {
        const taskTitle = match[1].trim();
        const capitalizedTask = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

        const cached = localStorage.getItem("zoya_tasks");
        let tasksList = [];
        if (cached) {
          tasksList = JSON.parse(cached);
        }

        const alreadyExists = tasksList.some((t: any) => t.title === capitalizedTask);
        if (!alreadyExists) {
          const newTask = {
            id: `local-task-${Date.now()}`,
            title: capitalizedTask,
            notes: "Created automatically by Zoya AI console stream.",
            status: "needsAction",
            due: new Date(Date.now() + 86400000).toISOString()
          };
          tasksList = [newTask, ...tasksList];
          localStorage.setItem("zoya_tasks", JSON.stringify(tasksList));

          triggerToast(`Zoya added a task: "${capitalizedTask}"`);
          window.dispatchEvent(new CustomEvent("zoya_tasks_updated"));
        }
      }
    }

    // 5. Google Contacts
    if (lowerInput.includes("contacts") || lowerInput.includes("contact list") || lowerAI.includes("contacts")) {
      setShowContacts(true);
    }

    // 6. Google Drive
    if (lowerInput.includes("drive") || lowerInput.includes("explorer") || lowerAI.includes("drive explorer") || lowerAI.includes("google drive")) {
      setShowDrive(true);
    }
  }, [triggerToast, setShowKeep, setShowCalendar, setShowGmail, setShowTasks, setShowContacts, setShowDrive]);

  // Geolocation & Weather Environment Context state
  const [environmentContext, setEnvironmentContext] = useState<string>("");

  const fetchEnvironmentAwareness = useCallback(async () => {
    const { timeOfDay, timeStr } = getTimeOfDayDescription();
    
    const setFallbackContext = () => {
      const fallbackCtx = `ENVIRONMENT CONTEXT:
- Current Local Time: ${timeStr} (It is currently ${timeOfDay}).
- Current Weather: Unknown (Location permission not granted or weather request failed).

INSTRUCTION FOR FIRST GREETING:
In your very first response or greeting to the user, you MUST casually and naturally mention this current time of day (and playfully comment that the weather is a mystery because they didn't share their location, but greet them anyway). Keep it short, witty, and perfectly fitting your Zoya persona.`;
      setEnvironmentContext(fallbackCtx);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            );
            if (!res.ok) throw new Error("Weather fetch failed");
            const data = await res.json();
            const current = data?.current_weather;
            if (current) {
              const temp = current.temperature;
              const cond = getWeatherDescription(current.weathercode || 0);
              const fullCtx = `ENVIRONMENT CONTEXT:
- Current Local Time: ${timeStr} (It is currently ${timeOfDay}).
- Current Weather: ${temp}°C, ${cond}.

INSTRUCTION FOR FIRST GREETING:
In your very first response or greeting to the user, you MUST casually and naturally mention this current time of day and the current weather temperature/conditions (e.g., "Good morning, it's 25 degrees outside..." or similar natural, sassy/professional greeting depending on your active mode). Keep it short, witty, and perfectly fitting your Zoya persona.`;
              setEnvironmentContext(fullCtx);
            } else {
              setFallbackContext();
            }
          } catch (err) {
            console.error("Error fetching weather data:", err);
            setFallbackContext();
          }
        },
        (error) => {
          console.log("Geolocation permission denied or error:", error);
          setFallbackContext();
        },
        { timeout: 10000 }
      );
    } else {
      setFallbackContext();
    }
  }, []);

  useEffect(() => {
    fetchEnvironmentAwareness();
  }, [fetchEnvironmentAwareness]);

  // Screen Wake Lock API lifecycle
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) {
        console.warn("Screen Wake Lock API is not supported in this browser.");
        return;
      }
      try {
        if (wakeLockRef.current) {
          return;
        }
        const lock = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current = lock;
        console.log("Screen Wake Lock acquired.");
        
        lock.addEventListener("release", () => {
          console.log("Screen Wake Lock released by system/browser.");
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn("Failed to acquire Screen Wake Lock:", err);
      }
    }

    async function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        await requestWakeLock();
      }
    }

    // Request wake lock initially
    requestWakeLock();

    // Re-acquire lock when app becomes visible again (returned from background)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => {
            console.log("Screen Wake Lock released in component cleanup.");
          })
          .catch((err: any) => {
            console.warn("Error releasing Screen Wake Lock during cleanup:", err);
          });
      }
    };
  }, []);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraActive]);

  // Monitor PiP state changes (e.g. if the user closes the PiP window manually)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, [isCameraActive]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
          await video.requestPictureInPicture();
        } else {
          alert("Picture-in-Picture is not supported by your browser for this video feed.");
        }
      }
    } catch (err: any) {
      console.error("Picture-in-Picture failed:", err);
      alert(`Could not toggle Picture-in-Picture: ${err?.message || "Unknown error"}`);
    }
  };

  // 3D Globe Visualizer Picture-in-Picture states
  const [isGlobePiPActive, setIsGlobePiPActive] = useState(false);
  const globePiPVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = globePiPVideoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsGlobePiPActive(true);
    const handleLeavePiP = () => {
      setIsGlobePiPActive(false);
      // Stop the stream tracks to save resources
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      video.srcObject = null;
    };

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  const toggleGlobePiP = async () => {
    const video = globePiPVideoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        // Exit active Picture-in-Picture mode
        await document.exitPictureInPicture();
      } else {
        const canvas = document.getElementById("zoya-globe-canvas") as HTMLCanvasElement;
        if (!canvas) {
          alert("3D visualizer canvas not found yet.");
          return;
        }

        // Capture canvas stream at 30fps
        const captureStreamFn = canvas.captureStream || (canvas as any).mozCaptureStream;
        if (!captureStreamFn) {
          alert("Your browser does not support canvas stream capture for Picture-in-Picture.");
          return;
        }

        const stream = captureStreamFn.call(canvas, 30);
        video.srcObject = stream;

        // Play the video stream first
        await video.play();

        if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
          await video.requestPictureInPicture();
        } else {
          alert("Picture-in-Picture is not supported by your browser.");
        }
      }
    } catch (err: any) {
      console.error("3D Globe Picture-in-Picture failed:", err);
      alert(`Could not toggle Floating Mode: ${err?.message || "Unknown error"}`);
    }
  };

  const handlePiP = async () => {
    await toggleGlobePiP();
  };

  // Keep tab/Websocket alive when hidden
  useEffect(() => {
    let intervalId: any = null;
    let silentOscillator: OscillatorNode | null = null;
    let silentGain: GainNode | null = null;

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === "hidden";
      console.log(`[Persistence] Visibility changed: ${document.visibilityState}`);

      if (isHidden) {
        // Keep WebSocket active by playing a silent Web Audio stream
        // This tricks the browser into not throttling or sleeping the tab because it is playing media
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          gain.gain.value = 0.001; // extremely silent, virtually unhearable but technically playing sound
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          
          silentOscillator = osc;
          silentGain = gain;
          console.log("[Persistence] Background session keep-alive activated (Web Audio).");
        } catch (e) {
          console.error("[Persistence] Web Audio keep-alive failed to start:", e);
        }

        // Periodically ping the active session every 15 seconds to keep the WS connection active
        intervalId = setInterval(() => {
          if (liveSessionRef.current) {
            console.log("[Persistence] Background keep-alive heartbeat ping sent.");
            try {
              liveSessionRef.current.sendText(" ");
            } catch (err) {
              console.error("[Persistence] Background heartbeat error:", err);
            }
          }
        }, 15000);
      } else {
        // Clean up when visible again
        if (silentOscillator) {
          try {
            silentOscillator.stop();
          } catch (e) {}
          silentOscillator = null;
        }
        if (silentGain) {
          try {
            silentGain.disconnect();
          } catch (e) {}
          silentGain = null;
        }
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        console.log("[Persistence] App returned to foreground. Background persistence released.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (silentOscillator) {
        try {
          silentOscillator.stop();
        } catch (e) {}
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Capture video frame and send to Gemini Multimodal Live API
  useEffect(() => {
    if (!isCameraActive || !cameraStream) return;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      try {
        const canvas = document.createElement("canvas");
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 240;
        
        // Downscale to avoid sending too much data (max 480px width or height is perfect for Gemini Live)
        const maxDim = 480;
        let w = width;
        let h = height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          const base64Data = dataUrl.split(",")[1];
          
          if (base64Data && liveSessionRef.current) {
            liveSessionRef.current.sendVideoFrame(base64Data);
          }
        }
      } catch (err) {
        console.error("Failed to capture and send camera frame:", err);
      }
    }, 1000); // Send 1 frame per second (1 FPS) as recommended to prevent model overload

    return () => clearInterval(intervalId);
  }, [isCameraActive, cameraStream]);

  // Synchronize Live Session Lifecycle with isCameraActive and isMuted
  useEffect(() => {
    const shouldBeRunning = isCameraActive;
    const requiredMic = !!isSessionActive;

    const manageSession = async () => {
      const currentSession = liveSessionRef.current;

      if (!shouldBeRunning) {
        if (currentSession) {
          currentSession.stop();
          liveSessionRef.current = null;
          setAppState("idle");
        }
        return;
      }

      // If already running, check if mic requirements, professional mode, and environment context match
      if (currentSession) {
        currentSession.isMuted = isMuted;
        const currentMic = (currentSession as any)._useMic;
        const currentProfessional = (currentSession as any)._isProfessionalMode;
        const currentEnvironment = (currentSession as any)._environmentContext;
        if (
          currentMic === requiredMic && 
          currentProfessional === isProfessionalMode && 
          currentEnvironment === environmentContext
        ) {
          // All good, no need to recreate
          return;
        }
        // Restart session because mic requirement, mood, or environment context changed
        currentSession.stop();
        liveSessionRef.current = null;
      }

      // Start new session
      try {
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        (session as any)._useMic = requiredMic;
        (session as any)._isProfessionalMode = isProfessionalMode;
        (session as any)._environmentContext = environmentContext;
        liveSessionRef.current = session;

        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        let currentZoyaMessageId: string | null = null;
        session.onMessage = (sender, text) => {
          if (sender === "zoya") {
            setMessages((prev) => {
              if (
                prev.length > 0 && 
                prev[prev.length - 1].sender === "zoya" && 
                currentZoyaMessageId === prev[prev.length - 1].id
              ) {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...lastMsg,
                  text: lastMsg.text + text
                };
                return updated;
              } else {
                const newId = Date.now().toString() + "-zoya";
                currentZoyaMessageId = newId;
                return [...prev, { id: newId, sender: "zoya", role: "model", text }];
              }
            });
          } else {
            setMessages((prev) => [...prev, { id: Date.now().toString() + "-user", sender: "user", role: "user", text }]);
          }
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        session.onUIAction = (panelName) => {
          if (!panelName) return;
          const lower = panelName.toLowerCase();
          if (lower === "gmail") {
            setShowGmail(true);
            setShowChat(true);
            triggerToast("Opening Zoya Mailroom...");
          } else if (lower === "calendar") {
            setShowCalendar(true);
            setShowChat(true);
            triggerToast("Opening Zoya Calendar...");
          } else if (lower === "tasks") {
            setShowTasks(true);
            setShowChat(true);
            triggerToast("Opening Zoya Tasks...");
          } else if (lower === "keep") {
            setShowKeep(true);
            setShowChat(true);
            triggerToast("Opening Zoya Keep...");
          } else if (lower === "contacts") {
            setShowContacts(true);
            setShowChat(true);
            triggerToast("Opening Google Contacts...");
          } else if (lower === "drive") {
            setShowDrive(true);
            setShowChat(true);
            triggerToast("Opening Drive Explorer...");
          } else if (lower === "slides") {
            setShowSlides(true);
            setShowChat(true);
            triggerToast("Opening Google Slides...");
          } else if (lower === "chat") {
            setShowGoogleChat(true);
            setShowChat(true);
            triggerToast("Opening Google Chat...");
          } else if (lower === "docs") {
            setShowDocs(true);
            setShowChat(true);
            triggerToast("Opening Google Docs...");
          } else if (lower === "forms") {
            setShowForms(true);
            setShowChat(true);
            triggerToast("Opening Google Forms...");
          } else if (lower === "meet") {
            setShowMeet(true);
            setShowChat(true);
            triggerToast("Opening Google Meet...");
          } else if (lower === "classroom") {
            setShowClassroom(true);
            setShowChat(true);
            triggerToast("Opening Google Classroom...");
          } else if (lower === "memories") {
            setShowMemories(true);
            setShowChat(true);
            triggerToast("Opening Memory Core...");
          }
        };

        await session.start(requiredMic, isProfessionalMode, environmentContext, messagesRef.current);
      } catch (err) {
        console.error("Failed to start synchronized live session:", err);
        liveSessionRef.current = null;
        setAppState("idle");
      }
    };

    manageSession();
  }, [isCameraActive, isSessionActive, isMuted, isProfessionalMode, environmentContext]);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRequestRef = useRef(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showChat]);

  const startListeningLoop = useCallback(() => {
    if (!isSessionActiveRef.current) return;
    if (isSpeakingRef.current || appStateRef.current === "speaking" || appStateRef.current === "processing") {
      console.log("[startListeningLoop] Currently speaking or processing, deferring STT start...");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge.");
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
      setAppState("idle");
      return;
    }

    if (typeof window !== "undefined" && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending || isSpeakingRef.current)) {
      console.log("[startListeningLoop] Speech synthesis active, deferring STT start...");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        if (isSessionActiveRef.current && !isSpeakingRef.current) {
          setIsListening(true);
          setAppState("listening");
        }
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        if (event.results) {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i] && event.results[i][0]) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (!transcript && event.results[0] && event.results[0][0]) {
            transcript = event.results[0][0].transcript;
          }
        }

        if (transcript && transcript.trim()) {
          console.log("[startListeningLoop] Voice Transcript:", transcript);
          try {
            recognition.stop();
          } catch (e) {}
          setIsListening(false);
          setAppState("processing");

          if (handleTextCommandRef.current) {
            handleTextCommandRef.current(transcript.trim(), false, []);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[startListeningLoop] Speech recognition error:", event.error);
        if (isSessionActiveRef.current && !isSpeakingRef.current && appStateRef.current === "listening") {
          clearTimeout(listeningTimeoutRef.current);
          listeningTimeoutRef.current = setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current && appStateRef.current === "listening" && (!window.speechSynthesis || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending))) {
              startListeningLoop();
            }
          }, 350);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isSessionActiveRef.current) {
          clearTimeout(listeningTimeoutRef.current);
          if (!isSpeakingRef.current && appStateRef.current === "listening") {
            listeningTimeoutRef.current = setTimeout(() => {
              if (isSessionActiveRef.current && !isSpeakingRef.current && appStateRef.current === "listening" && (!window.speechSynthesis || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending))) {
                startListeningLoop();
              }
            }, 250);
          }
        } else {
          setAppState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("[startListeningLoop] Initialization error:", e);
      if (isSessionActiveRef.current && !isSpeakingRef.current && appStateRef.current === "listening") {
        clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = setTimeout(() => {
          if (isSessionActiveRef.current && !isSpeakingRef.current && appStateRef.current === "listening") {
            startListeningLoop();
          }
        }, 500);
      }
    }
  }, []);

  const finishSpeechOrTurn = useCallback(() => {
    isSpeakingRef.current = false;
    if (isSessionActiveRef.current) {
      setAppState("listening");
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = setTimeout(() => {
        if (isSessionActiveRef.current && !isSpeakingRef.current) {
          startListeningLoop();
        }
      }, 300);
    } else {
      setAppState("idle");
    }
  }, [startListeningLoop]);

  // Streaming Audio Queue State & Ref System
  const speechQueueRef = useRef<string[]>([]);
  const audioBufferQueueRef = useRef<Array<{ sentence: string; base64Audio: string | null }>>([]);
  const isFetchingAudioRef = useRef<boolean>(false);
  const isPlayingAudioRef = useRef<boolean>(false);
  const isStreamCompletedRef = useRef<boolean>(false);

  const cancelCurrentSpeech = useCallback(() => {
    speechQueueRef.current = [];
    audioBufferQueueRef.current = [];
    isFetchingAudioRef.current = false;
    isPlayingAudioRef.current = false;
    isSpeakingRef.current = false;
    isStreamCompletedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }, []);

  const playSpeechSynthesisFallback = useCallback((sentenceText: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      const zoyaVoice = getZoyaVoice();
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      if (zoyaVoice) {
        utterance.voice = zoyaVoice;
        utterance.lang = zoyaVoice.lang;
      } else {
        utterance.lang = "en-IN";
      }
      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      try {
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.resume();
      } catch (e) {
        resolve();
      }
    });
  }, [getZoyaVoice]);

  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current) return;

    if (audioBufferQueueRef.current.length === 0) {
      if (speechQueueRef.current.length === 0 && !isFetchingAudioRef.current && isStreamCompletedRef.current) {
        isSpeakingRef.current = false;
        finishSpeechOrTurn();
      }
      return;
    }

    const item = audioBufferQueueRef.current.shift();
    if (!item) return;

    isPlayingAudioRef.current = true;
    isSpeakingRef.current = true;
    setAppState("speaking");

    const cleaned = cleanTextForSpeech(item.sentence);
    if (!cleaned) {
      isPlayingAudioRef.current = false;
      processAudioQueue();
      return;
    }

    if (item.base64Audio) {
      try {
        console.log("[Streaming TTS] Playing Gemini PCM Audio for sentence:", cleaned);
        await playPCM(item.base64Audio);
      } catch (err) {
        console.warn("[Streaming TTS] playPCM failed, falling back to Web Speech:", err);
        await playSpeechSynthesisFallback(cleaned);
      }
    } else {
      console.log("[Streaming TTS] Web Speech fallback for sentence:", cleaned);
      await playSpeechSynthesisFallback(cleaned);
    }

    isPlayingAudioRef.current = false;
    processAudioQueue();
  }, [finishSpeechOrTurn, cleanTextForSpeech, playSpeechSynthesisFallback]);

  const fetchNextAudio = useCallback(async () => {
    if (isFetchingAudioRef.current) return;
    if (speechQueueRef.current.length === 0) return;

    isFetchingAudioRef.current = true;
    const sentence = speechQueueRef.current.shift()!;

    try {
      const audioPromise = getZoyaAudio(sentence);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
      const base64Audio = await Promise.race([audioPromise, timeoutPromise]);

      audioBufferQueueRef.current.push({ sentence, base64Audio });
    } catch (e) {
      console.warn("[Streaming TTS] Audio fetch error for sentence:", e);
      audioBufferQueueRef.current.push({ sentence, base64Audio: null });
    } finally {
      isFetchingAudioRef.current = false;
      processAudioQueue();
      if (speechQueueRef.current.length > 0) {
        fetchNextAudio();
      }
    }
  }, [processAudioQueue]);

  const enqueueSentenceForSpeech = useCallback((sentence: string) => {
    const cleaned = cleanTextForSpeech(sentence);
    if (!cleaned || !cleaned.trim()) return;

    speechQueueRef.current.push(cleaned);
    fetchNextAudio();
  }, [cleanTextForSpeech, fetchNextAudio]);

  const markStreamCompleted = useCallback(() => {
    isStreamCompletedRef.current = true;
    processAudioQueue();
  }, [processAudioQueue]);

  const speakWithZoya = useCallback((text: string) => {
    console.log("[TTS] speakWithZoya entered", { text });
    if (!text || !text.trim()) {
      finishSpeechOrTurn();
      return;
    }

    cancelCurrentSpeech();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
      finishSpeechOrTurn();
      return;
    }

    const sentences = cleanedText.match(/[^.!?\n]+[.!?\n]*/g) || [cleanedText];
    for (const s of sentences) {
      enqueueSentenceForSpeech(s);
    }
    markStreamCompleted();
  }, [cancelCurrentSpeech, cleanTextForSpeech, enqueueSentenceForSpeech, markStreamCompleted, finishSpeechOrTurn]);

  const speakMessageText = speakWithZoya;

  const autoTriggerUIFromText = useCallback((text: string) => {
    if (!text) return;
    const lower = text.toLowerCase();
    
    if (lower.includes("gmail") || lower.includes("email") || lower.includes("mail")) {
      setShowGmail(true);
      setShowChat(true);
      triggerToast("Opening Zoya Mailroom...");
    } else if (lower.includes("calendar") || lower.includes("schedule") || lower.includes("event") || lower.includes("appointment")) {
      setShowCalendar(true);
      setShowChat(true);
      triggerToast("Opening Zoya Calendar...");
    } else if (lower.includes("tasks") || lower.includes("todo") || lower.includes("to-do")) {
      setShowTasks(true);
      setShowChat(true);
      triggerToast("Opening Zoya Tasks...");
    } else if (lower.includes("keep") || lower.includes("note")) {
      setShowKeep(true);
      setShowChat(true);
      triggerToast("Opening Zoya Keep...");
    } else if (lower.includes("contacts") || lower.includes("people")) {
      setShowContacts(true);
      setShowChat(true);
      triggerToast("Opening Google Contacts...");
    } else if (lower.includes("drive") || lower.includes("explorer") || lower.includes("file")) {
      setShowDrive(true);
      setShowChat(true);
      triggerToast("Opening Drive Explorer...");
    } else if (lower.includes("classroom") || lower.includes("class")) {
      setShowClassroom(true);
      setShowChat(true);
      triggerToast("Opening Google Classroom...");
    } else if (lower.includes("memory") || lower.includes("memories")) {
      setShowMemories(true);
      setShowChat(true);
      triggerToast("Opening Memory Core...");
    } else if (lower.includes("slide")) {
      setShowSlides(true);
      setShowChat(true);
      triggerToast("Opening Google Slides...");
    } else if (lower.includes("chat")) {
      setShowGoogleChat(true);
      setShowChat(true);
      triggerToast("Opening Google Chat...");
    } else if (lower.includes("docs") || lower.includes("document")) {
      setShowDocs(true);
      setShowChat(true);
      triggerToast("Opening Google Docs...");
    } else if (lower.includes("forms")) {
      setShowForms(true);
      setShowChat(true);
      triggerToast("Opening Google Forms...");
    } else if (lower.includes("meet")) {
      setShowMeet(true);
      setShowChat(true);
      triggerToast("Opening Google Meet...");
    }
  }, []);

  const handleDownloadImage = async (url: string, prompt: string) => {
    try {
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };

  const handleRegenerateImage = (messageId: string, prompt: string) => {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt || "a beautiful abstract landscape");
    const newImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          generatedImageUrl: newImageUrl
        };
      }
      return msg;
    }));
  };

  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {
    console.log("[handleTextCommand] Called with:", finalTranscript.substring(0, 30));
    const currentHistory = [...messagesRef.current];
    
    if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {
      setAppState("idle");
      isProcessingRequestRef.current = false;
      return;
    }

    // Process memory in the background (fire and forget)
    if (finalTranscript.trim()) {
      memoryOrchestrator.processMemory(finalTranscript, "chat").catch(error => {
        if (import.meta.env.DEV) {
          console.error("[Memory] Background memory processing failed:", error);
        }
      });
    }

    autoTriggerUIFromText(finalTranscript);

    let capturedImageBase64s: string[] = [...attachedImageBase64s];
    if (isCameraActive && capturedImageBase64s.length === 0) {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        try {
          const canvas = document.createElement("canvas");
          const width = video.videoWidth || 320;
          const height = video.videoHeight || 240;
          
          const maxDim = 480;
          let w = width;
          let h = height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          
          canvas.width = w;
          canvas.height = h;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            capturedImageBase64s.push(dataUrl.split(',')[1]);
          }
        } catch (err) {
          console.error("Failed to capture image frame for chat payload:", err);
        }
      }
    }

    // 1. SAFE URL CREATION
    const safeImages = capturedImageBase64s.map(img => {
      if (typeof img === 'string') {
        return img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
      }
      if ((img as any) instanceof File || (img as any) instanceof Blob) {
        return URL.createObjectURL(img as Blob);
      }
      return "";
    }).filter(Boolean);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        role: "user",
        text: finalTranscript,
        image: safeImages.length > 0 ? safeImages[0] : undefined,
        images: safeImages.length > 0 ? safeImages : undefined,
      },
    ]);
    
    // LOCKED MODE (NO GEMINI API KEY)
    if (!isGeminiKeyConfigured()) {
      setIsLoading(true);
      setAppState("processing");

      await new Promise(r => setTimeout(r, 400));

      const responseMessageId = Date.now().toString() + "-z";
      
      setMessages((prev) => [
        ...prev,
        {
          id: responseMessageId,
          sender: "zoya",
          role: "model",
          text: LOCKED_MODE_MESSAGE,
          showOpenSettingsButton: true,
          debugInfo: {
            intent: "LOCAL",
            apiUsed: false,
            modelName: "N/A",
            isCached: false,
            responseTimeMs: 400,
            status: "Success",
            routingMs: 2,
            apiMs: 0,
            streamingMs: 0,
            renderingMs: 5,
            totalMs: 400,
            intentConfidence: 100,
            contextConfidence: 100,
            memoryConfidence: 100,
            overallConfidence: 100,
            decision: "Locked Mode (No Gemini API Key)"
          }
        }
      ]);

      if (!isMuted && !skipSpeech) {
        speakMessageText(LOCKED_MODE_MESSAGE);
      } else {
        finishSpeechOrTurn();
      }

      isProcessingRequestRef.current = false;
      return;
    }

    // If live session is active (either because voice is active or camera is ON), send text through it
    // But if we have an attached image, fallback to standard REST API with gemini-3.1-pro-preview
    if (liveSessionRef.current && attachedImageBase64s.length === 0) {
      liveSessionRef.current.sendText(finalTranscript);
      isProcessingRequestRef.current = false;
      return;
    }

    setAppState("processing");

    // 0. Check for image generation intent
    const isImageGen = /\b(generate|create|draw|make|render)\b.*(?:image|picture|photo|art|drawing|portrait|illustration|wallpaper)/i.test(finalTranscript);
    if (isImageGen && attachedImageBase64s.length === 0) {
      setIsLoading(true);
      const responseMessageId = Date.now().toString() + "-z";
      
      const promptToEncode = finalTranscript
        .replace(/\b(can you|please|generate|create|draw|make|render)\b/gi, '')
        .replace(/\b(an image|a picture|a photo|art|a drawing|a portrait|an illustration|a wallpaper|of)\b/gi, '')
        .replace(/\b(image|picture|photo|art|drawing|portrait|illustration|wallpaper)\b/gi, '')
        .trim() || finalTranscript;
        
      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(promptToEncode || "a beautiful abstract landscape");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
      
      setMessages((prev) => [
        ...prev,
        { 
          id: responseMessageId, 
          sender: "zoya", 
          role: "model", 
          text: `Here is the image you requested:`,
          generatedImageUrl: imageUrl,
          generatedImagePrompt: promptToEncode
        }
      ]);
      setIsLoading(false);
      
      if (!isMuted && !skipSpeech) {
        speakMessageText("Here is the image you requested");
      } else {
        finishSpeechOrTurn();
      }
      isProcessingRequestRef.current = false;
      return;
    }

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);


    let responseText = "";
    let intentResult: any = null;

    // 0. Smart Intent Router
    if (attachedImageBase64s.length === 0) {
      intentResult = detectIntent(finalTranscript);
      console.log(
        `\n==================================================\n` +
        `Intent: ${intentResult.type}\n` +
        `Module Used: ${intentResult.module || 'Gemini'}\n` +
        `API Called: ${intentResult.type === 'GEMINI' ? 'YES' : 'NO'}\n` +
        `==================================================\n`
      );
      
      if (intentResult.type === "LOCAL" && intentResult.response) {
        console.log(`[Intent Router] Executing locally. No Gemini API will be called.`);
        setIsLoading(true);
        setAppState("processing");

        const delayMs = 0;

        const responseMessageId = Date.now().toString() + "-z";
        const localRoutingMs = intentResult.routingMs || 2;
        const localTotalMs = (intentResult.totalMs || localRoutingMs) + delayMs;

        setMessages((prev) => [
          ...prev,
          { 
            id: responseMessageId, 
            sender: "zoya", 
            role: "model", 
            text: intentResult.response || "", 
            debugInfo: { 
              intent: "LOCAL", 
              apiUsed: false, 
              modelName: "N/A", 
              isCached: false, 
              responseTimeMs: localTotalMs, 
              status: "Success",
              routingMs: localRoutingMs,
              apiMs: 0,
              streamingMs: 0,
              renderingMs: Math.max(1, localTotalMs - localRoutingMs),
              totalMs: localTotalMs,
              identityCategory: intentResult.identityCategory,
              selectedTemplateId: intentResult.selectedTemplateId,
              intentConfidence: intentResult.intentConfidence,
              contextConfidence: intentResult.contextConfidence,
              memoryConfidence: intentResult.memoryConfidence,
              toolConfidence: intentResult.toolConfidence,
              overallConfidence: intentResult.overallConfidence,
              decision: intentResult.decision,
              toolSelected: intentResult.toolSelected,
              reasoningTimeMs: intentResult.reasoningTimeMs
            } 
          }
        ]);
        setIsLoading(false);
        
        if (!isMuted && !skipSpeech) {
          speakMessageText(intentResult.response);
        } else {
          finishSpeechOrTurn();
        }
        isProcessingRequestRef.current = false;
        return; // Halt here, don't call Gemini
      }
    }

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", role: "model", text: responseText }]);
      
      if (!isMuted && !skipSpeech) {
        speakMessageText(responseText);
      } else {
        finishSpeechOrTurn();
      }

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      const responseMessageId = Date.now().toString() + "-z";
      
      setIsTyping(true);
      setIsLoading(true);
      
      const isHighThinking = capturedImageBase64s.length === 0 && /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);
      
      // Append an initial message for Zoya with empty text so that the UI updates in real-time
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, sender: "zoya", role: "model", text: "", isHighThinking }
      ]);

      try {
        let memoryContext = "";
        try {
          const topMemories = await searchMemories({
            query: finalTranscript,
            limit: 5
          });
          if (topMemories && topMemories.length > 0) {
            memoryContext = "\n\nKnown user information:\n" + topMemories.map((m: any) => `- ${m.text}`).join("\n");
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("[Memory] Failed to retrieve memories:", error);
          }
        }

        let promptToSend = finalTranscript;
        if (isDeepThinking) {
          promptToSend = `[SYSTEM CONTEXT: Engage Deep Thinking Mode. Provide highly advanced, professional, and step-by-step analytical reasoning. Be strictly mindful of token limits—avoid fluff and deliver maximum high-value information.]\n\n${finalTranscript}`;
        }

        if (memoryContext) {
          promptToSend = `${promptToSend}${memoryContext}`;
        }

        cancelCurrentSpeech();
        let streamLastProcessedIndex = 0;

        const responseStreamResult = await getZoyaResponseStream(
          promptToSend,
          currentHistory,
          capturedImageBase64s,
          isProfessionalMode,
          environmentContext,
          (currentText) => {
            setIsTyping(false);
            setIsLoading(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === responseMessageId ? { ...msg, text: currentText } : msg
              )
            );

            if (!isMuted && !skipSpeech) {
              const unparsed = currentText.slice(streamLastProcessedIndex);
              const sentenceRegex = /([^.!?\n|।]+[.!?\n|।]+)/g;
              let match;
              while ((match = sentenceRegex.exec(unparsed)) !== null) {
                const sentenceToSpeak = match[1].trim();
                if (sentenceToSpeak) {
                  enqueueSentenceForSpeech(sentenceToSpeak);
                }
                streamLastProcessedIndex += match[0].length;
              }

              const remaining = currentText.slice(streamLastProcessedIndex);
              if (remaining.length > 50) {
                const commaIdx = remaining.lastIndexOf(",");
                if (commaIdx > 20) {
                  const clause = remaining.slice(0, commaIdx + 1).trim();
                  if (clause) {
                    enqueueSentenceForSpeech(clause);
                    streamLastProcessedIndex += commaIdx + 1;
                  }
                } else {
                  const spaceIdx = remaining.lastIndexOf(" ");
                  if (spaceIdx > 30) {
                    const clause = remaining.slice(0, spaceIdx).trim();
                    if (clause) {
                      enqueueSentenceForSpeech(clause);
                      streamLastProcessedIndex += spaceIdx + 1;
                    }
                  }
                }
              }
            }
          },
          intentResult
        );
        
        responseText = responseStreamResult.text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseMessageId ? { ...msg, text: responseText, debugInfo: responseStreamResult.debugInfo } : msg
          )
        );

        setIsTyping(false);
        setIsLoading(false);

        // Check Zoya AI Intent and Auto-Open Panel overlays in real-time
        checkAIIntentAndAutoOpen(finalTranscript, responseText);

        if (!isMuted && !skipSpeech) {
          const remainingText = responseText.slice(streamLastProcessedIndex).trim();
          if (remainingText) {
            enqueueSentenceForSpeech(remainingText);
          }
          markStreamCompleted();
        } else {
          finishSpeechOrTurn();
        }
      } catch (error: any) {
        setIsTyping(false);
        setIsLoading(false);
        console.error("Chat Error:", error);
        // Remove the empty/incomplete message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== responseMessageId));

        console.log(error);
        let errMsg = "";
        const status = error?.status || error?.statusCode || error?.code;
        let rawMessage = error?.message || String(error);

        const is503 = status === 503 || 
                      (typeof rawMessage === "string" && (
                        rawMessage.includes("503") || 
                        rawMessage.toLowerCase().includes("overloaded") || 
                        rawMessage.toLowerCase().includes("service unavailable") ||
                        rawMessage.toLowerCase().includes("high demand")
                      ));

        if (is503) {
          errMsg = "Server overloaded (High Demand). Please wait a few minutes.";
        } else {
          if (typeof rawMessage === "string") {
            try {
              const parsed = JSON.parse(rawMessage);
              if (parsed?.error?.message) {
                rawMessage = parsed.error.message;
              } else if (parsed?.message) {
                rawMessage = parsed.message;
              }
            } catch (e) {
              try {
                const startIdx = rawMessage.indexOf("{");
                const endIdx = rawMessage.lastIndexOf("}");
                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                  const potentialJson = rawMessage.substring(startIdx, endIdx + 1);
                  const parsedEmbedded = JSON.parse(potentialJson);
                  if (parsedEmbedded?.error?.message) {
                    rawMessage = parsedEmbedded.error.message;
                  } else if (parsedEmbedded?.message) {
                    rawMessage = parsedEmbedded.message;
                  }
                }
              } catch (err2) {}
            }

            rawMessage = rawMessage
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\n/g, " ")
              .trim();

            if (rawMessage.startsWith("{") || rawMessage.includes('{"') || rawMessage.includes('":')) {
              rawMessage = rawMessage
                .replace(/[\{\}\[\]"']/g, "")
                .replace(/error\s*:/gi, "")
                .replace(/message\s*:/gi, "")
                .replace(/code\s*:\s*\d+/gi, "")
                .replace(/\s+/g, " ")
                .trim();
            }
          }
          errMsg = rawMessage;
        }

        if (
          errMsg.toLowerCase().includes("overloaded") || 
          errMsg.toLowerCase().includes("service unavailable") || 
          errMsg.includes("503") ||
          errMsg.toLowerCase().includes("high demand")
        ) {
          errMsg = "Server overloaded (High Demand). Please wait a few minutes.";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-z",
            sender: "zoya",
            text: `SYSTEM ERROR: ${errMsg}`,
            isError: true,
          },
        ]);
      }
      finishSpeechOrTurn();
    }
    isProcessingRequestRef.current = false;
  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking, finishSpeechOrTurn]);

  useEffect(() => {
    handleTextCommandRef.current = handleTextCommand;
  }, [handleTextCommand]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setIsCameraFullscreen(false);
  }, []);

  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access is not supported by your browser or secure context (ensure HTTPS).");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }
        });
        
        // Listen for stream track termination from hardware / system
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            stopCamera();
          };
        });

        setCameraStream(stream);
        setIsCameraActive(true);
      } catch (err: any) {
        console.error("Camera access error:", err);
        alert(`Could not start camera: ${err.message || "Permission denied or unavailable"}`);
        setIsCameraActive(false);
      }
    }
  };

  const toggleAR = async () => {
    if (isARMode) {
      // Deactivating AR Mode
      setIsARMode(false);
      setArStatus("calibrating");
      setBaselineOrientation(null);
      
      // Explicitly stop all camera tracks on both state and ref streams to completely free up camera hardware
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Error stopping track from state:", e);
          }
        });
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Error stopping track from ref:", e);
          }
        });
      }

      stopCamera();
      wasCameraActivatedByAR.current = false;

      if (xrSession) {
        try {
          await xrSession.end();
        } catch (e) {
          console.error("Failed to end XR Session:", e);
        }
        setXrSession(null);
      }
      triggerToast("AR Hologram Mode deactivated");
    } else {
      // Activating AR Mode
      setIsARMode(true);
      setArStatus("calibrating");
      setBaselineOrientation(null);
      
      // Try to trigger WebXR immersive-ar session if supported
      const navAny = navigator as any;
      if (navAny.xr) {
        try {
          const isArSupported = await navAny.xr.isSessionSupported("immersive-ar");
          if (isArSupported) {
            const session = await navAny.xr.requestSession("immersive-ar", {
              requiredFeatures: ["local-floor"]
            });
            setXrSession(session);
            session.addEventListener("end", () => {
              setXrSession(null);
              setIsARMode(false);
            });
            console.log("WebXR session active:", session);
          }
        } catch (err) {
          console.warn("WebXR immersive-ar request not granted/supported:", err);
        }
      }
      
      // Auto-start camera if not already active
      if (!isCameraActive) {
        wasCameraActivatedByAR.current = true;
        // Try starting with "environment" (back camera) for AR
        setFacingMode("environment");
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" }
            });
            stream.getVideoTracks().forEach((track) => {
              track.onended = () => {
                stopCamera();
              };
            });
            setCameraStream(stream);
            setIsCameraActive(true);
          }
        } catch (err: any) {
          console.warn("Failed to start environment camera, falling back to user camera:", err);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getVideoTracks().forEach((track) => {
              track.onended = () => {
                stopCamera();
              };
            });
            setCameraStream(stream);
            setIsCameraActive(true);
          } catch (fallbackErr) {
            console.error("All camera initialization failed:", fallbackErr);
          }
        }
      }
      
      triggerToast("Initializing AR Hologram HUD...");
      
      // Simulate flat surface tracking search progress
      setTimeout(() => {
        setArStatus("anchored");
        triggerToast("Flat Surface Detected. Hologram Anchored.");
      }, 2500);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode }
        });

        // Listen for stream track termination from hardware / system
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            stopCamera();
          };
        });

        setCameraStream(stream);
      } catch (err: any) {
        console.error("Failed to switch camera:", err);
        alert(`Could not switch camera: ${err.message || "Unavailable"}`);
      }
    }
  };

  
  const toggleListening = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isSessionActiveRef.current) {
      // Stop Session clicked
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
      isSpeakingRef.current = false;
      setIsListening(false);
      setAppState("idle");

      clearTimeout(listeningTimeoutRef.current);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }

      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (err) {}
      return;
    }

    // Start Session clicked
    setIsSessionActive(true);
    isSessionActiveRef.current = true;
    isSpeakingRef.current = false;
    startListeningLoop();
  };


  const toggleInputDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      setIsListening(false);
      return;
    }

    let speechDetected = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setAppState("listening");
        
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results && event.results[0] && event.results[0][0]
          ? event.results[0][0].transcript
          : "";
        
        if (transcript && transcript.trim()) {
          speechDetected = true;
          // STRICT: Only update the input text state. Do NOT trigger any form submission, sendMessage, or API calls here.
          setTextInput((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript.trim()}` : transcript.trim();
          });
          // Auto-reveal the text input field when voice is transcribed
          setShowChat(true);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setAppState("idle");
        
      };

      recognition.onend = () => {
        setIsListening(false);
        setAppState("idle");
        
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition initialization error:", e);
      if (!isSessionActiveRef.current) {
        setIsListening(false);
        setAppState("idle");
        
        if (!speechDetected) {
          setShowChat(false);
        }
      }
    }
  };

  const handleCopyMessage = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRegenerateMessage = (msgId: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    
    let userMsg: any = null;
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        userMsg = messages[i];
        userMsgIndex = i;
        break;
      }
    }
    
    if (userMsg) {
      if (navigator.vibrate) navigator.vibrate(20);
      setMessages(prev => prev.slice(0, userMsgIndex));
      
      const images = [];
      if (userMsg.images) {
        images.push(...userMsg.images);
      } else if (userMsg.image) {
        images.push(userMsg.image);
      }
      
      const base64Images = images.map((img: string) => {
        if (img.startsWith('data:image')) {
          return img.split(',')[1] || "";
        }
        return "";
      }).filter(Boolean);
      
      handleTextCommand(userMsg.text, true, base64Images);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && selectedImages.length === 0) return;
    
    // Stop voice dictation if active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsListening(false);
    }

    // STRICT STATE SANITIZATION: ensure selectedImages is purely strings
    const safeImageStrings = selectedImages.map((img: any) => {
      if (typeof img === 'string') {
        return img.startsWith('data:') || img.startsWith('blob:') || img.startsWith('http') ? img : `data:image/jpeg;base64,${img}`;
      }
      if ((img as any) instanceof File || (img as any) instanceof Blob) {
        try {
          return URL.createObjectURL(img as Blob);
        } catch (e) {
          return "";
        }
      }
      return "";
    }).filter(Boolean);

    let commandText = textInput;
    if (isImageMode) {
      commandText = `generate image of ${textInput}`;
    }

    handleTextCommand(commandText, true, safeImageStrings);
    setTextInput("");
    setSelectedImages([]);
  };

  // Calculate spatial tracking offset for AR holographic anchor
  const trackingOffset = (() => {
    let offset = { x: 0, y: 0, scale: 1, rotationY: 0, rotationX: 0 };
    if (isARMode) {
      if (arStatus === "calibrating") {
        offset.scale = 0.5 + Math.sin(Date.now() / 150) * 0.05;
      } else if (arStatus === "anchored") {
        if (baselineOrientation) {
          // Gyroscope delta-based offsets
          let deltaYaw = arOrientation.alpha - baselineOrientation.alpha;
          let deltaPitch = arOrientation.beta - baselineOrientation.beta;

          // Wrap around 360 degrees safely
          if (deltaYaw > 180) deltaYaw -= 360;
          if (deltaYaw < -180) deltaYaw += 360;

          // Gyro sensitivity parameters
          const multiplierX = 14; 
          const multiplierY = 14;

          offset.x = deltaYaw * multiplierX;
          offset.y = -deltaPitch * multiplierY;

          // Apply reverse physical rotational perspective
          offset.rotationY = -(deltaYaw * Math.PI / 180);
          offset.rotationX = -(deltaPitch * Math.PI / 180);
        } else {
          // Desktop fallbacks: Mouse cursor triggers panning
          offset.x = -mousePosition.x * 250;
          offset.y = -mousePosition.y * 250;
          offset.rotationY = -mousePosition.x * 0.6;
          offset.rotationX = mousePosition.y * 0.4;
        }
      }
    }
    return offset;
  })();

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    let newHeight = startHeightRef.current + deltaY;
    if (newHeight < 100) newHeight = 100;
    if (newHeight > window.innerHeight * 0.8) newHeight = window.innerHeight * 0.8;
    if (chatContainerRef.current) {
      chatContainerRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.body.style.userSelect = '';
    if (chatContainerRef.current) {
      const finalHeight = chatContainerRef.current.offsetHeight;
      setChatHeight(finalHeight);
    }
  }, [handlePointerMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    const currentHeight = chatContainerRef.current ? chatContainerRef.current.offsetHeight : chatHeight;
    startHeightRef.current = currentHeight;
    document.body.style.userSelect = 'none';
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="fixed top-0 left-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden bg-[#050505] text-white flex flex-col items-center justify-between font-sans bg-[length:400%_400%]">
      {isUpdating && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="relative w-32 h-32 flex items-center justify-center rounded-full animate-pulse border-4 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl"></div>
            <span className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-fuchsia-300 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)] z-10">Z</span>
          </div>
          <p className="mt-8 text-sm font-mono tracking-widest text-purple-200/70 animate-pulse">
            Updating Zoya. Please wait...
          </p>
        </div>
      )}
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden z-0 flex flex-col items-center justify-center text-white font-sans"
          >
            {/* Update Successful Toast Overlay (Lock Screen) */}
            <AnimatePresence>
              {showUpdateToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="fixed top-16 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[10px]">
                    Z
                  </div>
                  <span className="text-sm font-medium tracking-wide">Update Successful</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Absolute background gradient container */}
            <div className="absolute inset-0 z-[-1] bg-[linear-gradient(135deg,#312e81,#4a044e,#0f172a,#134e4a)] animate-gradient" />
            
            {/* Sci-Fi Cinematic Grid & Glowing Nodes */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none z-[-1]" />
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80 mix-blend-screen animate-float z-[-1]">
              <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-pink-600/20 blur-[120px] rounded-full mix-blend-screen" />
              <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-cyan-600/15 blur-[150px] rounded-full mix-blend-screen delay-1000" />
              <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-violet-600/20 blur-[120px] rounded-full mix-blend-screen delay-500" />
            </div>

            {/* Glassmorphism Container */}
            <div className="z-10 flex flex-col items-center max-w-md w-[90%] text-center space-y-10 hyper-glass p-10 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              {/* Top Lock Badge */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-inner">
                  {unlockStatus === "granted" ? (
                    <Unlock size={14} className="text-emerald-400 animate-bounce" />
                  ) : (
                    <Lock size={14} className="text-violet-400 animate-pulse" />
                  )}
                  <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-white/60">
                    ZOYA SECURITY GATEWAY
                  </span>
                </div>
              </motion.div>

              {/* Passkey Input Field */}
              <motion.form 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                onSubmit={handlePasskeySubmit}
                className="flex flex-col items-center gap-3 w-full max-w-xs"
              >
                <div className="relative w-full group">
                  <input
                    type="password"
                    placeholder="ENTER PASSKEY"
                    value={passkeyInput}
                    onChange={(e) => {
                      setPasskeyInput(e.target.value);
                      if (passkeyError) setPasskeyError(false);
                    }}
                    className={`w-full hyper-glass hyper-glass-input focus:outline-none focus:ring-0 text-center font-sans font-medium text-sm tracking-widest py-3 px-4 rounded-xl transition-all duration-300 placeholder:text-white/30 placeholder:tracking-widest ${
                      passkeyError 
                        ? "border-red-500/50 focus:ring-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                        : "hover:border-white/30 focus:border-white/40 focus:ring-white/20 text-white"
                    }`}
                  />
                  <button 
                    type="submit" 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                      passkeyInput.length > 0
                        ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:bg-cyan-500/30"
                        : "bg-white/5 text-white/20 hover:text-white/40"
                    }`}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <AnimatePresence>
                  {passkeyError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-[10px] font-mono text-red-400 tracking-wider uppercase drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                    >
                      Wrong Passkey - Access Denied
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>

              <div className="flex items-center gap-4 w-full max-w-xs opacity-40">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20"></div>
                <span className="text-[9px] font-mono tracking-widest text-white/50">OR</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20"></div>
              </div>

              {/* Pulsing Fingerprint Container with Hold Progress Circle */}
              <div className="relative flex items-center justify-center">
                
                {/* 3 Orbital Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute w-[180px] h-[180px] rounded-full border border-white/5 border-t-white/20 animate-[spin_4s_linear_infinite]" />
                  <div className="absolute w-[210px] h-[210px] rounded-full border border-white/5 border-r-white/20 animate-[spin_6s_linear_infinite_reverse]" />
                  <div className="absolute w-[240px] h-[240px] rounded-full border border-white/5 border-b-white/20 animate-[spin_8s_linear_infinite]" />
                </div>

                {/* Radial progress ring */}
                <svg className="w-56 h-56 absolute transform -rotate-90 pointer-events-none">
                  <circle
                    cx="112"
                    cy="112"
                    r="96"
                    className="stroke-white/[0.03] fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="112"
                    cy="112"
                    r="96"
                    className="stroke-violet-500 fill-none transition-all duration-75"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 96}
                    strokeDashoffset={2 * Math.PI * 96 * (1 - holdProgress / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Fingerprint Main Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={triggerBiometrics}
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center relative cursor-pointer select-none transition-all duration-500 hyper-glass animate-glow-pulse ${
                    unlockStatus === "granted"
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] !animate-none"
                      : unlockStatus === "failed" || unlockStatus === "unregistered"
                      ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-shake !animate-none"
                      : holdProgress > 0
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_40px_rgba(139,92,246,0.2)] !animate-none"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {/* Sweeping Scanner laser line */}
                  {unlockStatus === "awaiting" && (
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_12px_rgba(139,92,246,0.8)] animate-scanner top-0 pointer-events-none" />
                  )}

                  <Fingerprint 
                    size={64} 
                    className={`transition-transform duration-300 ${
                      holdProgress > 0 ? "scale-110" : ""
                    } ${unlockStatus === "granted" ? "animate-pulse" : ""}`}
                  />

                  {/* Hold Helper text overlaid inside the button */}
                  <span className="absolute bottom-6 text-[9px] font-mono tracking-widest text-white/40 uppercase pointer-events-none select-none">
                    {holdProgress > 0 ? `${Math.round(holdProgress)}%` : "TAP TO SCAN"}
                  </span>
                </motion.button>
              </div>

              {/* Text Area */}
              <div className="space-y-3">
                <motion.h2 
                  key={unlockStatus}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-lg md:text-xl font-sans tracking-[0.15em] uppercase font-semibold transition-colors duration-300 ${
                    unlockStatus === "granted"
                      ? "text-emerald-400"
                      : unlockStatus === "failed" || unlockStatus === "unregistered"
                      ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : "text-violet-100"
                  }`}
                >
                  {unlockStatus === "granted" ? (
                    "ACCESS GRANTED - WELCOME BOSS"
                  ) : unlockStatus === "failed" ? (
                    "AUTHORIZATION FAILED"
                  ) : unlockStatus === "unregistered" ? (
                    "Unrecognized Device"
                  ) : holdProgress > 0 ? (
                    "SCANNING BIOMETRICS..."
                  ) : (
                    "BIOMETRIC LOCK"
                  )}
                </motion.h2>

                <p className={`text-xs ${unlockStatus === "unregistered" ? "text-red-400 font-medium drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "text-white/40"} font-sans tracking-wide max-w-xs mx-auto leading-relaxed`}>
                  {unlockStatus === "granted"
                    ? "Syncing core subroutines and loading Zoya neural link..."
                    : unlockStatus === "failed"
                    ? "Verification failed. Tap icon to authenticate using native device security."
                    : unlockStatus === "unregistered"
                    ? "Override Passkey Required."
                    : "Awaiting authorization. Tap icon to authenticate."}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-between transition-all duration-500"
          >
            {showPermissionModal && (
              <PermissionModal 
                onClose={() => setShowPermissionModal(false)} 
              />
            )}
            
            {lightboxImage && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all"
                onClick={() => setLightboxImage(null)}
              >
                <div className="relative w-full h-full p-6 md:p-12 flex flex-col items-center justify-center">
                  <button 
                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
                    onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                  >
                    <X size={24} />
                  </button>
                  <img src={lightboxImage} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl border border-white/10" alt="Lightbox" />
                </div>
              </div>
            )}

      {!showChat && (<>
      {/* Cinematic Background Gradients */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none transition-opacity duration-500"
        style={isARMode ? { opacity: 0.15 } : { opacity: 1 }}
      >
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full transition-all duration-500 ${
          isGhostMode ? "bg-red-950/30" : "bg-violet-900/20"
        }`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full transition-all duration-500 ${
          isGhostMode ? "bg-rose-950/25" : "bg-pink-900/20"
        }`} />
      </div>

      {/* Camera Video Feed (Upper Half / Fullscreen AR Backdrop) */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`
              overflow-hidden transition-all duration-500
              ${isARMode 
                ? "fixed inset-0 w-screen h-screen z-0 rounded-none border-none opacity-[0.72] pointer-events-none" 
                : isCameraFullscreen 
                ? "fixed top-[70px] left-0 w-screen h-[calc(100vh-70px)] z-40 rounded-none border-none pointer-events-auto" 
                : "absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md aspect-video rounded-2xl z-30 pointer-events-auto shadow-2xl border border-white/10 bg-black/60 backdrop-blur-md"
              }
            `}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Floating Camera Controls overlaid on top right of video - completely hidden in AR Mode */}
            {!isARMode && (
              <div className={`absolute top-4 flex items-center gap-2 z-50 pointer-events-auto ${
                isCameraFullscreen ? "right-16 md:right-24" : "right-3"
              }`}>
              {/* Flip camera control */}
              <button
                onClick={toggleFacingMode}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border border-white/10 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center pointer-events-auto"
                title="Flip Camera"
              >
                <RefreshCw size={16} />
              </button>

              {/* Picture-in-Picture toggle */}
              <button
                onClick={togglePiP}
                className={`p-2 rounded-full border border-white/10 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center pointer-events-auto ${
                  isPiPActive 
                    ? "bg-violet-600/90 text-white" 
                    : "bg-black/60 hover:bg-black/80 text-white/90 hover:text-white"
                }`}
                title={isPiPActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
              >
                <Tv size={16} />
              </button>
              
              {/* Expand/fullscreen control */}
              <button
                onClick={() => setIsCameraFullscreen(!isCameraFullscreen)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border border-white/10 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center pointer-events-auto"
                title={isCameraFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isCameraFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close/Stop camera control near the feed */}
              <button
                onClick={stopCamera}
                className="p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center pointer-events-auto"
                title="Close Camera"
              >
                <X size={16} />
              </button>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-50 shrink-0 px-6 py-4 md:px-12 md:py-6 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            Z
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Zoya</h1>
        </div>
        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600/20 to-pink-600/20 hover:from-violet-600/35 hover:to-pink-600/35 border border-violet-500/30 text-violet-200 hover:text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer hover:border-violet-400/50 pointer-events-auto"
              title="Install App"
            >
              <Download size={14} className="animate-pulse" />
              <span className="text-xs font-mono font-medium tracking-wider">INSTALL</span>
            </button>
          )}

          {/* Sync / Refresh Button */}
          <button
            onClick={() => {
              setIsSyncing(true);
              setIsUpdating(true);
              setTimeout(() => {
                window.location.reload();
              }, 2500);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center hover:text-violet-400 hover:border-violet-500/30"
            title="Hard Refresh"
          >
            <RefreshCw size={18} className={`transition-transform duration-300 ${isSyncing ? "animate-spin" : "hover:rotate-180"}`} />
          </button>

          {/* Hamburger Menu (Dropdown with Tool Labels) */}
          <div className="relative flex items-center justify-center transition-opacity duration-300" ref={toolMenuRef}>
            <button
              onClick={() => {
                if (showChat) return;
                setIsToolMenuOpen(!isToolMenuOpen);
              }}
              className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center ${
                showChat ? "opacity-50 pointer-events-none" : "cursor-pointer pointer-events-auto"
              } ${
                isToolMenuOpen
                  ? "bg-gradient-to-r from-violet-600 to-pink-600 border-violet-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse"
                  : "bg-white/10 hover:bg-white/20 border-white/25 text-white hover:text-violet-400 hover:border-violet-500/30"
              }`}
              title="Settings & Integrations"
            >
              <Menu size={18} className={isToolMenuOpen ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
            </button>

            <AnimatePresence>
              {isToolMenuOpen && ( <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                    onClick={() => setIsToolMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 w-[82%] max-w-[320px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 z-[100] flex flex-col shadow-2xl pointer-events-auto overflow-y-auto"
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between px-6 py-5 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
                          Z
                        </div>
                        <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
                      </div>
                      <button onClick={() => setIsToolMenuOpen(false)} className="text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer p-2 hover:bg-white/10 rounded-xl hyper-glass hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <X size={20} />
                      </button>
                    </div>

                    {/* Menu Items */}
                    <div className="flex flex-col p-4 gap-3 overflow-y-auto mt-2">
                      <motion.button 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => {
                          setIsSettingsPageOpen(true);
                          setIsToolMenuOpen(false);
                        }}
                        className="flex items-center justify-between p-4 rounded-[18px] hyper-glass transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer text-left w-full group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Settings size={20} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Settings</span>
                            <span className="text-[11px] text-neutral-400 tracking-wide">Manage preferences</span>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-neutral-500 group-hover:text-white transition-colors" />
                      </motion.button>
                    </div>
                  </motion.div>
              </>)}
            </AnimatePresence>

            <ActivationSuccessModal
              isOpen={showActivationSuccessModal}
              onClose={handleCloseActivationSuccessModal}
              onStartChat={handleStartChatFromActivationModal}
            />
          </div>

          
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
                  className={`flex items-center gap-2 text-sm md:text-base italic font-serif transition-colors duration-300 ${
                    isGhostMode ? "text-rose-400/80" : "text-cyan-300/80"
                  }`}
                >
                  <Loader2 size={16} className="animate-spin" />
                  Thinking...
                </motion.div>
              )}
              {appState === "speaking" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-2 text-sm md:text-base italic font-serif transition-colors duration-300 ${
                    isGhostMode ? "text-rose-400/80" : "text-cyan-300/80"
                  }`}
                >
                  <Volume2 size={16} className="animate-pulse" />
                  Speaking...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer (Fixed Full Screen Background) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer 
            state={appState} 
            liveSessionRef={liveSessionRef} 
            isARMode={isARMode}
            arStatus={arStatus}
            trackingOffset={trackingOffset}
            isGhostMode={isGhostMode}
          />
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
                  className={`flex items-center gap-2 text-sm md:text-base italic transition-colors duration-300 ${
                    isGhostMode ? "text-rose-400/80" : "text-violet-300/80"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse transition-colors duration-300 ${
                    isGhostMode ? "bg-rose-400" : "bg-violet-400"
                  }`} />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      </>)}

            {/* Integrated Chat History & Input Panel */}
      <AnimatePresence>
        {showChat && (
          <ChatPage 
            messages={messages as any}
            textInput={textInput}
            setTextInput={setTextInput}
            handleTextSubmit={handleTextSubmit}
            isLoading={isLoading}
            isTyping={isTyping}
            isGhostMode={isGhostMode}
            isARMode={isARMode}
            isListening={isListening}
            toggleInputDictation={toggleInputDictation}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            isImageMode={isImageMode}
            setIsImageMode={setIsImageMode}
            isDeepThinking={isDeepThinking}
            setIsDeepThinking={setIsDeepThinking}
            setShowChat={setShowChat}
            isInputReadOnly={isInputReadOnly}
            setIsInputReadOnly={setIsInputReadOnly}
            handleImageUpload={handleImageUpload}
            setIsPlusMenuOpen={setIsPlusMenuOpen}
            handleRegenerateMessage={handleRegenerateMessage}
            setMessages={setMessages}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            chatContainerRef={chatContainerRef}
            recognitionRef={recognitionRef}
            onOpenSettings={handleOpenSettingsFromLockedMode}
            speakWithZoya={speakWithZoya}
          />
        )}
      </AnimatePresence>

      {/* Global Settings & Personal Settings Overlays (outside header so z-index is higher than ChatPage z-9999) */}
      <AnimatePresence>
        {isSettingsPageOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-3xl z-[10020] flex flex-col pointer-events-auto"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
              <button 
                onClick={() => {
                  setIsSettingsPageOpen(false);
                  setIsToolMenuOpen(true);
                }}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer group px-4 py-2.5 hyper-glass rounded-xl hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.96]"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium tracking-wide">Back</span>
              </button>
              <span className="text-base font-serif font-medium text-white tracking-widest uppercase">Settings</span>
              <div className="w-[88px]"></div> {/* Spacer for centering (matches button width) */}
            </div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center"
            >
              <div className="w-full max-w-2xl flex flex-col gap-4">
                
                <button 
                  onClick={() => setIsPersonalSettingsOpen(true)}
                  className="flex items-center justify-between p-5 rounded-[20px] hyper-glass transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer w-full group text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      <User size={22} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">Personal</span>
                      <span className="text-[12px] text-neutral-400 tracking-wide">Your Name • Gemini • Music • YouTube</span>
                    </div>
                  </div>
                  <ChevronRight size={22} className="text-neutral-500 group-hover:text-white transition-colors" />
                </button>

              </div>
            </motion.div>
          </motion.div>
        )}

        {isPersonalSettingsOpen && (
          <PersonalSettings 
            onBack={() => {
              setIsPersonalSettingsOpen(false);
              setAutoFocusApiKey(false);
            }}
            autoFocusApiKey={autoFocusApiKey}
            onApiKeyVerified={handleApiKeyVerified}
          />
        )}
      </AnimatePresence>


      {/* Controls */}
      {!showChat && (
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-full border transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
              isCameraActive
                ? isGhostMode
                  ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : isARMode 
                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-pink-500/20 border-pink-500/50 text-pink-300"
                : isGhostMode
                  ? "bg-white/5 border-white/10 hover:bg-red-500/10 text-white/70 hover:text-red-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title={isCameraActive ? "Close Camera" : "Open Camera"}
          >
            {isCameraActive ? <CameraOff size={20} /> : <Camera size={20} />}
          </button>

          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl cursor-pointer
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : isGhostMode
                  ? "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:scale-105"
                  : isARMode
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-105"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
                <>
                <MicOff size={20} />
                <span>Stop Session</span>
                </>
            ) : (
                <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
                </>
            )}
          </button>
          
          <button
            id="keyboard-toggle-btn"
            onClick={() => {
              const nextShowChat = !showChat;
              setShowChat(nextShowChat);
            }}
            className={`p-4 rounded-full border transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
              showChat
                ? isGhostMode
                  ? "bg-red-500/10 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : isARMode
                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-violet-500/20 border-violet-500/50 text-violet-300"
                : isGhostMode
                  ? "bg-white/5 border-white/10 hover:bg-red-500/10 text-white/70 hover:text-red-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Toggle Keyboard / Chat Input"
          >
            <Keyboard size={20} />
          </button>
        </div>

        {/* Developer Signature */}
        <div 
          id="developer-signature"
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '4px',
            userSelect: 'none',
          }}
          className="font-mono"
        >
          Developed by Riyajul
        </div>
      </footer>
      )}

      {/* Hidden video element for 3D Globe Picture-in-Picture */}
      <video
        ref={globePiPVideoRef}
        id="zoya-globe-pip-video"
        style={{
          position: "fixed",
          pointerEvents: "none",
          width: "1px",
          height: "1px",
          opacity: 0,
          background: "transparent",
          backgroundColor: "transparent",
          border: "none",
          outline: "none",
        }}
        muted
        playsInline
      />

      {/* Elegant Toast Overlay for Behavioral Mood Switcher */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-5 py-2.5 bg-neutral-900/90 border border-white/10 text-white rounded-full shadow-2xl backdrop-blur-md text-sm font-mono tracking-wide pointer-events-none flex items-center gap-2"
          >
            <Shield size={14} className="text-violet-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Google Contacts Manager Overlay */}
      {showContacts && (
        <ContactsManager
          onClose={() => setShowContacts(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Drive Manager Overlay */}
      {showDrive && (
        <DriveManager
          onClose={() => setShowDrive(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Zoya Memory Core Overlay */}
      {showMemories && (
        <MemoryManager
          onClose={() => setShowMemories(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Gmail Manager Overlay */}
      {showGmail && (
        <GmailManager
          onClose={() => setShowGmail(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Calendar Manager Overlay */}
      {showCalendar && (
        <CalendarManager
          onClose={() => setShowCalendar(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Tasks Manager Overlay */}
      {showTasks && (
        <TasksManager
          onClose={() => setShowTasks(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Slides Manager Overlay */}
      {showSlides && (
        <SlidesManager
          onClose={() => setShowSlides(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Chat Manager Overlay */}
      {showGoogleChat && (
        <GoogleChatManager
          onClose={() => setShowGoogleChat(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Docs Manager Overlay */}
      {showDocs && (
        <DocsManager
          onClose={() => setShowDocs(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Forms Manager Overlay */}
      {showForms && (
        <FormsManager
          onClose={() => setShowForms(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Meet Manager Overlay */}
      {showMeet && (
        <MeetManager
          onClose={() => setShowMeet(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Keep Manager Overlay */}
      {showKeep && (
        <KeepManager
          onClose={() => setShowKeep(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}

      {/* Google Classroom Manager Overlay */}
      {showClassroom && (
        <ClassroomManager
          onClose={() => setShowClassroom(false)}
          isGhostMode={isGhostMode}
          onToast={triggerToast}
        />
      )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus Menu Bottom Sheet Overlay */}
      <AnimatePresence>
        {false && ( <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlusMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-[#1a1a1a] p-4 pb-8 shadow-2xl flex flex-col gap-2 border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
              
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Upload Photo</div>
                  <div className="text-white/50 text-sm">Analyze with Zoya</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsImageMode(true);
                  setTextInput("");
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Create Image</div>
                  <div className="text-white/50 text-sm">Generate with AI</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsDeepThinking(prev => !prev);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >
                <div className={`p-3 rounded-full ${isDeepThinking ? 'bg-indigo-500/40 text-indigo-300' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  <Brain size={24} />
                </div>
                <div>
                  <div className="text-white font-medium">Deep Thinking {isDeepThinking ? '(On)' : ''}</div>
                  <div className="text-white/50 text-sm">Advanced, focused reasoning</div>
                </div>
              </button>
            </motion.div>
        </>)}
      </AnimatePresence>
    </div>
  );
}
