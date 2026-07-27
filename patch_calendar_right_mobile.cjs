const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const rightPaneOld = `        {/* Right Pane: Selected Event Details View OR Scheduling Composer */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">`;

const rightPaneNew = `        {/* Right Pane: Selected Event Details View OR Scheduling Composer */}
        <div className={\`\${selectedEvent || isCreateOpen ? 'flex' : 'hidden'} md:flex absolute md:relative inset-0 z-40 md:w-[400px] flex-col h-full bg-neutral-950/95 md:bg-white/1 border-l border-white/10\`}>
          
          {/* Mobile Back Button */}
          <button 
            onClick={() => { setSelectedEvent(null); setIsCreateOpen(false); }}
            className="md:hidden absolute top-4 left-4 z-50 p-2 rounded-full bg-white/10 text-white"
          >
            <ChevronLeft size={16} />
          </button>`;

code = code.replace(rightPaneOld, rightPaneNew);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Right Pane Mobile View");
