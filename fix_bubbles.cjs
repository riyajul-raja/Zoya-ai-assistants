const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const startStr = `                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={\`flex flex-col max-w-[85%] min-h-0 \${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }\`}
                >`;
                
const endStr = `                    {hasText && <div className="whitespace-pre-wrap">{msg.text}</div>}
                  </div>
                </motion.div>`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx + endStr.length);
    
    const newBlock = `                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={\`flex flex-col max-w-[90%] md:max-w-[85%] min-h-0 \${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start group"
                  }\`}
                >
                  <div className={\`relative px-5 py-3.5 rounded-[20px] text-[15px] transition-all duration-300 h-fit w-fit min-h-0 leading-relaxed max-w-full overflow-hidden break-words \${
                    msg.isError
                      ? "bg-red-950/85 border border-red-500/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : msg.sender === "user"
                          ? "bg-[#10b981]/20 border border-[#10b981]/30 text-white rounded-br-[4px] shadow-[0_8px_32px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
                          : "bg-white/[0.04] border border-white/10 text-neutral-100 rounded-bl-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
                  }\`}>
                    {hasImage && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.images?.map((base64, i) => (
                          <img key={i} src={\`data:image/jpeg;base64,\${base64}\`} className="max-w-[200px] max-h-[200px] rounded-lg border border-white/10" alt={\`Attached \${i}\`} />
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
                    <div className="flex items-center gap-1.5 mt-2 ml-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                      <button type="button" onClick={() => navigator.clipboard.writeText(msg.text || '')} className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Copy">
                        <Copy size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Read Aloud">
                        <Volume2 size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Regenerate">
                        <RefreshCw size={15} />
                      </button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Good response">
                        <ThumbsUp size={15} />
                      </button>
                      <button type="button" className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer" title="Bad response">
                        <ThumbsDown size={15} />
                      </button>
                    </div>
                  )}
                </motion.div>`;
                
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync('src/components/ChatPage.tsx', content);
    console.log('Message bubbles updated successfully.');
} else {
    console.log('Message bubbles block not found.');
}
