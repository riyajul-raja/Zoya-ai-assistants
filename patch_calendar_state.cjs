const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');
code = code.replace(
  /const \[events, setEvents\] = useState<CalendarEvent\[\]>\(\[\]\);/,
  "const [events, setEvents] = useState<CalendarEvent[]>([]);\n  const [currentMonth, setCurrentMonth] = useState(new Date());"
);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched state");
