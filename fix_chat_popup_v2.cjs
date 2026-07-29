const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// Add useState
if (!content.includes('useState')) {
  content = content.replace("import React, { useRef, useEffect }", "import React, { useRef, useEffect, useState }");
}

// Add state for local menu
if (!content.includes('isLocalPlusMenuOpen')) {
  content = content.replace(
    "const messagesEndRef = useRef<HTMLDivElement>(null);", 
    "const messagesEndRef = useRef<HTMLDivElement>(null);\n  const [isLocalPlusMenuOpen, setIsLocalPlusMenuOpen] = useState(false);"
  );
}

// Replace the button
content = content.replace(
`                <button
                  type="button"
                  onClick={() => setIsPlusMenuOpen(true)}
                  className="p-2.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  title="Media Options"
                >
                  <PlusCircle size={22} />
                </button>`,
`                <button
                  type="button"
                  onClick={() => setIsLocalPlusMenuOpen(!isLocalPlusMenuOpen)}
                  className={\`p-2.5 rounded-full hover:bg-white/10 transition-all cursor-pointer \${isLocalPlusMenuOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}\`}
                  title="Media Options"
                >
                  <PlusCircle size={22} />
                </button>`
);

// Add the popup above the input
content = content.replace(
`      {/* Bottom Input Area */}
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 shrink-0">`,
`      {/* Bottom Input Area */}
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 shrink-0 relative">
        <AnimatePresence>
          {isLocalPlusMenuOpen && (
            <>
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
                  <div className={\`p-2 rounded-full \${isDeepThinking ? 'bg-indigo-500/40 text-indigo-300' : 'bg-indigo-500/20 text-indigo-400'}\`}>
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Deep Thinking</div>
                    <div className="text-white/50 text-xs">Advanced, focused reasoning</div>
                  </div>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
console.log("Done");
