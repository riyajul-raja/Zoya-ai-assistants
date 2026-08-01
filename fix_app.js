const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/          <\/p>\n        <\/div>\n/g, '          </p>\n        </div>\n      )}\n');

// Fix managers: any /> followed by {someManagerOverlay} or AnimatePresence should have )}
content = content.replace(/        \/>\n      \{\/\* /g, '        />\n      )}\n\n      {/* ');

// For the last manager (ClassroomManager) before </motion.div>
content = content.replace(/        \/>\n          <\/motion\.div>/g, '        />\n      )}\n          </motion.div>');

fs.writeFileSync('src/App.tsx', content);
