const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldToast = `            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"`;
const newToast = `            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 pointer-events-none"`;

code = code.replace(oldToast, newToast);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
