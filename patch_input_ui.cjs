const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 resize-none min-h-[28px] max-h-[120px] overflow-y-auto leading-normal"
                  rows={1}
                />
                
                <div className="flex items-center gap-1 shrink-0">`;

const replacement = `              {isImageMode ? (
                <div className="flex flex-col mt-1 pt-1.5 border-t border-white/10 shrink-0 bg-[#1a1a1a]/95 rounded-2xl p-2 gap-2 shadow-lg">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold w-fit border border-purple-500/30">
                      <ImageIcon size={12} />
                      Images
                    </div>
                    <button type="button" onClick={() => setIsImageMode(false)} className="text-white/50 hover:text-white p-1 transition-colors cursor-pointer rounded-full hover:bg-white/10">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <textarea
                      ref={textareaRef}
                      autoFocus={false}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextSubmit(e);
                        }
                      }}
                      placeholder="Describe your image..."
                      className="flex-1 bg-transparent border-none px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none resize-none min-h-[36px] max-h-[120px] overflow-y-auto leading-normal scrollbar-hide"
                      rows={1}
                    />
                    <button
                      type="button"
                      onClick={handleTextSubmit}
                      disabled={!textInput.trim()}
                      className="p-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      title="Generate Image"
                    >
                      <Sparkles size={16} />
                    </button>
                  </div>
                </div>
              ) : (
              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 resize-none min-h-[28px] max-h-[120px] overflow-y-auto leading-normal"
                  rows={1}
                />
                
                <div className="flex items-center gap-1 shrink-0">`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
