import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, X, Camera, CameraOff, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
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
  image?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
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

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showChat, setShowChat] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraActive]);

  // Capture video frame and send to Gemini Multimodal Live API
  useEffect(() => {
    if (!isCameraActive || !isSessionActive || !cameraStream) return;

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
  }, [isCameraActive, isSessionActive, cameraStream]);

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
        text: finalTranscript,
        image: capturedImageBase64 ? `data:image/jpeg;base64,${capturedImageBase64}` : undefined,
      },
    ]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getZoyaResponse(finalTranscript, messagesRef.current, capturedImageBase64);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getZoyaAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, isCameraActive]);

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
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        // Do not show "Microphone Blocked" before actually requesting microphone permission.
        // Call navigator.mediaDevices.getUserMedia() first.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access is not supported by your browser or secure context (ensure HTTPS).");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the mic track immediately, as LiveSessionManager will request it
        stream.getTracks().forEach(track => track.stop());

        // Now that permission is granted, start the session immediately
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
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

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
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

      {/* Camera Video Feed (Upper Half) */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`
              overflow-hidden shadow-2xl border border-white/10 bg-black/60 backdrop-blur-md pointer-events-auto
              ${isCameraFullscreen 
                ? "fixed inset-0 w-screen h-screen z-50 rounded-none border-none" 
                : "absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md aspect-video rounded-2xl z-30"
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
            
            {/* Floating Camera Controls overlaid on top right of video */}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            Z
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Zoya</h1>
        </div>
        <div className="flex items-center gap-2">
          {showChat && messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear all chat history?")) {
                  setMessages([]);
                  resetZoyaSession();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10 cursor-pointer"
              title="Delete all history"
            >
              <Trash2 size={16} className="opacity-80" />
              <span className="text-xs font-mono tracking-wide">Delete all history</span>
            </button>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={18} className="opacity-70" />
            ) : (
              <Volume2 size={18} className="opacity-70" />
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

        {/* Centered Scrollable Chat Messages Overlay */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-x-4 top-24 bottom-36 max-w-2xl mx-auto flex flex-col justify-end pointer-events-none z-10"
            >
              {/* Close Button at top-right of the chat area */}
              <div className="w-full flex justify-end mb-2 pointer-events-auto">
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shadow-lg backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer"
                  title="Close Chat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat list */}
              <div className="w-full max-h-[calc(100%-3rem)] overflow-y-auto scrollbar-hide flex flex-col gap-3 pointer-events-auto pr-2 pb-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`flex flex-col max-w-[85%] ${
                        msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div className={`px-4 py-2.5 rounded-2xl text-sm md:text-base border backdrop-blur-md transition-all duration-300 shadow-lg ${
                        msg.sender === "user" 
                          ? "bg-violet-600/15 border-violet-500/30 text-violet-100 rounded-br-none font-sans" 
                          : "bg-pink-600/15 border-pink-500/30 text-pink-100 rounded-bl-none font-mono tracking-wide"
                      }`}>
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Camera snap" 
                            className="max-w-[180px] max-h-[140px] rounded-lg mb-2 border border-white/20 object-cover shadow"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {msg.text}
                      </div>
                      <span className="text-[10px] opacity-40 mt-1 px-2 font-mono uppercase tracking-widest">
                        {msg.sender === "user" ? "Riyajul" : "Zoya"}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
          {showChat && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl pointer-events-auto"
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
                className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors cursor-pointer"
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-full border transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
              isCameraActive
                ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
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
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full border transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
              showChat
                ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
            title="Toggle Chat View"
          >
            <Keyboard size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
