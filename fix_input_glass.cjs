const fs = require('fs');

let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

const startStr = `              <div className="flex items-center gap-2 w-full bg-neutral-900 border border-white/10 rounded-2xl pl-2 pr-2 py-1.5 focus-within:border-white/30 transition-colors">`;
const endStr = `              </div>`; // Wait, I will just do a direct string replace.

content = content.replace(
  `              <div className="flex items-center gap-2 w-full bg-neutral-900 border border-white/10 rounded-2xl pl-2 pr-2 py-1.5 focus-within:border-white/30 transition-colors">`,
  `              <div className="flex items-center gap-2 w-full hyper-glass rounded-[24px] pl-2 pr-2 py-2 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.06)] focus-within:border-white/20 transition-all duration-300 group">`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
