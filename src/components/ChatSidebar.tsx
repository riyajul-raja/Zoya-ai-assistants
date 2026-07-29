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
  Clock
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
}

export default function ChatSidebar({
  isOpen,
  onClose,
  onNewChat,
  chats,
  activeChatId,
  onSelectChat,
  onUpdateChat,
  onDeleteChat
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
          {chatList.map(chat => (
            <div 
              key={chat.id}
              className={`group relative rounded-lg transition-colors cursor-pointer flex items-center justify-between p-3 hover:bg-white/10 ${activeChatId === chat.id ? 'bg-white/10' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white truncate pr-2">{chat.title}</h4>
                  <span className="text-[10px] text-neutral-500 shrink-0">{formatTime(chat.timestamp)}</span>
                </div>
                <p className="text-xs text-neutral-400 truncate">{chat.preview}</p>
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
            </div>
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
            className="fixed top-0 left-0 h-full w-[80%] max-w-[320px] bg-[#0a0a0a] border-r border-white/10 z-[10000] flex flex-col shadow-2xl"
          >
            {/* Header: New Chat */}
            <div className="p-4 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex items-center gap-3 text-sm font-medium text-white hover:text-white/80 transition-colors cursor-pointer w-full text-left"
              >
                <Edit3 size={18} />
                New Chat
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="h-px bg-white/10 mx-4 shrink-0" />

            {/* Chat List Area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
              {isSearchMode && (
                <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 mb-4 mx-1">
                  <Search size={16} className="text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search Chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {renderChatList('Pinned Chats', <Pin size={14} />, pinnedChats)}
              
              {(recents.length > 0 || older.length > 0) && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-2 px-3">
                    <Clock size={14} />
                    Recents
                  </div>
                </div>
              )}
              {renderChatList('Today', null, unpinnedChats.filter(c => isSameDay(c.timestamp, today)))}
              {renderChatList('Yesterday', null, unpinnedChats.filter(c => isSameDay(c.timestamp, yesterday)))}
              {renderChatList('Older', null, older)}
              
              {chats.length === 0 && !searchQuery && (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                  <MessageSquare size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">No chats yet</p>
                </div>
              )}

              {searchQuery && filteredChats.length === 0 && (
                <div className="text-center py-10 text-neutral-500 text-sm">
                  No chats found for "{searchQuery}"
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 mx-4 shrink-0" />
            
            {/* Search Button Footer */}
            <div className="p-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsSearchMode(!isSearchMode)}
                className="flex items-center gap-3 text-sm font-medium text-white hover:text-white/80 transition-colors cursor-pointer w-full text-left"
              >
                <Search size={18} />
                Search Chats
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
