import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, X, Camera, CameraOff, RefreshCw, Maximize2, Minimize2, Tv, Download, PictureInPicture, Shield, Fingerprint, Lock, Unlock, Box, Layers, Ghost } from "lucide-react";
import { getZoyaResponse, getZoyaResponseStream, resetZoyaSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import TypingIndicator from "./components/TypingIndicator";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  role?: "user" | "model";
  text: string;
  image?: string;
  isError?: boolean;
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
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [chatHeight, setChatHeight] = useState(150);
  const chatContainerRef = useRef<HTMLFormElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState<"awaiting" | "granted" | "failed">("awaiting");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<any>(null);

  const triggerBiometrics = async () => {
    if (unlockStatus === "granted") return;
    
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

  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

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
      
      // Append an initial message for Zoya with empty text so that the UI updates in real-time
      setMessages((prev) => [
        ...prev,
        { id: responseMessageId, sender: "zoya", role: "model", text: "" }
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
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black text-white p-6 font-sans overflow-hidden"
          >
            {/* Sci-Fi Cinematic Grid & Glowing Nodes */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/10 blur-[100px] rounded-full" />
              <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-pink-600/10 blur-[100px] rounded-full" />
            </div>

            <div className="z-10 flex flex-col items-center max-w-md w-full text-center space-y-12">
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

              {/* Pulsing Fingerprint Container with Hold Progress Circle */}
              <div className="relative flex items-center justify-center">
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
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center relative cursor-pointer select-none transition-all duration-500 shadow-2xl ${
                    unlockStatus === "granted"
                      ? "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                      : unlockStatus === "failed"
                      ? "bg-red-500/10 border border-red-500/50 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-shake"
                      : holdProgress > 0
                      ? "bg-violet-600/20 border border-violet-500/40 text-violet-300 shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                      : "bg-white/[0.02] border border-white/10 hover:border-white/20 text-white/80 hover:text-white"
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
                  className={`text-lg md:text-xl font-mono tracking-[0.2em] uppercase font-bold transition-colors duration-300 ${
                    unlockStatus === "granted"
                      ? "text-emerald-400 font-sans tracking-wide"
                      : unlockStatus === "failed"
                      ? "text-red-400"
                      : "text-violet-100"
                  }`}
                >
                  {unlockStatus === "granted" ? (
                    "ACCESS GRANTED - WELCOME BOSS"
                  ) : unlockStatus === "failed" ? (
                    "AUTHORIZATION FAILED"
                  ) : holdProgress > 0 ? (
                    "SCANNING BIOMETRICS..."
                  ) : (
                    "BIOMETRIC LOCK: AWAITING AUTHORIZATION"
                  )}
                </motion.h2>

                <p className="text-xs text-white/40 font-mono tracking-wide max-w-xs mx-auto leading-relaxed">
                  {unlockStatus === "granted"
                    ? "Syncing core subroutines and loading Zoya neural link..."
                    : unlockStatus === "failed"
                    ? "Verification failed. Tap icon to authenticate using native device security."
                    : "Tap icon to authenticate using native device security."}
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

          
          {/* Ghost Mode Toggle Button */}
          <button
            onClick={toggleGhostMode}
            className={`p-2 rounded-full border transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center ${
              isGhostMode
                ? "bg-gradient-to-r from-red-600 to-rose-600 border-red-400/50 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                : "bg-white/10 hover:bg-white/20 border-white/25 text-white hover:text-red-400 hover:border-red-500/30"
            }`}
            title={isGhostMode ? "Ghost Mode: ACTIVE (Traces will not be saved)" : "Activate Ghost Mode (Stealth Protocol)"}
          >
            <Ghost size={18} className={isGhostMode ? "animate-bounce" : ""} />
          </button>

          {/* Mood Switcher Toggle Button */}
          <button
            onClick={() => {
              const nextMode = !isProfessionalMode;
              setIsProfessionalMode(nextMode);
              if (nextMode) {
                triggerToast("Professional Mode: ON");
              } else {
                triggerToast("Professional Mode: OFF");
              }
            }}
            className={`p-2 rounded-full border transition-all cursor-pointer pointer-events-auto flex items-center justify-center ${
              isProfessionalMode
                ? "bg-gradient-to-r from-violet-600 to-pink-600 border-violet-400/50 text-white shadow-lg shadow-violet-500/20"
                : "bg-white/10 hover:bg-white/20 border-white/25 text-white"
            }`}
            title={isProfessionalMode ? "Professional Mode: ON (Addressing you as 'Boss')" : "Switch to Professional Mode"}
          >
            <Shield size={18} className={isProfessionalMode ? "animate-pulse" : ""} />
          </button>

          {/* AR Hologram Button */}
          <button
            onClick={toggleAR}
            className={`p-2 rounded-full border transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center ${
              isARMode
                ? isCameraActive
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 border-cyan-400/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"
                  : "bg-cyan-950/80 border-cyan-700/50 text-cyan-500 shadow-none"
                : "bg-white/10 hover:bg-white/20 border-white/25 text-white"
            }`}
            title={isARMode ? "Deactivate AR Mode" : "Activate AR Hologram Mode"}
          >
            <Box 
              size={18} 
              className={`transition-all duration-300 ${
                isARMode 
                  ? isCameraActive 
                    ? "animate-spin text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" 
                    : "text-cyan-600 opacity-60" 
                  : ""
              }`} 
              style={{ animationDuration: isARMode && isCameraActive ? "8s" : undefined }} 
            />
          </button>

          {/* PiP Elegant Icon Button */}
          <button
            onClick={handlePiP}
            style={{ zIndex: 9999 }}
            className={`p-2 rounded-full border transition-all cursor-pointer pointer-events-auto flex items-center justify-center ${
              isGlobePiPActive
                ? "bg-gradient-to-r from-violet-600 to-pink-600 border-violet-400/50 text-white shadow-lg shadow-violet-500/20"
                : "bg-white/10 hover:bg-white/20 border-white/25 text-white"
            }`}
            title={isGlobePiPActive ? "Exit Floating Core Mode" : "Floating Core Mode (Picture-in-Picture)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isGlobePiPActive ? "animate-pulse" : ""}>
              <path d="M19 11H11V17H19V11Z" fill="currentColor" fillOpacity="0.3" />
              <rect width="20" height="14" x="2" y="3" rx="2" />
            </svg>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/25 text-white cursor-pointer pointer-events-auto"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-95" />
            ) : (
              <Volume2 size={18} className="opacity-95" />
            )}
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
            onClick={() => setShowChat(!showChat)}
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


          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
