const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  `      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0 bg-gradient-to-b from-transparent to-black/40">`,
  `      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 pt-6 flex flex-col min-h-0">`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
