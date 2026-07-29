const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `                  placeholder="Describe your image..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 resize-none min-h-[48px] max-h-[120px] overflow-y-auto leading-normal scrollbar-hide"`,
  `                  placeholder="Describe your image..."
                  className="flex-1 hyper-glass rounded-[24px] px-5 py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:shadow-[0_0_30px_rgba(255,255,255,0.06)] focus:border-white/20 resize-none min-h-[48px] max-h-[120px] overflow-y-auto leading-normal scrollbar-hide"`
);

content = content.replace(
  `                  className="p-3.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)]"`,
  `                  className="p-4 rounded-[20px] bg-purple-500 hover:bg-purple-400 text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-[0.96]"`
);

content = content.replace(
  `                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1"
                  >`,
  `                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.95]"
                  >`
);

// Remove default bottom border of the input area
content = content.replace(
  `      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 shrink-0 relative">`,
  `      <div className="p-4 md:px-8 pb-6 bg-transparent shrink-0 relative">`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
