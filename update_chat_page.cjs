const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// 1. Add state variables inside ChatPage component
const componentStartMatch = content.match(/export default function ChatPage\([^)]*\)\s*\{/);
if (componentStartMatch) {
  const insertIndex = componentStartMatch.index + componentStartMatch[0].length;
  const stateVars = `
  const [activeDebugMsgId, setActiveDebugMsgId] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (msg: ChatMessage) => {
    if (msg.sender === "user" || !msg.debugInfo) return;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setActiveDebugMsgId(msg.id);
    }, 800);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleScroll = () => setActiveDebugMsgId(null);
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [chatContainerRef]);
  `;
  content = content.slice(0, insertIndex) + stateVars + content.slice(insertIndex);
}

// 2. Attach events to the bubble wrapper
// Look for `<div className={\`relative px-5 py-3.5` inside motion.div
const wrapperMatch = content.match(/<div className={\`relative px-5 py-3\.5 rounded-\[20px\][^>]*>/);
if (wrapperMatch) {
  const replacement = wrapperMatch[0].replace(
    '<div className=',
    '<div onPointerDown={() => handlePointerDown(msg)} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => { /* prevent context menu if long pressing */ if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }} className='
  );
  content = content.replace(wrapperMatch[0], replacement);
}

// 3. Render the debug panel right after the bubble text
const hasTextMatch = content.match(/\{hasText && <div className="whitespace-pre-wrap leading-relaxed tracking-wide">\{msg\.text\}<\/div>\}/);
if (hasTextMatch) {
  const debugPanel = `
                    {activeDebugMsgId === msg.id && msg.debugInfo && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-white/90 z-50 min-w-[220px] shadow-2xl"
                        onClick={(e) => { e.stopPropagation(); setActiveDebugMsgId(null); }}
                      >
                        <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-2">
                          <span className="font-semibold text-white/70">Debug Info</span>
                          <X className="w-3 h-3 cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1 font-mono text-[11px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">Intent:</span>
                            <span className={msg.debugInfo.intent === "LOCAL" ? "text-green-400" : "text-blue-400"}>{msg.debugInfo.intent}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">API Used:</span>
                            <span>{msg.debugInfo.apiUsed ? "YES" : "NO"}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">Model:</span>
                            <span>{msg.debugInfo.modelName || "N/A"}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">Cache:</span>
                            <span>{msg.debugInfo.isCached ? "YES" : "NO"}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">Response Time:</span>
                            <span>{msg.debugInfo.responseTimeMs ? \`\${msg.debugInfo.responseTimeMs} ms\` : "N/A"}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-white/50">Status:</span>
                            <span className={msg.debugInfo.status === "Error" ? "text-red-400" : "text-green-400"}>{msg.debugInfo.status}</span>
                          </div>
                          
                          {msg.debugInfo.status === "Error" && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1 text-red-300">
                              {msg.debugInfo.httpStatus && <div>HTTP Status: {msg.debugInfo.httpStatus}</div>}
                              {msg.debugInfo.errorCode && <div>Error Code: {msg.debugInfo.errorCode}</div>}
                              {msg.debugInfo.errorMessage && <div className="text-[10px] opacity-80 leading-tight line-clamp-3">{msg.debugInfo.errorMessage}</div>}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
  `;
  content = content.replace(hasTextMatch[0], hasTextMatch[0] + debugPanel);
}

// 4. Click outside to dismiss. Add an onClick to the main chat scroll container.
const chatScrollContainerMatch = content.match(/<div\s+ref=\{chatContainerRef\}\s+className="flex-1 overflow-y-auto px-4 md:px-8 pb-[140px] pt-24 custom-scrollbar scroll-smooth"/);
if (chatScrollContainerMatch) {
  content = content.replace(
    '<div\n        ref={chatContainerRef}\n        className="flex-1 overflow-y-auto px-4 md:px-8 pb-[140px] pt-24 custom-scrollbar scroll-smooth"',
    '<div\n        onClick={() => setActiveDebugMsgId(null)}\n        ref={chatContainerRef}\n        className="flex-1 overflow-y-auto px-4 md:px-8 pb-[140px] pt-24 custom-scrollbar scroll-smooth"'
  );
}

fs.writeFileSync('src/components/ChatPage.tsx', content);
