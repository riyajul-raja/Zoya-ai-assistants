const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldTryBlock = `    try {
      // Calculate end date for all-day event (must be next day according to Google Calendar API)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + 1);
      
      const endDateStr = endDateObj.getFullYear() + "-" + String(endDateObj.getMonth() + 1).padStart(2, '0') + "-" + String(endDateObj.getDate()).padStart(2, '0');

      const eventPayload = {
        summary: summary.trim(),
        start: { date: startDate },
        end: { date: endDateStr }
      };`;

const newTryBlock = `    try {
      // 2. FIX DATE PAYLOAD: parse and format as ISO YYYY-MM-DD
      const [year, month, day] = startDate.split('-');
      const formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;

      // 3. API INSERT CALL payload
      const eventPayload = {
        summary: summary.trim(),
        start: { date: formattedDate },
        end: { date: formattedDate }
      };`;

code = code.replace(oldTryBlock, newTryBlock);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched create event");
