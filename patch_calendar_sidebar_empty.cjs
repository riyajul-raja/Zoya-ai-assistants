const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldSidebar = `              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoading && events.length === 0 ? (
                   <div className="flex justify-center p-4"><Loader2 className="animate-spin text-red-500" size={16} /></div>
                ) : events.length === 0 ? (
                   <p className="text-[10px] text-white/30 text-center px-2 py-4 font-mono uppercase">No upcoming events</p>
                ) : (
                  events
                    .filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart) >= new Date();
                    })
                    .slice(0, 5)
                    .map(event => (`;

const newSidebar = `              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoading && events.length === 0 ? (
                   <div className="flex justify-center p-4"><Loader2 className="animate-spin text-red-500" size={16} /></div>
                ) : events.filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart).getTime() + 86400000 >= new Date().getTime(); // Include today
                    }).length === 0 ? (
                   <p className="text-[10px] text-white/30 text-center px-2 py-4 font-mono uppercase">No upcoming events</p>
                ) : (
                  events
                    .filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart).getTime() + 86400000 >= new Date().getTime();
                    })
                    .slice(0, 5)
                    .map(event => (`;

code = code.replace(oldSidebar, newSidebar);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Left Sidebar Empty State");
