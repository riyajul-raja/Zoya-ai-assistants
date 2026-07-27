const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// We will change the Create Event logic to only require Title and Date
const oldCreateHandler = `  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !startDate || !startTime || !endDate || !endTime) {
      onToast("Please fill in all required fields.");
      return;
    }

    const startDateTime = new Date(\`\${startDate}T\${startTime}\`).toISOString();
    const endDateTime = new Date(\`\${endDate}T\${endTime}\`).toISOString();

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      onToast("End time must be after start time.");
      return;
    }

    // MANDATORY USER CONFIRMATION FOR SENSITIVE / MUTATING ACTIONS (CREATING EVENTS)
    const confirmed = window.confirm(\`Create event "\${summary}" scheduled for \${startDate} at \${startTime}?\`);
    if (!confirmed) return;

    if (!token) {
      onToast("You must be signed in to create events.");
      return;
    }

    setIsCreating(true);

    try {
      const eventPayload = {
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      };`;

const newCreateHandler = `  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !startDate) {
      onToast("Please provide an event title and date.");
      return;
    }

    // MANDATORY USER CONFIRMATION FOR SENSITIVE / MUTATING ACTIONS (CREATING EVENTS)
    const confirmed = window.confirm(\`Create "\${summary}" on \${startDate}?\`);
    if (!confirmed) return;

    if (!token) {
      onToast("You must be signed in to create events.");
      return;
    }

    setIsCreating(true);

    try {
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

code = code.replace(oldCreateHandler, newCreateHandler);

// Clean up state reset
code = code.replace(/setEndDate\(\"\"\);\n      setEndTime\(\"\"\);/, "");
code = code.replace(/setStartTime\(\"\"\);\n/, "");
code = code.replace(/setDescription\(\"\"\);\n      setLocation\(\"\"\);\n/, "");

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched handler");
