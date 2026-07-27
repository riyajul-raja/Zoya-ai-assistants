const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

const oldTryBlock = `    try {
      // 2. FIX DATE PAYLOAD: parse and format as ISO YYYY-MM-DD
      const [year, month, day] = startDate.split('-');
      const formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;

      // 3. API INSERT CALL payload
      const eventPayload = {
        summary: summary.trim(),
        start: { date: formattedDate },
        end: { date: formattedDate }
      };`;

const newTryBlock = `    try {
      // 1. STRICT DATE PARSING: Handle DD/MM/YYYY or YYYY-MM-DD
      let formattedDate = startDate;
      if (startDate.includes('/')) {
        const [day, month, year] = startDate.split('/');
        formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;
      } else if (startDate.includes('-')) {
        const [year, month, day] = startDate.split('-');
        // Check if it was accidentally DD-MM-YYYY
        if (year.length === 2 || year.length === 1) {
           formattedDate = \`\${day}-\${month.padStart(2, '0')}-\${year.padStart(2, '0')}\`;
        } else {
           formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;
        }
      }

      // 2. API INSERT CALL payload
      const eventPayload = {
        summary: summary.trim(),
        start: { date: formattedDate },
        end: { date: formattedDate }
      };`;

code = code.replace(oldTryBlock, newTryBlock);
fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched create event 2");
