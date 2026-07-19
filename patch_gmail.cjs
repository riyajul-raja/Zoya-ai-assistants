const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

code = code.replace(
  'maxResults=20',
  'maxResults=5'
);

code = code.replace(
  `<div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={28} />
                  </div>`,
  `<div className="h-64 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] rounded-full" size={28} />
                    <p className="text-xs font-mono uppercase tracking-wider text-red-400 animate-pulse">Fetching secure emails...</p>
                  </div>`
);

fs.writeFileSync('src/components/GmailManager.tsx', code);
