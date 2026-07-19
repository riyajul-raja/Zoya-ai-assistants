const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// 1. DUPLICATE CLOSE BUTTON
const oldCloseBtn = `              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer md:hidden"
                title="Close Panel"
              >
                <X size={14} />
              </button>`;
code = code.replace(oldCloseBtn, "");

// 2 & 3. CENTER DATES AND RENDER EVENTS (FIX MAPPING)
const oldGridCell = `                    <div 
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
                      
                      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar scrollbar-hide">
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
                    </div>`;

const newGridCell = `                    <div 
                      key={day} 
                      className={\`min-h-[60px] md:min-h-[90px] p-1 md:p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors overflow-hidden \${
                        isToday 
                          ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                          : 'bg-white/5 border-white/5 hover:border-white/20'
                      }\`}
                    >
                      <div className={\`text-lg md:text-xl font-mono font-medium \${isToday ? 'text-red-400' : 'text-white/60'} text-center\`}>
                        {day}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto w-full items-center custom-scrollbar scrollbar-hide">
                        {dayEvents.map(ev => (
                          <div 
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              setIsCreateOpen(false);
                            }}
                            className={\`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors \${
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
                    </div>`;

code = code.replace(oldGridCell, newGridCell);

const oldEventFilter = `                  // Find events for this day
                  const dayEvents = events.filter(ev => {
                    const evStart = ev.start.dateTime || ev.start.date;
                    if (!evStart) return false;
                    return evStart.startsWith(dateStr);
                  });`;

const newEventFilter = `                  // Find events for this day
                  const dayEvents = events.filter(ev => {
                    const evStart = ev.start.dateTime || ev.start.date;
                    if (!evStart) return false;
                    const evDateObj = new Date(evStart);
                    const evDateStr = evDateObj.getFullYear() + "-" + String(evDateObj.getMonth() + 1).padStart(2, '0') + "-" + String(evDateObj.getDate()).padStart(2, '0');
                    return evDateStr === dateStr;
                  });`;

code = code.replace(oldEventFilter, newEventFilter);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log('Patched');
