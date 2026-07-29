import React, { useRef, useEffect, useState } from 'react';
import { Menu, X, Trash2, Mic, Send, Loader2, PlusCircle, Sparkles, ImageIcon, Brain, RefreshCw } from "lucide-react";
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
  textareaRef,
  fileInputRef,
  chatContainerRef,
  recognitionRef
}: ChatPageProps) {

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLocalPlusMenuOpen, setIsLocalPlusMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('zoya_sidebar_chats', JSON.stringify(chats));
  }, [chats]);

  // Sync current chat to list if messages exist
  useEffect(() => {
    if (messages.length > 0) {
      const currentId = activeChatId || 'default-chat';
      if (!activeChatId) {
        setActiveChatId(currentId);
      }
      
      const title = messages.find(m => m.role === 'user')?.text?.slice(0, 30) || 'New Chat';
      const lastMsg = messages[messages.length - 1];
      const preview = lastMsg.text?.slice(0, 40) || 'Image...';
      
      setChats(prev => {
        const existing = prev.find(c => c.id === currentId);
        if (existing) {
          return prev.map(c => c.id === currentId ? { ...c, title, preview, timestamp: new Date() } : c);
        } else {
          return [...prev, { id: currentId, title, preview, timestamp: new Date(), pinned: false }];
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
      />
      
      {/* Top bar: Left (Menu), Right (Close) */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-black/50 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <Menu size={20} />
        </button>

        <div className="font-sans text-sm font-semibold tracking-wide text-white text-center flex-1">
          Zoya
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
          className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          title="Close Chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat History Display Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0 bg-gradient-to-b from-transparent to-black/40">
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
                  className={`flex flex-col max-w-[85%] min-h-0 ${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div className={`relative px-4 py-3 rounded-2xl text-[15px] transition-all duration-300 h-fit w-fit min-h-0 leading-relaxed max-w-full overflow-hidden break-words ${
                    msg.isError
                      ? "bg-red-950/85 border border-red-500/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : msg.sender === "user"
                          ? isGhostMode
                          ? "bg-red-600 text-white rounded-br-sm shadow-md"
                          : "bg-blue-600 text-white rounded-br-sm shadow-md"
                          : isGhostMode
                          ? "bg-neutral-800/80 border border-white/5 text-neutral-100 rounded-bl-sm shadow-sm"
                          : "bg-neutral-800/80 border border-white/5 text-neutral-100 rounded-bl-sm shadow-sm"
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
                    {hasText && <div className="whitespace-pre-wrap">{msg.text}</div>}
                  </div>
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
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 shrink-0 relative">
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 resize-none min-h-[48px] max-h-[120px] overflow-y-auto leading-normal scrollbar-hide"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="p-3.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
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
              <div className="flex items-center gap-2 w-full bg-neutral-900 border border-white/10 rounded-2xl pl-2 pr-2 py-1.5 focus-within:border-white/30 transition-colors">
                <button
                  type="button"
                  onClick={() => setIsLocalPlusMenuOpen(!isLocalPlusMenuOpen)}
                  className={`p-2.5 rounded-full hover:bg-white/10 transition-all cursor-pointer ${isLocalPlusMenuOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}
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
                    className={`p-2.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center ${
                      isListening
                        ? "bg-red-500/20 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                        : ""
                    }`}
                    title="Dictate message (Speech to Text)"
                  >
                    <Mic size={22} />
                  </button>
                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1"
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
