const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// Replace handleDeleteEvent fallback logic
const delOld = `    if (!token || apiMode === "fallback") {
      const updated = events.filter((ev) => ev.id !== event.id);
      saveFallbackEventsToStore(updated);
      onToast("Event deleted from local workspace.");
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null);
      }
      return;
    }`;
const delNew = `    if (!token) {
      onToast("You must be signed in to delete events.");
      return;
    }`;
code = code.replace(delOld, delNew);

// Replace handleCreateEvent fallback logic
const createOld = `    if (!token || apiMode === "fallback") {
      const newEvent: CalendarEvent = {
        id: \`local-ev-\${Date.now()}\`,
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      };

      const updated = [newEvent, ...events];
      saveFallbackEventsToStore(updated);
      onToast("Event saved to local workspace.");
      setIsCreateOpen(false);
      setSummary("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      return;
    }`;
const createNew = `    if (!token) {
      onToast("You must be signed in to create events.");
      return;
    }`;
code = code.replace(createOld, createNew);

// Remove the `{!isAuthenticated && (...)}` block which talks about offline mode
const offlineBlock = `          {!isAuthenticated && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-red-300 shrink-0">
              <span className="flex items-center gap-2">
                <CloudOff size={14} className="text-red-400" />
                <span>Running in premium Offline-First local storage mode. Cloud sync is disabled.</span>
              </span>
              <button
                onClick={handleLogin}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 px-3 py-1 rounded-lg transition-all text-[10px] uppercase font-mono cursor-pointer"
              >
                Connect Cloud
              </button>
            </div>
          )}`;
code = code.replace(offlineBlock, "");

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched Calendar Cleanup");
