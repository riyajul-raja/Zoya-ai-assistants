const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  value={textInput}`;

const replacement = `              <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/10 shrink-0">
                {isDeepThinking && (
                  <div className="pl-1 shrink-0" title="Deep Thinking Mode Active">
                    <Brain className="text-purple-400 animate-pulse w-5 h-5" />
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  autoFocus={false}
                  value={textInput}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
