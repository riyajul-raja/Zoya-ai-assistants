const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// 1. Add isPrimary to CalendarEvent
code = code.replace(
  /interface CalendarEvent \{\n  id: string;/,
  "interface CalendarEvent {\n  id: string;\n  isPrimary?: boolean;"
);

// 2. Replace fetchEvents function body
const oldFetch = `  const fetchEvents = async (accessToken: string, queryStr = "", targetMonth?: Date) => {
    if (!accessToken) {
      setEvents([]);
      return;
    }
    setIsLoading(true);
    try {
      const monthToUse = targetMonth || currentMonth;
      const startOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth(), 1);
      const endOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth() + 1, 0, 23, 59, 59);
      
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      let url = \`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=\${encodeURIComponent(timeMin)}&timeMax=\${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100\`;
      
      if (queryStr) {
        url += \`&q=\${encodeURIComponent(queryStr)}\`;
      }

      const response = await fetch(url, {
        headers: { Authorization: \`Bearer \${accessToken}\` }
      });

      if (!response.ok) {
        throw new Error("Failed to load calendar events");
      }

      const data = await response.json();
      setEvents(data.items || []);
      setApiMode("real");
    } catch (err) {
      console.error("Error loading calendar events, falling back:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };`;

const newFetch = `  const fetchEvents = async (accessToken: string, queryStr = "", targetMonth?: Date) => {
    if (!accessToken) {
      setEvents([]);
      return;
    }
    setIsLoading(true);
    try {
      const monthToUse = targetMonth || currentMonth;
      const startOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth(), 1);
      const endOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth() + 1, 0, 23, 59, 59);
      
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      // 1. Fetch calendar list
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
      }));
      
      // Sort events by start time
      allEvents.sort((a, b) => {
        const startA = new Date(a.start.dateTime || a.start.date || 0).getTime();
        const startB = new Date(b.start.dateTime || b.start.date || 0).getTime();
        return startA - startB;
      });
      
      setEvents(allEvents);
      setApiMode("real");
    } catch (err) {
      console.error("Error loading calendar events, falling back:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };`;

code = code.replace(oldFetch, newFetch);

// 3. Update styling
const oldStyle = `                            className={\`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors \${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : "bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white"
                            }\`}`;
                            
const newStyle = `                            className={\`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors \${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : ev.isPrimary 
                                    ? "bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white"
                                    : "bg-teal-600/50 hover:bg-teal-500/70 text-teal-100"
                            }\`}`;
code = code.replace(oldStyle, newStyle);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched fetching all calendars");
