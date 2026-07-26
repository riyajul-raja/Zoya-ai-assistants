const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// 1. Remove absolute X button
const absoluteBtnRegex = /\{\/\*\s*Absolute Universal Close Button\s*\*\/.*?<\/button>/s;
code = code.replace(absoluteBtnRegex, "");

// 2. Add X button to the flex container and fix overlap
const rightControlsRegex = /<div className="flex items-center gap-2">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/s;
// We'll replace the header structure slightly to ensure flex row items-center justify-end gap-4
const newHeader = `<div className="flex items-center gap-2">
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
              
              <div className="flex flex-row items-center justify-end gap-4">
                {/* Mobile Auth Button / Add Event */}
                <div className="md:hidden flex items-center">
                  {!isAuthenticated ? (
                    <button
                      onClick={handleLogin}
                      disabled={isSigningIn}
                      className="p-1.5 rounded bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1 border border-red-500/20"
                    >
                      {isSigningIn ? <Loader2 size={12} className="animate-spin" /> : <User size={12} />}
                      <span className="hidden sm:inline">LOGIN</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { 
                         setIsCreateOpen(true); 
                         setSelectedEvent(null);
                      }}
                      className="p-1.5 rounded bg-white/5 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Add Event"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Close Panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>`;
// Replace the old right controls with the new one
code = code.replace(/<div className="flex items-center gap-2">\s*<button\s*onClick=\{\(\) => \{\s*if \(token\) \{\s*fetchEvents\(token, searchQuery, currentMonth\);\s*\}\s*\}\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{?\/\* Calendar Grid \*\//, newHeader + "\n          {/* Calendar Grid */");

// 3. Fix the arrows
const prevArrowRegex = /const prev = new Date\(currentMonth\);\s*prev\.setMonth\(prev\.getMonth\(\) - 1\);\s*setCurrentMonth\(prev\);/s;
code = code.replace(prevArrowRegex, "const prev = new Date(currentMonth);\n                    prev.setMonth(prev.getMonth() - 1);\n                    setCurrentMonth(prev);\n                    if (token) fetchEvents(token, searchQuery, prev);");

const nextArrowRegex = /const next = new Date\(currentMonth\);\s*next\.setMonth\(next\.getMonth\(\) \+ 1\);\s*setCurrentMonth\(next\);/s;
code = code.replace(nextArrowRegex, "const next = new Date(currentMonth);\n                    next.setMonth(next.getMonth() + 1);\n                    setCurrentMonth(next);\n                    if (token) fetchEvents(token, searchQuery, next);");

// 4. Highlight current day header
const oldDaysHeader = `{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[9px] md:text-[10px] font-mono text-white/40 uppercase py-1">
                  {day}
                </div>
              ))}`;
const newDaysHeader = `{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                const isCurrentDayOfWeek = new Date().getDay() === idx;
                return (
                <div key={day} className={\`text-center text-[9px] md:text-[10px] font-mono uppercase py-1 \${isCurrentDayOfWeek ? 'text-red-500 font-bold' : 'text-white/40'}\`}>
                  {day}
                </div>
                );
              })}`;
code = code.replace(oldDaysHeader, newDaysHeader);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched fixes!");
