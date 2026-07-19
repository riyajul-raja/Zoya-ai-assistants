const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

code = code.replace(
  /<div className="w-full md:w-\[240px\] border-r border-white\/10 shrink-0 bg-white\/2 flex flex-col justify-between h-full">/,
  '<div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full overflow-hidden">'
);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
