const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  'className="absolute right-0 top-full mt-1 w-40 bg-neutral-900 border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"',
  'className="absolute right-0 top-full mt-1 w-40 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden"'
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
