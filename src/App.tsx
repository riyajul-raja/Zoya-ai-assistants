import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, X, Camera, CameraOff, RefreshCw, Maximize2, Minimize2, Tv, Download, PictureInPicture, Shield, Fingerprint, Lock, Unlock, Box, Layers, Ghost, Users, HardDrive, Brain, Mail, Calendar, ListTodo, Presentation, MessageSquare, FileText, ClipboardList, Video, StickyNote, GraduationCap, Menu, ArrowRight } from "lucide-react";
import { getZoyaResponse, getZoyaResponseStream, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import TypingIndicator from "./components/TypingIndicator";
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

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  role?: "user" | "model";
  text: string;
  image?: string;
  isError?: boolean;
  isHighThinking?: boolean;
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
  const messagesRef = useRef(messages);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
      if (!voice && voices.length > 0) {
        voice = voices[0];
      }
      if (voice) {
        selectedVoiceRef.current = voice;
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

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

  const [showChat, setShowChat] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    setShowUpdateToast(true);
    const timer = setTimeout(() => setShowUpdateToast(false), 2500);
    return () => clearTimeout(timer);
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
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [textInput, setTextInput] = useState("");
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

  useEffect(() => {
    if (showChat && textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [showChat]);
  const [isInputMicActive, setIsInputMicActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const isSessionActiveRef = useRef(isSessionActive);
  const isInputMicActiveRef = useRef(isInputMicActive);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isInputMicActiveRef.current = isInputMicActive;
  }, [isInputMicActive]);

  // Biometric Security Lock Screen states
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('isZoyaUnlocked') === 'true';
  });
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
              name: "Boss",
              displayName: "Boss"
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
In your very first response or greeting to the user, you MUST casually and naturally mention this current time of day and the current weather temperature/conditions (e.g., "Good morning Boss, it's 25 degrees outside..." or similar natural, sassy/professional greeting depending on your active mode). Keep it short, witty, and perfectly fitting your Zoya persona.`;
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

  // Synchronize Live Session Lifecycle with isCameraActive, isSessionActive, and isMuted
  useEffect(() => {
    const shouldBeRunning = isCameraActive || isSessionActive;
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

        await session.start(requiredMic, isProfessionalMode, environmentContext);
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showChat]);

  const speakMessageText = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    activeUtterancesRef.current = [];

    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed !== "") {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          utterance.lang = selectedVoiceRef.current.lang;
        } else {
          utterance.lang = "hi-IN";
        }
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        
        activeUtterancesRef.current.push(utterance);
        
        utterance.onstart = () => {
          setAppState("speaking");
        };
        
        utterance.onend = () => {
          activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
          if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
            setAppState("idle");
          }
        };

        utterance.onerror = (e) => {
          activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
          console.error("Speech error", e);
          if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
            setAppState("idle");
          }
        };

        if (trimmed !== "") {
          window.speechSynthesis.speak(utterance);
        }
      }
    });
  }, []);

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

  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    autoTriggerUIFromText(finalTranscript);

    let capturedImageBase64: string | undefined = undefined;
    if (isCameraActive) {
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
            capturedImageBase64 = dataUrl.split(",")[1];
          }
        } catch (err) {
          console.error("Failed to capture image frame for chat payload:", err);
        }
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        role: "user",
        text: finalTranscript,
        image: capturedImageBase64 ? `data:image/jpeg;base64,${capturedImageBase64}` : undefined,
      },
    ]);
    
    // If live session is active (either because voice is active or camera is ON), send text through it
    if (liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", role: "model", text: responseText }]);
      
      if (!isMuted && !skipSpeech) {
        speakMessageText(responseText);
      } else {
        setAppState("idle");
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
      
      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);
      
      // Append an initial message for Zoya with empty text so that the UI updates in real-time
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, sender: "zoya", role: "model", text: "", isHighThinking }
      ]);

      try {
        let lastProcessedIndex = 0;
        
        if (!isMuted && !skipSpeech) {
          window.speechSynthesis.cancel(); // Clear any ongoing speech
          activeUtterancesRef.current = [];
        }

        const queueSentenceSpeak = (sentence: string) => {
          if (isMuted || skipSpeech) return;
          const trimmed = sentence.trim();
          if (trimmed === "") return;

          const utterance = new SpeechSynthesisUtterance(trimmed);
          if (selectedVoiceRef.current) {
            utterance.voice = selectedVoiceRef.current;
            utterance.lang = selectedVoiceRef.current.lang;
          } else {
            utterance.lang = "hi-IN";
          }
          utterance.pitch = 1.0;
          utterance.rate = 1.0;
          
          activeUtterancesRef.current.push(utterance);
          
          utterance.onstart = () => {
            setAppState("speaking");
          };
          
          utterance.onend = () => {
            activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
            if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
              setAppState("idle");
            }
          };

          utterance.onerror = (e) => {
            activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
            console.error("Speech error", e);
            if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
              setAppState("idle");
            }
          };

          if (trimmed !== "") {
            window.speechSynthesis.speak(utterance);
          }
        };

        responseText = await getZoyaResponseStream(
          finalTranscript,
          messagesRef.current,
          capturedImageBase64,
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
              const textToProcess = currentText.slice(lastProcessedIndex);
              const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
              let match;
              let tempIndex = lastProcessedIndex;
              while ((match = sentenceRegex.exec(textToProcess)) !== null) {
                const sentence = match[0];
                queueSentenceSpeak(sentence);
                tempIndex = lastProcessedIndex + match.index + sentence.length;
              }
              lastProcessedIndex = tempIndex;
            }
          }
        );
        
        setIsTyping(false);
        setIsLoading(false);

        // Check Zoya AI Intent and Auto-Open Panel overlays in real-time
        checkAIIntentAndAutoOpen(finalTranscript, responseText);

        if (!isMuted && !skipSpeech && lastProcessedIndex < responseText.length) {
          const remainingText = responseText.slice(lastProcessedIndex);
          if (remainingText.trim()) {
            queueSentenceSpeak(remainingText);
          }
        }

        // Wait a brief moment to ensure idle state updates if needed, though onend handles it
        if (isMuted || skipSpeech || (!window.speechSynthesis.pending && !window.speechSynthesis.speaking)) {
          setAppState("idle");
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
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext]);

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

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      resetZoyaSession();
      if (isInputMicActive && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        setIsInputMicActive(false);
      }
    } else {
      setShowChat(true);
      try {
        // Do not show "Microphone Blocked" before actually requesting microphone permission.
        // Call navigator.mediaDevices.getUserMedia() first.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access is not supported by your browser or secure context (ensure HTTPS).");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        // Release the mic track immediately, as our centralized useEffect will start the live session and request it
        stream.getTracks().forEach(track => track.stop());

        // Now that permission is granted, toggle state to trigger our centralized Live Session manager
        setIsSessionActive(true);
        resetZoyaSession();
      } catch (e: any) {
        console.error("Failed to start session", e);
        
        // Show "Microphone Blocked" only if getUserMedia() throws NotAllowedError or PermissionDeniedError
        const errorName = e?.name || "";
        const errorMessage = e?.message || "";
        const isPermissionError = 
          errorName === "NotAllowedError" || 
          errorName === "PermissionDeniedError" ||
          errorMessage.toLowerCase().includes("permission denied") ||
          errorMessage.toLowerCase().includes("notallowederror");

        if (isPermissionError) {
          setShowPermissionModal(true);
        } else {
          alert(`Could not start voice session: ${errorMessage || "Unknown error"}`);
        }

        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const toggleInputDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if (isInputMicActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      setIsInputMicActive(false);
      return;
    }

    let speechDetected = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsInputMicActive(true);
        setAppState("listening");
        setIsSessionActive(true);
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
        if (isSessionActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition on error:", e);
          }
        } else {
          setIsInputMicActive(false);
          setAppState("idle");
          setIsSessionActive(false);
          if (!speechDetected) {
            setShowChat(false);
          }
        }
      };

      recognition.onend = () => {
        if (isSessionActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition on end:", e);
          }
        } else {
          setIsInputMicActive(false);
          setAppState("idle");
          setIsSessionActive(false);
          if (!speechDetected) {
            setShowChat(false);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition initialization error:", e);
      if (!isSessionActiveRef.current) {
        setIsInputMicActive(false);
        setAppState("idle");
        setIsSessionActive(false);
        if (!speechDetected) {
          setShowChat(false);
        }
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    // Stop voice dictation if active
    if (isInputMicActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsInputMicActive(false);
    }

    handleTextCommand(textInput, true);
    setTextInput("");
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
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 w-[100vw] h-[100dvh] m-0 p-0 overflow-hidden z-0 flex flex-col items-center justify-center text-white font-sans"
          >
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
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center hover:text-violet-400 hover:border-violet-500/30"
            title="Hard Refresh"
          >
            <RefreshCw size={18} className={`transition-transform duration-300 ${isSyncing ? "animate-spin" : "hover:rotate-180"}`} />
          </button>

          {/* Hamburger Menu (Dropdown with Tool Labels) */}
          <div className="relative flex items-center justify-center" ref={toolMenuRef}>
            <button
              onClick={() => setIsToolMenuOpen(!isToolMenuOpen)}
              className={`p-2 rounded-full border transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center ${
                isToolMenuOpen
                  ? "bg-gradient-to-r from-violet-600 to-pink-600 border-violet-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse"
                  : "bg-white/10 hover:bg-white/20 border-white/25 text-white hover:text-violet-400 hover:border-violet-500/30"
              }`}
              title="Integrations & Tools Menu"
            >
              <Menu size={18} className={isToolMenuOpen ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
            </button>

            <AnimatePresence>
              {isToolMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-72 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl p-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col gap-1.5 z-50 pointer-events-auto select-none"
                  style={{ top: "100%" }}
                >
                  <div className="px-2 pb-2 border-b border-white/10 flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-semibold">Integrations & Tools</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        id: "gmail",
                        name: "Google Gmail",
                        icon: <Mail size={16} />,
                        active: showGmail,
                        toggle: () => setShowGmail(!showGmail),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "calendar",
                        name: "Google Calendar",
                        icon: <Calendar size={16} />,
                        active: showCalendar,
                        toggle: () => setShowCalendar(!showCalendar),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "tasks",
                        name: "Google Tasks",
                        icon: <ListTodo size={16} />,
                        active: showTasks,
                        toggle: () => setShowTasks(!showTasks),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "slides",
                        name: "Google Slides",
                        icon: <Presentation size={16} />,
                        active: showSlides,
                        toggle: () => setShowSlides(!showSlides),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "contacts",
                        name: "Google Contacts",
                        icon: <Users size={16} />,
                        active: showContacts,
                        toggle: () => setShowContacts(!showContacts),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "chat",
                        name: "Google Chat",
                        icon: <MessageSquare size={16} />,
                        active: showGoogleChat,
                        toggle: () => setShowGoogleChat(!showGoogleChat),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "docs",
                        name: "Google Docs",
                        icon: <FileText size={16} />,
                        active: showDocs,
                        toggle: () => setShowDocs(!showDocs),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "forms",
                        name: "Google Forms",
                        icon: <ClipboardList size={16} />,
                        active: showForms,
                        toggle: () => setShowForms(!showForms),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "meet",
                        name: "Google Meet",
                        icon: <Video size={16} />,
                        active: showMeet,
                        toggle: () => setShowMeet(!showMeet),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "keep",
                        name: "Google Keep",
                        icon: <StickyNote size={16} />,
                        active: showKeep,
                        toggle: () => setShowKeep(!showKeep),
                        colorClass: "from-amber-600 to-yellow-600",
                        accentColor: "text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
                      },
                      {
                        id: "classroom",
                        name: "Google Classroom",
                        icon: <GraduationCap size={16} />,
                        active: showClassroom,
                        toggle: () => setShowClassroom(!showClassroom),
                        colorClass: "from-emerald-600 to-teal-600",
                        accentColor: "text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.4)]",
                      },
                      {
                        id: "drive",
                        name: "Drive Explorer",
                        icon: <HardDrive size={16} />,
                        active: showDrive,
                        toggle: () => setShowDrive(!showDrive),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "memories",
                        name: "Memory Core",
                        icon: <Brain size={16} />,
                        active: showMemories,
                        toggle: () => setShowMemories(!showMemories),
                        colorClass: "from-red-600 to-rose-600",
                        accentColor: "text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                      },
                      {
                        id: "ar-hologram",
                        name: "AR Hologram Mode",
                        icon: (
                          <Box 
                            size={16} 
                            className={`transition-all duration-300 ${
                              isARMode && isCameraActive ? "animate-spin text-cyan-100" : ""
                            }`} 
                            style={{ animationDuration: isARMode && isCameraActive ? "8s" : undefined }} 
                          />
                        ),
                        active: isARMode,
                        toggle: toggleAR,
                        colorClass: "from-cyan-500 to-teal-500",
                        accentColor: "text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.4)]",
                      },
                      {
                        id: "floating-core",
                        name: "Floating Core Mode",
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 11H11V17H19V11Z" fill="currentColor" fillOpacity="0.3" />
                            <rect width="20" height="14" x="2" y="3" rx="2" />
                          </svg>
                        ),
                        active: isGlobePiPActive,
                        toggle: handlePiP,
                        colorClass: "from-violet-600 to-pink-600",
                        accentColor: "text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.4)]",
                      },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          tool.toggle();
                          setIsToolMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left font-sans text-xs cursor-pointer transition-all duration-200 ${
                          tool.active
                            ? `bg-gradient-to-r ${tool.colorClass} border-transparent text-white font-medium ${tool.accentColor}`
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={tool.active ? "text-white" : "text-white/40"}>
                            {tool.icon}
                          </span>
                          <span className="font-medium tracking-wide">{tool.name}</span>
                        </div>
                        
                        {/* Active indicator dot */}
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          tool.active 
                            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                            : "bg-white/10"
                        }`} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                  Replying...
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

      {/* Integrated Chat History & Input Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.form 
            ref={chatContainerRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onSubmit={handleTextSubmit}
            style={{
              zIndex: isChatMaximized ? 999 : 40,
              transform: isChatMaximized ? "none" : undefined,
              height: isChatMaximized ? undefined : `${chatHeight}px`,
            }}
            className={
              isChatMaximized
                ? "fixed inset-0 w-screen h-screen flex flex-col pointer-events-auto p-6 md:p-8 transition-all duration-300 ease-in-out"
                : "fixed bottom-32 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] md:w-[45%] max-w-[90vw] md:max-w-[45vw] flex flex-col pointer-events-auto rounded-2xl p-2.5 transition-all duration-300 ease-in-out"
            }
          >
            <div 
              className={`relative w-full h-full rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col min-h-0 pt-3 ${
                isChatMaximized ? "px-4 pb-4" : "px-2.5 pb-2.5"
              } ${
                isGhostMode
                  ? "bg-black/90 border border-red-500/90 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                  : isARMode 
                     ? "bg-black/80 border border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                     : "bg-neutral-950/90 border border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              }`}
            >
              {!isChatMaximized && (
                <div 
                  className="absolute top-0 left-0 right-0 h-4 flex items-start pt-1.5 justify-center cursor-ns-resize group touch-none"
                  onPointerDown={handlePointerDown}
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1 bg-red-500/50 group-hover:bg-red-500 rounded-full transition-colors pointer-events-none"></div>
                </div>
              )}
              {/* Header section with toggle full-screen and close buttons */}
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 shrink-0">
                <span className="text-[10px] font-mono text-red-500 font-bold tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-red-500 inline-block animate-ping"></span>
                  {isChatMaximized ? "Zoya Console - Maximized" : "Zoya Console"}
                </span>
                
                <div className="flex items-center gap-2">
                  {/* Trash Icon Button to Clear Chat History */}
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to clear all chat history?")) {
                          setMessages([]);
                          localStorage.removeItem("zoya_chat_history");
                          resetZoyaSession();
                        }
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-white/10 animate-fade-in"
                      title="Delete all history"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* Full Screen Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsChatMaximized(!isChatMaximized)}
                    className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-white/10"
                    title={isChatMaximized ? "Restore Size" : "Maximize Chat"}
                  >
                    {isChatMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                  
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isInputMicActive && recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch (err) {}
                        setIsInputMicActive(false);
                      }
                      setShowChat(false);
                      setIsChatMaximized(false);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-white/10"
                    title="Close Chat"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Chat History Display Area */}
              <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 pb-1 flex flex-col min-h-0">
                <div className="flex flex-col gap-2 mt-auto w-full">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                      const hasText = typeof msg.text === "string" && msg.text.trim().length > 0;
                      const hasImage = !!(msg.image || (msg as any).imageUrl);
                      if (!hasText && !hasImage) return null;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className={`flex flex-col max-w-[85%] min-h-0 ${
                            msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                          }`}
                        >
                          <div className={`relative px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-[13px] border backdrop-blur-md transition-all duration-300 shadow-lg h-fit w-fit min-h-0 leading-relaxed ${
                            msg.isError
                              ? "bg-red-950/85 border-red-500/50 text-red-200 font-sans shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                              : msg.sender === "user" 
                                ? isGhostMode
                                  ? "bg-red-950/45 border-red-500/40 text-red-100 rounded-br-none font-sans shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                                  : "bg-red-950/40 border-red-500/40 text-red-100 rounded-br-none font-sans" 
                                : isGhostMode
                                  ? "bg-rose-950/45 border-rose-500/45 text-rose-100 rounded-bl-none font-mono tracking-wide shadow-[0_0_12px_rgba(244,63,94,0.15)] pr-8"
                                  : "bg-pink-950/30 border-pink-500/30 text-pink-100 rounded-bl-none font-mono tracking-wide pr-8"
                          }`}>
                            {(msg.image || (msg as any).imageUrl) && (
                              <img 
                                src={msg.image || (msg as any).imageUrl} 
                                alt="Camera snap" 
                                className="max-w-[120px] max-h-[80px] rounded-lg mb-1 border border-white/20 object-cover shadow h-fit w-fit min-h-0"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {msg.sender === "zoya" && msg.isHighThinking && (
                              <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 w-fit backdrop-blur-md shadow-sm">
                                <Brain size={12} className="text-pink-400 animate-pulse" />
                                <span className="text-[9px] font-mono uppercase tracking-wider text-pink-300">Deep Thinking</span>
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            {msg.sender === "zoya" && !msg.isError && msg.text && (
                              <button
                                type="button"
                                onClick={() => speakMessageText(msg.text)}
                                className="absolute bottom-1.5 right-1.5 p-1 rounded bg-white/5 hover:bg-white/15 text-pink-300/70 hover:text-pink-100 transition-all cursor-pointer flex items-center justify-center border border-white/5 active:scale-95"
                                title="Speak message"
                              >
                                <Volume2 size={11} />
                              </button>
                            )}
                          </div>
                          <span className={`text-[8px] opacity-40 mt-0.5 px-1.5 font-mono uppercase tracking-widest ${
                            isGhostMode ? "text-rose-400" : ""
                          }`}>
                            {msg.sender === "user" ? "Riyajul" : "Zoya"}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <AnimatePresence>
                    {(isTyping || isLoading) && (
                      <TypingIndicator isGhostMode={isGhostMode} />
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Compact Input Bar */}
              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 resize-none min-h-[28px] max-h-[120px] overflow-y-auto leading-normal"
                  rows={1}
                />
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={toggleInputDictation}
                    className={`p-1.5 rounded-md transition-all duration-300 cursor-pointer flex items-center justify-center ${
                      isInputMicActive
                        ? "bg-red-500/20 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] border border-red-500/30 scale-105 animate-pulse"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                    title="Dictate message (Speech to Text)"
                  >
                    <Mic size={13} />
                  </button>
                  <button 
                    type="submit"
                    disabled={!textInput.trim()}
                    className={`p-1.5 rounded-md disabled:opacity-50 transition-all duration-300 cursor-pointer ${
                      isGhostMode
                        ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-red-500/30 disabled:to-rose-600/30 text-white"
                        : "bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-white/30 text-white"
                    }`}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Controls */}
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
                <span>End Session</span>
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
              if (nextShowChat) {
                setTimeout(() => {
                  textareaRef.current?.focus();
                }, 150);
              }
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

      {/* Update Successful Toast Overlay */}
      <AnimatePresence>
        {showUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[10px]">
              Z
            </div>
            <span className="text-sm font-medium tracking-wide">Update Successful</span>
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
    </div>
  );
}
