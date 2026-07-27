const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldFetchStart = `      // 1. Fetch calendar list
      const calendarListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: \`Bearer \${accessToken}\` }
      });
      
      if (!calendarListRes.ok) throw new Error("Failed to fetch calendar list");
      const calendarList = await calendarListRes.json();
      const calendars = calendarList.items || [];
      
      // 2. Fetch events for each calendar
      const allEvents: CalendarEvent[] = [];
      
      await Promise.all(calendars.map(async (cal: any) => {
        let url = \`https://www.googleapis.com/calendar/v3/calendars/\${encodeURIComponent(cal.id)}/events?timeMin=\${encodeURIComponent(timeMin)}&timeMax=\${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100\`;
        if (queryStr) {
          url += \`&q=\${encodeURIComponent(queryStr)}\`;
        }
        
        try {
          const eventsRes = await fetch(url, {
             headers: { Authorization: \`Bearer \${accessToken}\` }
          });
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            const items = eventsData.items || [];
            // tag items with primary or not
            items.forEach((item: any) => {
               item.isPrimary = cal.primary || false;
            });
            allEvents.push(...items);
          }
        } catch (e) {
          console.error("Failed to fetch events for calendar", cal.id, e);
        }
      }));`;

const newFetchStart = `      const allEvents: CalendarEvent[] = [];
      
      const calendarIds = [
        { id: 'primary', isPrimary: true },
        { id: 'en.indian#holiday@group.v.calendar.google.com', isPrimary: false }
      ];
      
      await Promise.all(calendarIds.map(async (cal) => {
        let url = \`https://www.googleapis.com/calendar/v3/calendars/\${encodeURIComponent(cal.id)}/events?timeMin=\${encodeURIComponent(timeMin)}&timeMax=\${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100\`;
        if (queryStr) {
          url += \`&q=\${encodeURIComponent(queryStr)}\`;
        }
        
        try {
          const eventsRes = await fetch(url, {
             headers: { Authorization: \`Bearer \${accessToken}\` }
          });
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            const items = eventsData.items || [];
            items.forEach((item: any) => {
               item.isPrimary = cal.isPrimary;
            });
            allEvents.push(...items);
          }
        } catch (e) {
          console.error("Failed to fetch events for calendar", cal.id, e);
        }
      }));`;

code = code.replace(oldFetchStart, newFetchStart);

const oldStyle = `                            className={\`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors \${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : ev.isPrimary 
                                    ? "bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white"
                                    : "bg-teal-600/50 hover:bg-teal-500/70 text-teal-100"
                            }\`}`;
const newStyle = `                            className={\`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors \${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : ev.isPrimary 
                                    ? "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                                    : "bg-teal-500 hover:bg-teal-400 text-white font-medium shadow-sm"
                            }\`}`;
code = code.replace(oldStyle, newStyle);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched fetching statically");
