const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldNav = `<div className="space-y-1">
              <button
                className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2.5 font-mono text-xs transition-colors cursor-pointer bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
              >
                <span className="text-red-400">
                  <CalendarRange size={14} />
                </span>
                <span>My Schedule</span>
              </button>
            </div>`;

const newNav = `<div className="space-y-1 flex flex-col flex-1 min-h-0">
              <button
                className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2.5 font-mono text-xs transition-colors cursor-pointer bg-red-500/15 border-l-2 border-red-500 text-white font-medium mb-3 shrink-0"
              >
                <span className="text-red-400">
                  <CalendarRange size={14} />
                </span>
                <span>My Schedule</span>
              </button>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoading && events.length === 0 ? (
                   <div className="flex justify-center p-4"><Loader2 className="animate-spin text-red-500" size={16} /></div>
                ) : events.length === 0 ? (
                   <p className="text-[10px] text-white/30 text-center px-2 py-4 font-mono uppercase">No upcoming events</p>
                ) : (
                  events.slice(0, 5).map(event => (
                    <div 
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setIsCreateOpen(false); }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <h4 className="text-xs text-white font-medium truncate mb-1.5">{event.summary || "Untitled Event"}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1 font-mono">
                        <Clock size={10} className="text-red-400 shrink-0" />
                        <span className="truncate">{(formatEventTime(event) as any).dateString} - {(formatEventTime(event) as any).timeString}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-mono">
                          <MapPin size={10} className="text-rose-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>`;

code = code.replace(oldNav, newNav);

// Also need to make sure the left pane has flex-1 or proper height to allow scrolling
code = code.replace(
  /<div className="w-full md:w-\[260px\] border-r border-white\/10 shrink-0 bg-white\/2 flex flex-col justify-between h-full">/g,
  '<div className="w-full md:w-[260px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full overflow-hidden">'
);
code = code.replace(
  /<div className="p-5 space-y-6">/,
  '<div className="p-5 space-y-6 flex flex-col flex-1 min-h-0">'
);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log('Patched calendar UI');
