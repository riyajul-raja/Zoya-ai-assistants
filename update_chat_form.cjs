const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  /<motion\.form\s+ref=\{chatContainerRef\}/,
  '<motion.form onClick={() => setActiveDebugMsgId(null)} ref={chatContainerRef}'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
