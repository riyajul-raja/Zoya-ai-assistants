const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.95]"
                  >`,
  `                  <button 
                    type="submit"
                    disabled={(!textInput.trim() && selectedImages.length === 0) || isLoading}
                    className="p-2.5 rounded-[18px] bg-white text-black hover:bg-neutral-200 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
                  >`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
