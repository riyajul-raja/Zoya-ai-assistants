const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldFunc = `  const formatEventTime = (event: CalendarEvent) => {
    const startVal = event.start.dateTime || event.start.date;
    const endVal = event.end.dateTime || event.end.date;
    
    if (!startVal) return "All Day";
    
    const startDateObj = new Date(startVal);
    
    // Format start time
    const timeString = event.start.dateTime 
      ? startDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "All Day";

    const dateString = startDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    
    return { dateString, timeString };
  };`;

const newFunc = `  const formatEventTime = (event: CalendarEvent) => {
    const startVal = event.start.dateTime || event.start.date;
    const endVal = event.end.dateTime || event.end.date;
    
    if (!startVal) return { dateString: "Unknown Date", timeString: "Unknown Time" };
    
    const startDateObj = new Date(startVal);
    
    // Format start time
    const timeString = event.start.dateTime 
      ? startDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "All Day";

    const dateString = startDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    
    return { dateString, timeString };
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log('Patched Calendar time format');
