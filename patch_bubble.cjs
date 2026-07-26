const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className={\`relative px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-[13px] border backdrop-blur-md transition-all duration-300 shadow-lg h-fit w-fit min-h-0 leading-relaxed \${`;
const replacement = `<div className={\`relative px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-[13px] border backdrop-blur-md transition-all duration-300 shadow-lg h-fit w-fit min-h-0 leading-relaxed max-w-full overflow-hidden break-words \${`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
