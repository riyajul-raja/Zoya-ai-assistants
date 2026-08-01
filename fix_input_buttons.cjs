const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `                <button
                  type="button"
                  onClick={() => setIsLocalPlusMenuOpen(!isLocalPlusMenuOpen)}
                  className={\`p-2.5 rounded-full hover:bg-white/10 transition-all cursor-pointer \${isLocalPlusMenuOpen ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}\`}
                  title="Media Options"
                >`,
  `                <button
                  type="button"
                  onClick={() => setIsLocalPlusMenuOpen(!isLocalPlusMenuOpen)}
                  className={\`p-2.5 rounded-full transition-all duration-300 cursor-pointer active:scale-95 \${isLocalPlusMenuOpen ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-neutral-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]'}\`}
                  title="Media Options"
                >`
);

content = content.replace(
  `                  <button
                    type="button"
                    onClick={toggleInputDictation}
                    className={\`p-2.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center \${
                      isListening
                        ? "bg-red-500/20 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                        : ""
                    }\`}
                    title="Dictate message (Speech to Text)"
                  >`,
  `                  <button
                    type="button"
                    onClick={toggleInputDictation}
                    className={\`p-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center active:scale-95 \${
                      isListening
                        ? "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        : "text-neutral-400 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    }\`}
                    title="Dictate message (Speech to Text)"
                  >`
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
                    className="p-2.5 rounded-[18px] bg-white text-black hover:bg-neutral-200 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:bg-neutral-800 disabled:text-neutral-500 ml-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
                  >`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
console.log('Buttons updated');
