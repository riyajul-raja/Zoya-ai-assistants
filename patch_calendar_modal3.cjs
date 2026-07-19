const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarManager.tsx', 'utf8');

// Update the right pane to only show for selectedEvent
code = code.replace(
  /\className=\{\\\`\\\$\\{selectedEvent \|\| isCreateOpen \? \'flex\' \: \'hidden\'\\} md:flex absolute md:relative inset-0 z-40 md:w-\\[400px\\] flex-col h-full bg-neutral-950\\/95 md:bg-white\\/1 border-l border-white\\/10\\\`\}/,
  \`className={\\\`\${selectedEvent ? 'flex' : 'hidden'} md:flex absolute md:relative inset-0 z-40 md:w-[400px] flex-col h-full bg-neutral-950/95 md:bg-white/1 border-l border-white/10\\\`}\`
);

// Remove the event composer form from inside the right pane
const composerForm = `              {isCreateOpen ? (
                /* Event Composer Form */
                <motion.form
                  key="event-composer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateEvent}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Schedule Event
                      </h3>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Synapse Briefing"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Start Date & Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Start Time</label>
                        <input
                          type="time"
                          required
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>

                    {/* End Date & Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">End Time</label>
                        <input
                          type="time"
                          required
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Location</label>
                      <input
                        type="text"
                        placeholder="Google Meet, Conference Room 2, etc."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Description</label>
                      <textarea
                        placeholder="Agenda details, links, documents..."
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreating || !summary.trim() || !startDate || !startTime}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>SCHEDULE</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : selectedEvent ? (`

code = code.replace(composerForm, `              {selectedEvent ? (`);

// And we need to add the new standalone modal at the very end (before the final closing </div> of the CalendarManager component)
const newModal = `
      {/* Standalone Create Event Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-mono text-white font-bold uppercase tracking-wider">
                    Schedule Event
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Birthday, Appointment..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isCreating || !summary.trim() || !startDate}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {isCreating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        <span>CREATE EVENT</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

// Insert newModal just before the final </div> of the CalendarManager component.
// The file ends with:
//         </div>
//       </div>
//     </div>
//   );
// }

const fileEnding = `      </div>
    </div>
  );
}`;

code = code.replace(fileEnding, newModal + fileEnding);

fs.writeFileSync('src/components/CalendarManager.tsx', code);
console.log("Patched modal UI");
