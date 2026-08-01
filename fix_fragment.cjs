const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// Fix the AnimatePresence fragment
content = content.replace(
`        <AnimatePresence>
          {isLocalPlusMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}`,
`        <AnimatePresence>
          {isLocalPlusMenuOpen && (
            <motion.div key="plus-menu-container" className="absolute inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}`
);

content = content.replace(
`              </motion.div>
            </>
          )}
        </AnimatePresence>`,
`              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
