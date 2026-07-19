const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const startStr = "        {/* Center Pane: Events listing */}";
const endStr = "        {/* Right Pane: Selected Event Details View OR Scheduling Composer */}";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end string");
    process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(endIndex);

const newCenterPane = `        {/* Center Pane: Events Month Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/2">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-red-500 animate-pulse hidden md:block" />
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="text-[11px] md:text-sm font-mono text-white uppercase tracking-widest w-20 md:w-28 text-center truncate">
                  {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </h3>
                <button 
                  onClick={() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (token) {
                    fetchEvents(token, searchQuery, currentMonth);
                  }
                }}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Reload Schedule"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer md:hidden"
                title="Close Panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col bg-black/20 custom-scrollbar">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[9px] md:text-[10px] font-mono text-white/40 uppercase py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            {isLoading && events.length === 0 ? (
               <div className="flex-1 flex items-center justify-center">
                 <Loader2 className="animate-spin text-red-500" size={28} />
               </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr flex-1">
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }, (_, i) => i).map(blank => (
                  <div key={\`blank-\${blank}\`} className="min-h-[60px] md:min-h-[90px] p-1 rounded-lg bg-white/5 border border-transparent opacity-50" />
                ))}
                
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                  const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  // Ensure local timezone doesn't mess up YYYY-MM-DD
                  const dateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
                  
                  // Find events for this day
                  const dayEvents = events.filter(ev => {
                    const evStart = ev.start.dateTime || ev.start.date;
                    if (!evStart) return false;
                    return evStart.startsWith(dateStr);
                  });
                  
                  const todayObj = new Date();
                  const todayStr = todayObj.getFullYear() + "-" + String(todayObj.getMonth() + 1).padStart(2, '0') + "-" + String(todayObj.getDate()).padStart(2, '0');
                  const isToday = todayStr === dateStr;

                  return (
                    <div 
                      key={day} 
                      className={\`min-h-[60px] md:min-h-[90px] p-1 md:p-1.5 rounded-lg border flex flex-col gap-1 transition-colors overflow-hidden \${
                        isToday 
                          ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                          : 'bg-white/5 border-white/5 hover:border-white/20'
                      }\`}
                    >
                      <div className={\`text-[9px] md:text-xs font-mono font-medium \${isToday ? 'text-red-400' : 'text-white/60'} text-right mb-0.5\`}>
                        {day}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar no-scrollbar">
                        {dayEvents.map(ev => (
                          <div 
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              setIsCreateOpen(false);
                            }}
                            className={\`text-[8px] md:text-[9px] truncate px-1 py-0.5 rounded cursor-pointer transition-colors \${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : "bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white"
                            }\`}
                            title={ev.summary || "Untitled Event"}
                          >
                            {ev.summary || "Untitled Event"}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
`;

fs.writeFileSync('src/components/CalendarManager.tsx', before + newCenterPane + after);
console.log("Patched Center Pane");
