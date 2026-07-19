const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

// 1. Update Left Pane classes
code = code.replace(
  /<div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white\/10 bg-white\/5 p-4 flex flex-col justify-between shrink-0">/,
  '<div className={`w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-white/5 p-4 flex-col justify-between shrink-0 ${ (isComposeOpen || selectedEmail) ? "hidden md:flex" : "flex" }`}>'
);

// 2. Update Middle Pane classes
code = code.replace(
  /<div className="flex-1 flex flex-col relative h-full">/,
  '<div className={`flex-1 flex-col relative h-full ${ (isComposeOpen || selectedEmail) ? "hidden md:flex" : "flex" }`}>'
);

// 3. Update Right Pane classes
code = code.replace(
  /<div className="hidden md:flex md:w-\[400px\] flex-col h-full bg-white\/1 border-l border-white\/10 relative">/,
  '<div className={`w-full md:w-[400px] flex-col h-full bg-white/1 md:border-l border-white/10 relative ${ (isComposeOpen || selectedEmail) ? "flex" : "hidden md:flex" }`}>'
);

// 4. Add Back button to Right Pane
const rightPaneHeader = `          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">`;
const rightPaneHeaderWithBack = `          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <div className="md:hidden mb-2">
              <button onClick={() => { setIsComposeOpen(false); setSelectedEmail(null); }} className="text-white/70 hover:text-white flex items-center gap-1 font-mono text-xs">
                <ChevronRight className="rotate-180" size={14} /> Back
              </button>
            </div>`;
code = code.replace(rightPaneHeader, rightPaneHeaderWithBack);

fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched responsive layout in GmailManager.tsx');
