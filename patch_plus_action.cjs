const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setTextInput("/generate ");
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >`;

const replacement = `              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsImageMode(true);
                  setTextInput("");
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-colors text-left"
              >`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
