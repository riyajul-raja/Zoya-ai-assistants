const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

content = content.replace(
  'className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2"',
  'className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2"'
);

fs.writeFileSync('src/components/ChatSidebar.tsx', content);
