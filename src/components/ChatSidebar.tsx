import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MessageSquare, 
  Search, 
  MoreVertical, 
  Edit3, 
  Pin, 
  Trash2,
  PinOff,
  Clock, Copy, Share
} from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  pinned: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  chats: ChatSession[];
  activeChatId?: string;
  onSelectChat: (id: string) => void;
  onUpdateChat: (id: string, updates: Partial<ChatSession>) => void;
  onDeleteChat: (id: string) => void;
  onDuplicateChat?: (id: string) => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  onNewChat,
  chats,
  activeChatId,
  onSelectChat,
  onUpdateChat,
  onDeleteChat,
  onDuplicateChat
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const lowerQ = searchQuery.toLowerCase();
    return chats.filter(c => 
      c.title.toLowerCase().includes(lowerQ) || 
      c.preview.toLowerCase().includes(lowerQ)
    );
  }, [chats, searchQuery]);

  const pinnedChats = filteredChats.filter(c => c.pinned);
  const unpinnedChats = filteredChats.filter(c => !c.pinned).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Basic grouping by date for non-pinned chats
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  const recents = unpinnedChats.filter(c => isSameDay(c.timestamp, today) || isSameDay(c.timestamp, yesterday));
  const older = unpinnedChats.filter(c => !isSameDay(c.timestamp, today) && !isSameDay(c.timestamp, yesterday));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatList = (title: string, icon: React.ReactNode, chatList: ChatSession[]) => {
    if (chatList.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-2 px-3">
          {icon}
          {title}
        </div>
        <div className="flex flex-col gap-0.5">
          {chatList.map((chat, index) => (
            <motion.div 
              key={chat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative rounded-[18px] transition-all duration-300 cursor-pointer flex items-center justify-between p-4 hyper-glass hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-0.5 active:scale-[0.98] ${activeChatId === chat.id ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] bg-violet-500/10' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-neutral-400 shrink-0 mt-0.5">
                  <MessageSquare size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[14px] font-medium text-white/95 truncate pr-2 tracking-wide">{chat.title}</h4>
                    <span className="text-[11px] font-medium text-neutral-500 shrink-0">{formatTime(chat.timestamp)}</span>
                  </div>
                  <p className="text-[12px] text-neutral-400 truncate leading-relaxed">{chat.preview}</p>
                </div>
              </div>
              
              {/* Context Menu Button */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                  }}
                  className="p-1.5 rounded-md hover:bg-white/20 text-neutral-400 hover:text-white transition-colors"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Context Menu Dropdown */}
                <AnimatePresence>
                  {activeMenuId === chat.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-1 w-36 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"
                      >
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt('Enter new title:', chat.title);
                            if (newTitle) onUpdateChat(chat.id, { title: newTitle });
                            setActiveMenuId(null);
                          }}
                        >
                          <Edit3 size={14} /> Rename
                        </button>
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateChat(chat.id, { pinned: !chat.pinned });
                            setActiveMenuId(null);
                          }}
                        >
                          {chat.pinned ? <><PinOff size={14} /> Unpin</> : <><Pin size={14} /> Pin</>}
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDuplicateChat) onDuplicateChat(chat.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Chat shared! (Simulation)");
                            setActiveMenuId(null);
                          }}
                        >
                          <Share size={14} /> Share
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-[80%] max-w-[320px] bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 z-[10000] flex flex-col shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[15px] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/20">
                  Z
                </div>
                <span className="text-[17px] font-serif font-medium text-white/95 tracking-wide">Zoya</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer p-2 hover:bg-white/10 rounded-xl hyper-glass hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex items-center gap-4 p-4 rounded-[18px] hyper-glass transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-white/20 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer text-left w-full group"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center hyper-glass border-white/10 text-neutral-400 group-hover:text-white transition-colors shrink-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <MessageSquare size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-white/95 tracking-wide group-hover:text-white transition-colors">New Chat</span>
                </div>
              </button>
            </div>

            {/* Chat List Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-hide">
              {/* Always visible search */}
              {true && (
                <div className="flex items-center p-4 rounded-[18px] hyper-glass mb-4">
                  <Search size={18} className="text-neutral-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search Chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-[15px] text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {renderChatList('Pinned Chats', <Pin size={16} />, pinnedChats)}
              
              {(recents.length > 0 || older.length > 0) && (
                <div className="mb-2 mt-2">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-neutral-400 px-2 tracking-wide uppercase">
                    <Clock size={14} />
                    Recents
                  </div>
                </div>
              )}
              {renderChatList('Today', null, unpinnedChats.filter(c => isSameDay(c.timestamp, today)))}
              {renderChatList('Yesterday', null, unpinnedChats.filter(c => isSameDay(c.timestamp, yesterday)))}
              {renderChatList('Older', null, older)}
              
              {chats.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-xl text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/20 animate-pulse">
                    Z
                  </div>
                  <p className="text-[15px] font-medium tracking-wide">Start a new conversation with Zoya.</p>
                </div>
              )}

              {searchQuery && filteredChats.length === 0 && (
                <div className="text-center py-10 text-neutral-500 text-[15px]">
                  No chats found for "{searchQuery}"
                </div>
              )}
            </div>


          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
