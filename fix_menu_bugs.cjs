const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

// 1. Add useEffect for outside click
const cancelLongPressStr = `  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };`;

const useEffectStr = `  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  React.useEffect(() => {
    if (!activeMenuId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if ((e.target as Element).closest('.chat-menu-dropdown') || (e.target as Element).closest('.chat-menu-trigger')) {
        return;
      }
      setActiveMenuId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeMenuId]);`;

content = content.replace(cancelLongPressStr, useEffectStr);

// 2. Add z-index to chat item motion.div
const motionDivStr = "className={`group relative rounded-[18px] transition-all duration-300 cursor-pointer flex items-center justify-between p-4 hyper-glass hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-0.5 active:scale-[0.98] ${activeChatId === chat.id ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] bg-violet-500/10' : ''}`}";
const newMotionDivStr = "className={`group relative rounded-[18px] transition-all duration-300 cursor-pointer flex items-center justify-between p-4 hyper-glass hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-0.5 active:scale-[0.98] ${activeChatId === chat.id ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] bg-violet-500/10' : ''} ${activeMenuId === chat.id ? 'z-50' : 'z-10'}`}";
content = content.replace(motionDivStr, newMotionDivStr);

// 3. Add chat-menu-trigger to button
const triggerBtn = `                  className="p-2 text-neutral-400 hover:text-white transition-all duration-200 opacity-60 hover:opacity-100 active:scale-95"`;
const newTriggerBtn = `                  className="chat-menu-trigger p-2 text-neutral-400 hover:text-white transition-all duration-200 opacity-60 hover:opacity-100 active:scale-95"`;
content = content.replace(triggerBtn, newTriggerBtn);

// 4. Remove fixed inset-0 overlay
const overlayDiv = `                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />`;
content = content.replace(overlayDiv, ``);

// 5. Update dropdown class and add chat-menu-dropdown
const dropdownDiv = `className="absolute right-0 top-full mt-2 w-48 bg-[#1a0509]/85 backdrop-blur-2xl border border-red-500/20 shadow-[0_12px_40px_rgba(220,38,38,0.15)] rounded-2xl py-2 z-50 overflow-hidden"`;
const newDropdownDiv = `className="chat-menu-dropdown absolute right-0 top-full mt-2 w-48 bg-[#1a0509] border border-red-500/30 shadow-[0_15px_50px_rgba(220,38,38,0.3)] rounded-2xl py-2 z-[100] overflow-hidden"`;
content = content.replace(dropdownDiv, newDropdownDiv);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
