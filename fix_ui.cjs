const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

// 1. Button
content = content.replace(
  `                  className="p-2 rounded-full hyper-glass border border-white/10 hover:bg-white/20 text-neutral-400 hover:text-white transition-colors shadow-sm"
                >
                  <MoreVertical size={16} />`,
  `                  className="p-2 text-neutral-400 hover:text-white transition-all duration-200 opacity-60 hover:opacity-100 active:scale-95"
                >
                  <MoreVertical size={18} />`
);

// 2. Backdrop
content = content.replace(
  `                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />`,
  `                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />`
);

// 3. Popup Container
content = content.replace(
  `                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-1 w-40 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"
                      >`,
  `                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#1a0509]/85 backdrop-blur-2xl border border-red-500/20 shadow-[0_12px_40px_rgba(220,38,38,0.15)] rounded-2xl py-2 z-50 overflow-hidden"
                      >`
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
