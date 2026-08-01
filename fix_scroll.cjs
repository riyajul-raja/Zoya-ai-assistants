const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// Add onScroll to the div
content = content.replace(
  '<div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0">',
  '<div onScroll={() => setActiveDebugMsgId(null)} className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0">'
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
