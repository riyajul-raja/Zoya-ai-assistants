import React, { useRef, useEffect, useState } from 'react';
import { Menu, X, Trash2, Mic, Send, Loader2, PlusCircle, Sparkles, ImageIcon, Brain, RefreshCw, Copy, Check, ThumbsUp, ThumbsDown, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TypingIndicator from "./TypingIndicator";
import { ChatMessage } from '../App';
import ChatSidebar, { ChatSession } from './ChatSidebar';

interface ChatPageProps {
  messages: ChatMessage[];
  textInput: string;
  setTextInput: (val: string) => void;
  handleTextSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isTyping: boolean;
  isGhostMode: boolean;
  isARMode: boolean;
  isListening: boolean;
  toggleInputDictation: () => void;
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  isImageMode: boolean;
  setIsImageMode: (val: boolean) => void;
  isDeepThinking: boolean;
  setIsDeepThinking: (val: boolean) => void;
  setShowChat: (val: boolean) => void;
  isInputReadOnly: boolean;
  setIsInputReadOnly: (val: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setIsPlusMenuOpen: (val: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  handleRegenerateMessage: (msgId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  chatContainerRef: React.RefObject<HTMLFormElement>;
  recognitionRef: React.MutableRefObject<any>;
}

export default function ChatPage({
  messages,
  textInput,
  setTextInput,
  handleTextSubmit,
  isLoading,
  isTyping,
  isGhostMode,
  isARMode,
  isListening,
  toggleInputDictation,
  selectedImages,
  setSelectedImages,
  isImageMode,
  setIsImageMode,
  isDeepThinking,
  setIsDeepThinking,
  setShowChat,
  isInputReadOnly,
  setIsInputReadOnly,
  handleImageUpload,
  setIsPlusMenuOpen,
  setMessages,
  handleRegenerateMessage,
  textareaRef,
  fileInputRef,
  chatContainerRef,
  recognitionRef
}: ChatPageProps) {

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLocalPlusMenuOpen, setIsLocalPlusMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text || '');
    setCopiedMsgId(id);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const handleReadAloud = (text: string) => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
    if (!voice && voices.length > 0) voice = voices[0];
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (id: string, feedback: 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m));
  };
  
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('zoya_sidebar_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) }));
      } catch (e) {}
    }
    return [];
  });
  const [activeChatId, setActiveChatId] = useState<string | undefined>(() => {
    return localStorage.getItem('zoya_active_chat_id') || undefined;
  });

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('zoya_active_chat_id', activeChatId);
    } else {
      localStorage.removeItem('zoya_active_chat_id');
    }
  }, [activeChatId]);

  useEffect(() => {
    localStorage.setItem('zoya_sidebar_chats', JSON.stringify(chats));
  }, [chats]);

  // Sync current chat to list if messages exist
  useEffect(() => {
    if (messages.length > 0) {
      const currentId = activeChatId || Date.now().toString();
      if (!activeChatId) {
        setActiveChatId(currentId);
      }
      
      const firstUserMsg = messages.find(m => m.role === 'user')?.text;
      let title = 'New Chat';
      if (firstUserMsg) {
        // Simple heuristic to extract a short title
        const words = firstUserMsg.split(/[\s\n]+/);
        // Take up to 4 words
        title = words.slice(0, 4).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim();
        if (title.length > 30) {
          title = title.substring(0, 30).trim() + "...";
        }
        // Capitalize words
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      if (!title) title = 'New Chat';
      const lastMsg = messages[messages.length - 1];
      const preview = lastMsg.text?.slice(0, 40) || 'Image...';
      
      setChats(prev => {
        const existing = prev.find(c => c.id === currentId);
        if (existing) {
          const newTitle = (existing.title === 'New Chat' || !existing.title) ? title : existing.title;
          return prev.map(c => c.id === currentId ? { ...c, title: newTitle, preview, timestamp: new Date() } : c);
        } else {
          return [{ id: currentId, title, preview, timestamp: new Date(), pinned: false }, ...prev];
        }
      });
      
      // Save messages per chat so we can switch
      localStorage.setItem(`zoya_chat_msgs_${currentId}`, JSON.stringify(messages));
    }
  }, [messages, activeChatId]);

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(Date.now().toString());
  };

  const handleSelectChat = (id: string) => {
    const savedMsgs = localStorage.getItem(`zoya_chat_msgs_${id}`);
    if (savedMsgs) {
      try {
        setMessages(JSON.parse(savedMsgs));
        setActiveChatId(id);
        setIsSidebarOpen(false);
      } catch (e) {}
    }
  };

  const handleUpdateChat = (id: string, updates: Partial<ChatSession>) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    localStorage.removeItem(`zoya_chat_msgs_${id}`);
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  const handleDuplicateChat = (id: string) => {
    const chatToDuplicate = chats.find(c => c.id === id);
    if (!chatToDuplicate) return;
    
    const newId = Date.now().toString();
    const newChat = {
      ...chatToDuplicate,
      id: newId,
      title: chatToDuplicate.title + " (Copy)",
      timestamp: new Date()
    };
    
    // Copy messages
    const existingMsgs = localStorage.getItem(`zoya_chat_msgs_${id}`);
    if (existingMsgs) {
      localStorage.setItem(`zoya_chat_msgs_${newId}`, existingMsgs);
    }
    
    setChats(prev => [newChat, ...prev]);
    if (existingMsgs) {
      setMessages(JSON.parse(existingMsgs));
    }
    setActiveChatId(newId);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.form 
      ref={chatContainerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onSubmit={handleTextSubmit}
      style={{
        zIndex: 9999,
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
      }}
      className={`flex flex-col pointer-events-auto transition-all duration-300 ease-in-out ${
        isGhostMode
          ? "bg-[#0a0a0a]"
          : isARMode
              ? "bg-[#0a0a0a]"
              : "bg-[#0a0a0a]"
      }`}
    >
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onUpdateChat={handleUpdateChat}
        onDeleteChat={handleDeleteChat}
        onDuplicateChat={handleDuplicateChat}
      />
      
      {/* Top bar: Left (Menu), Right (Close) */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0 hyper-glass z-50 sticky top-0 rounded-b-[24px]">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-xl hyper-glass hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white/70 hover:text-white transition-all duration-300 cursor-pointer group"
        >
          <Menu size={20} className="group-hover:scale-105 transition-transform" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
            Z
          </div>
          <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
        </div>
        
        <button
          type="button"
          onClick={() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (err) {}
            }
            setShowChat(false);
          }}
          className="p-2 rounded-xl hyper-glass hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white/70 hover:text-white transition-all duration-300 cursor-pointer group"
          title="Close Chat"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Chat History Display Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0">
        <div className="flex flex-col gap-6 mt-auto w-full max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const hasText = typeof msg.text === "string" && msg.text.trim().length > 0;
              const hasImage = !!((Array.isArray(msg.images) && msg.images.length > 0) || msg.image || (msg as any).imageUrl || msg.generatedImageUrl);
              if (!hasText && !hasImage) return null;
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex flex-col max-w-[90%] md:max-w-[85%] min-h-0 ${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start group"
                  }`}

                >
                  <div className={`relative px-5 py-3.5 rounded-[20px] text-[15px] transition-all duration-300 h-fit w-fit min-h-0 leading-relaxed max-w-full overflow-hidden break-words ${
                    msg.isError
                      ? "bg-red-950/85 border border-red-500/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : msg.sender === "user"
                          ? "bg-[#10b981]/20 border border-[#10b981]/30 text-white rounded-br-[4px] shadow-[0_8px_32px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
                          : "bg-white/[0.04] border border-white/10 text-neutral-100 rounded-bl-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
                  }`}>
                    {hasImage && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.images?.map((base64, i) => (
                          <img key={i} src={`data:image/jpeg;base64,${base64}`} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10" alt={`Attached ${i}`} />
                        ))}
                        {msg.image && <img src={msg.image} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10" alt="Attached" />}
                        {(msg as any).imageUrl && <img src={(msg as any).imageUrl} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10" alt="Generated" />}
                        {msg.generatedImageUrl && <img src={msg.generatedImageUrl} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10" alt="Generated" />}
                      </div>
                    )}
                    {hasText && <div className="whitespace-pre-wrap leading-relaxed tracking-wide">{msg.text}</div>}
                  </div>
                  
                  {/* Actions for Assistant */}
                  {msg.sender !== "user" && !msg.isError && (
                    <div className="flex items-center gap-1 mt-1 ml-1" onClick={(e) => e.stopPropagation()}>
                      <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        type="button" 
                        onClick={() => handleCopy(msg.id, msg.text || '')} 
                        className="flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer group/btn" 
                        title="Copy"
                      >
                        {copiedMsgId === msg.id ? (
                          <div className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">Copied</span>
                          </div>
                        ) : (
                          <Copy size={14} className="group-active/btn:text-white" />
                        )}
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleReadAloud(msg.text || '')} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer active:text-white" title="Read Aloud">
                        <Volume2 size={14} />
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleRegenerateMessage(msg.id)} className="p-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer active:text-white" title="Regenerate">
                        <RefreshCw size={14} />
                      </motion.button>

                      <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'like')} className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${msg.feedback === 'like' ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5 active:text-white'}`} title="Good response">
                        <ThumbsUp size={14} />
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => handleFeedback(msg.id, 'dislike')} className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${msg.feedback === 'dislike' ? 'text-red-400 bg-red-500/10' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5 active:text-white'}`} title="Bad response">
                        <ThumbsDown size={14} />
                      </motion.button>
                    </div>
                  )}
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

      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-3 mx-4 mb-2 p-2 border border-white/10 rounded-lg bg-black/40 w-fit max-w-full overflow-x-auto">
          {selectedImages.map((base64, index) => (
            <div key={index} className="relative shrink-0">
              <img src={`data:image/jpeg;base64,${base64}`} className="h-16 w-16 object-cover rounded-md border border-white/20" alt={`Attached ${index + 1}`} />
              <button
                type="button"
                onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                className="absolute -top-2 -right-2 bg-neutral-800 text-white rounded-full p-1 hover:bg-red-500 transition-colors shadow-lg"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-4 md:px-8 pb-6 bg-transparent shrink-0 relative">
        <AnimatePresence>
          {isLocalPlusMenuOpen && (
            <motion.div key="plus-menu-container" className="absolute inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLocalPlusMenuOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 z-50 shadow-2xl flex flex-col gap-1 max-w-sm"
              >
                <button 
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsLocalPlusMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Upload Photo</div>
                    <div className="text-white/50 text-xs">Analyze with Zoya</div>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsImageMode(true);
                    setIsLocalPlusMenuOpen(false);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="p-2 rounded-full bg-purple-500/20 text-purple-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Create Image</div>
                    <div className="text-white/50 text-xs">Generate with AI</div>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsDeepThinking(true);
                    setIsLocalPlusMenuOpen(false);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className={`p-2 rounded-full ${isDeepThinking ? 'bg-indigo-500/40 text-indigo-300' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Deep Thinking</div>
                    <div className="text-white/50 text-xs">Advanced, focused reasoning</div>
                  </div>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {isImageMode ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <button 
                  type="button" 
                  onClick={() => setIsImageMode(false)}
                  className="bg-purple-900/40 text-purple-200 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-semibold hover:bg-purple-900/60 transition-colors cursor-pointer"
                >
                  <ImageIcon size={14} />
                  IMAGES
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  readOnly={isInputReadOnly}
                  onClick={() => setIsInputReadOnly(false)}
                  onTouchStart={() => setIsInputReadOnly(false)}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Describe your image..."
                  className="flex-1 hyper-glass rounded-[24px] px-5 py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:shadow-[0_0_30px_rgba(255,255,255,0.06)] focus:border-white/20 resize-none min-h-[48px] max-h-[120px] overflow-y-auto leading-normal scrollbar-hide"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="p-4 rounded-[20px] bg-purple-500 hover:bg-purple-400 text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-[0.96]"
                  title="Generate Image"
                >
                  <Sparkles size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {isDeepThinking && (
                <div className="px-1">
                  <button 
                    type="button" 
                    onClick={() => setIsDeepThinking(false)}
                    className="bg-indigo-900/40 text-indigo-200 px-3 py-1.5 rounded-full flex items-center w-fit gap-2 text-sm font-semibold hover:bg-indigo-900/60 transition-colors cursor-pointer"
                  >
                    <Brain size={14} />
                    Deep Thinking
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 w-full hyper-glass rounded-[24px] pl-2 pr-2 py-2 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.06)] focus-within:border-white/20 transition-all duration-300 group">
                <button
                  type="button"
                  onClick={() => setIsLocalPlusMenuOpen(!isLocalPlusMenuOpen)}
                  className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer active:scale-95 ${isLocalPlusMenuOpen ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-neutral-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]'}`}
                  title="Media Options"
                >
                  <PlusCircle size={22} />
                </button>
                
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  readOnly={isInputReadOnly}
                  onClick={() => setIsInputReadOnly(false)}
                  onTouchStart={() => setIsInputReadOnly(false)}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Message Zoya..."
                  className="flex-1 bg-transparent border-none text-[15px] text-white placeholder:text-neutral-500 focus:outline-none resize-none min-h-[24px] max-h-[120px] overflow-y-auto leading-relaxed py-2.5"
                  rows={1}
                />
                
                <div className="flex items-center gap-1 shrink-0">
                  <input type="file" multiple accept="image/*" className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={toggleInputDictation}
                    className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center active:scale-95 ${
                      isListening
                        ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        : "text-neutral-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    }`}
                    title="Dictate message (Speech to Text)"
                  >
                    <Mic size={22} />
                  </button>
                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-[18px] bg-white text-black hover:bg-neutral-200 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
                  >
                    {isLoading ? <Loader2 className="animate-spin text-neutral-400" size={20} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.form>
  );
}
