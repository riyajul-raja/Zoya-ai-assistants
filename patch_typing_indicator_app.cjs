const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                  <AnimatePresence>
                    {(isTyping || isLoading) && (
                      <TypingIndicator isGhostMode={isGhostMode} />
                    )}
                  </AnimatePresence>`;

const replacement = `                  <AnimatePresence>
                    {(isTyping || isLoading) && (
                      <TypingIndicator isGhostMode={isGhostMode} thought={activeThought} />
                    )}
                  </AnimatePresence>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
