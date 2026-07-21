import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, X, Camera, CameraOff, RefreshCw, Maximize2, Minimize2, Tv, Download, PictureInPicture, Shield, Fingerprint, Lock, Unlock, Box, Layers, Ghost, Users, HardDrive, Brain, Mail, Calendar, ListTodo, Presentation, MessageSquare, FileText, ClipboardList, Video, StickyNote, GraduationCap, Menu, ArrowRight, ImagePlus, Paperclip, Plus, Sparkles, Image as ImageIcon , Copy, Check } from "lucide-react";
import { getZoyaResponse, getZoyaResponseStream } from "./services/geminiService";
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
  images?: string[];
  isError?: boolean;
  isHighThinking?: boolean;
  generatedImageUrl?: string;
  generatedImagePrompt?: string;
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
  const [isUpdating, setIsUpdating] = useState(false);
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
        {isPlusMenuOpen && (
          <>
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
