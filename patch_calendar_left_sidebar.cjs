const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldSidebarEvents = `                  events.slice(0, 5).map(event => (
                    <div 
                      key={event.id}`;

const newSidebarEvents = `                  events
                    .filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart) >= new Date();
                    })
                    .slice(0, 5)
                    .map(event => (
                    <div 
                      key={event.id}`;

code = code.replace(oldSidebarEvents, newSidebarEvents);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Left Sidebar");
