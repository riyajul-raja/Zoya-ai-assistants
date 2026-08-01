const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  'className="p-1.5 rounded-md hover:bg-white/20 text-neutral-400 hover:text-white transition-colors"',
  'className="p-2 rounded-full hyper-glass border border-white/10 hover:bg-white/20 text-neutral-400 hover:text-white transition-colors shadow-sm"'
);
fs.writeFileSync('src/components/ChatSidebar.tsx', content);
