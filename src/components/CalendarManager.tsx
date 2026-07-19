import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, MapPin, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, CalendarRange, User, AlignLeft,
  CloudOff, Cloud
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

interface CalendarManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function CalendarManager({ onClose, isGhostMode = false, onToast }: CalendarManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [apiMode, setApiMode] = useState<"real" | "fallback">("real");

  // Calendar States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Create Event Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Action States
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadFallbackEvents = () => {
    setApiMode("fallback");
    const cached = localStorage.getItem("zoya_calendar_events");
    if (cached) {
      setEvents(JSON.parse(cached));
    } else {
      const initialEvents: CalendarEvent[] = [
        {
          id: "local-ev-1",
          summary: "Zoya Orbital Sync Meeting",
          description: "Routine calibration check of AI server arrays and telemetry streams.",
          location: "Deep Space Platform Sector 7",
          start: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // in 1 hour
          end: { dateTime: new Date(Date.now() + 7200000).toISOString() }
        },
        {
          id: "local-ev-2",
          summary: "Database Backup Operations",
          description: "Encrypted memory backup to persistent cold storage volumes.",
          location: "Zoya Lunar Server Farm",
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() }, // tomorrow
          end: { dateTime: new Date(Date.now() + 90000000).toISOString() }
        }
      ];
      setEvents(initialEvents);
      localStorage.setItem("zoya_calendar_events", JSON.stringify(initialEvents));
    }
  };

  const saveFallbackEventsToStore = (updated: CalendarEvent[]) => {
    setEvents(updated);
    localStorage.setItem("zoya_calendar_events", JSON.stringify(updated));
  };

  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        setApiMode("real");
        fetchEvents(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
        loadFallbackEvents();
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        onToast("Google Calendar access authorized!");
        fetchEvents(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setFirebaseUser(null);
      setToken(null);
      setEvents([]);
      setSelectedEvent(null);
      setIsCreateOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch upcoming events from primary calendar
  const fetchEvents = async (accessToken: string, queryStr = "") => {
    if (!accessToken) {
      loadFallbackEvents();
      return;
    }
    setIsLoading(true);
    try {
      const timeMin = new Date().toISOString();
      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=5`;
      
      if (queryStr) {
        url += `&q=${encodeURIComponent(queryStr)}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load calendar events");
      }

      const data = await response.json();
      setEvents(data.items || []);
      setApiMode("real");
    } catch (err) {
      console.error("Error loading calendar events, falling back:", err);
      loadFallbackEvents();
    } finally {
      setIsLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (event: CalendarEvent) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE SYSTEM WORKSPACE OPERATIONS
    const confirmed = window.confirm(`Permanently delete "${event.summary}" from your Calendar? This action cannot be undone.`);
    if (!confirmed) return;

    if (!token || apiMode === "fallback") {
      const updated = events.filter((ev) => ev.id !== event.id);
      saveFallbackEventsToStore(updated);
      onToast("Event deleted from local workspace.");
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null);
      }
      return;
    }

    setIsDeleting(event.id);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      onToast("Event deleted successfully.");
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null);
      }
      fetchEvents(token, searchQuery);
    } catch (err) {
      console.error("Error deleting event:", err);
      onToast("Failed to delete event from Google Calendar.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !startDate || !startTime || !endDate || !endTime) {
      onToast("Please fill in all required fields.");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      onToast("End time must be after start time.");
      return;
    }

    // MANDATORY USER CONFIRMATION FOR SENSITIVE / MUTATING ACTIONS (CREATING EVENTS)
    const confirmed = window.confirm(`Create event "${summary}" scheduled for ${startDate} at ${startTime}?`);
    if (!confirmed) return;

    if (!token || apiMode === "fallback") {
      const newEvent: CalendarEvent = {
        id: `local-ev-${Date.now()}`,
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
    }

    setIsCreating(true);

    try {
      const eventPayload = {
        summary: summary.trim(),
        description: description.trim(),
        location: location.trim(),
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(eventPayload)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      onToast("Event scheduled successfully!");
      setIsCreateOpen(false);
      setSummary("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      fetchEvents(token, searchQuery);
    } catch (err) {
      console.error("Error creating event:", err);
      onToast("Failed to schedule calendar event.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchEvents(token, searchQuery);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
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
  };

  return (
    <div id="calendar-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="calendar-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top strip bar */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Absolute Universal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Close Panel"
        >
          <X size={16} />
        </button>

        {/* Left Side: Navigation Drawer and User Profile */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full overflow-hidden">
          <div className="p-5 space-y-6 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Calendar
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Google Workspace Sync</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCreateOpen(true);
                setSelectedEvent(null);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>SCHEDULE EVENT</span>
            </button>

            <div className="space-y-1 flex flex-col flex-1 min-h-0">
              <button
                className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2.5 font-mono text-xs transition-colors cursor-pointer bg-red-500/15 border-l-2 border-red-500 text-white font-medium mb-3 shrink-0"
              >
                <span className="text-red-400">
                  <CalendarRange size={14} />
                </span>
                <span>My Schedule</span>
              </button>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoading && events.length === 0 ? (
                   <div className="flex justify-center p-4"><Loader2 className="animate-spin text-red-500" size={16} /></div>
                ) : events.length === 0 ? (
                   <p className="text-[10px] text-white/30 text-center px-2 py-4 font-mono uppercase">No upcoming events</p>
                ) : (
                  events.slice(0, 5).map(event => (
                    <div 
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setIsCreateOpen(false); }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <h4 className="text-xs text-white font-medium truncate mb-1.5">{event.summary || "Untitled Event"}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1 font-mono">
                        <Clock size={10} className="text-red-400 shrink-0" />
                        <span className="truncate">{(formatEventTime(event) as any).dateString} - {(formatEventTime(event) as any).timeString}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-mono">
                          <MapPin size={10} className="text-rose-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
          {isAuthenticated && firebaseUser ? (
            <div className="p-4 border-t border-white/10 shrink-0 bg-white/2 flex flex-col space-y-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || "Google User"}
                    referrerPolicy="no-referrer"
                    className="w-6.5 h-6.5 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="w-6.5 h-6.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] uppercase">
                    {firebaseUser.displayName?.charAt(0) || "G"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[9px] text-white/30 leading-none">Organizer</p>
                  <p className="text-[11px] font-medium text-white truncate mt-1">
                    {firebaseUser.displayName || firebaseUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full p-1.5 rounded-lg border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[10px] font-mono flex items-center justify-center gap-1.5"
              >
                <LogOut size={11} />
                <span>SIGN OUT</span>
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-white/10 shrink-0 bg-white/2 flex flex-col space-y-2">
              <p className="text-[9px] text-white/30 leading-none">Workspace Auth</p>
              <button
                onClick={handleLogin}
                disabled={isSigningIn}
                className="w-full p-2 rounded-lg border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer text-[10px] font-mono flex items-center justify-center gap-1.5"
              >
                {isSigningIn ? <Loader2 size={11} className="animate-spin" /> : <Calendar size={11} />}
                <span>CONNECT ACCOUNT</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Pane: Events listing */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                UPCOMING AGENDA
              </h3>
              <button
                onClick={() => {
                  if (token) {
                    fetchEvents(token, searchQuery);
                  } else {
                    loadFallbackEvents();
                  }
                }}
                disabled={isLoading}
                className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Reload Schedule"
              >
                <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          {!isAuthenticated && (
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
          )}

          {/* Search bar */}
          <form onSubmit={handleSearch} className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2">
            <div className="relative flex-1 flex items-center">
              <Search size={13} className="absolute left-3 text-white/30" />
              <input
                type="text"
                placeholder="Search calendar events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-white/40 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-xs text-white hover:bg-white/10 hover:text-white font-mono"
            >
              FILTER
            </button>
          </form>

          {/* Events list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {isLoading && events.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-red-500" size={28} />
              </div>
            ) : events.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/30">
                <Calendar size={32} className="opacity-35 mb-2 text-red-500/40" />
                <p className="text-xs font-mono uppercase tracking-wider">No Events scheduled</p>
                <p className="text-[10px] mt-1 max-w-xs leading-normal">
                  Schedule a new meeting or event from the side panel to see it displayed here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => {
                  const { dateString, timeString } = formatEventTime(evt) as any;
                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt);
                        setIsCreateOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col relative overflow-hidden group hover:border-white/10 hover:bg-white/4 ${
                        selectedEvent?.id === evt.id
                          ? "bg-red-500/10 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                          : "bg-white/2 border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Event Name */}
                          <h4 className="text-xs font-medium text-white truncate leading-snug">
                            {evt.summary || "(No Title)"}
                          </h4>
                          
                          {/* Event Details Row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono text-white/40">
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="text-red-400" />
                              <span>{timeString}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{dateString}</span>
                            </div>
                            {evt.location && (
                              <div className="flex items-center gap-1 max-w-[200px] truncate">
                                <MapPin size={10} className="text-rose-400" />
                                <span>{evt.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delete Event Trigger Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(evt);
                          }}
                          disabled={isDeleting === evt.id}
                          className="p-1 rounded hover:bg-red-500/25 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Event"
                        >
                          {isDeleting === evt.id ? (
                            <Loader2 size={10} className="animate-spin text-red-500" />
                          ) : (
                            <Trash2 size={11} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Selected Event Details View OR Scheduling Composer */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
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
              ) : selectedEvent ? (
                /* Selected Event Details Viewer */
                <motion.div
                  key="event-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {selectedEvent.summary}
                      </h3>
                      
                      <div className="mt-4 space-y-3 border-t border-b border-white/5 py-4 text-[11px] font-mono text-white/50">
                        <div className="flex gap-2.5 items-start">
                          <Clock size={12} className="text-red-400 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-white/80">
                              {(formatEventTime(selectedEvent) as any).dateString}
                            </p>
                            <p className="text-white/40">
                              {(formatEventTime(selectedEvent) as any).timeString}
                            </p>
                          </div>
                        </div>
                        {selectedEvent.location && (
                          <div className="flex gap-2.5 items-start">
                            <MapPin size={12} className="text-rose-400 mt-0.5" />
                            <span className="text-white/80 break-all">{selectedEvent.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description Text Container */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/30 uppercase">
                        <AlignLeft size={10} />
                        <span>Description</span>
                      </div>
                      <div className="bg-neutral-900/60 rounded-xl p-4 border border-white/5 whitespace-pre-wrap font-sans text-xs text-white/80 leading-relaxed min-h-[100px]">
                        {selectedEvent.description || "No description provided for this calendar event."}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent)}
                      disabled={isDeleting === selectedEvent.id}
                      className="flex-1 py-2.5 px-3 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-xs font-mono flex items-center justify-center gap-2"
                    >
                      {isDeleting === selectedEvent.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      <span>DELETE EVENT</span>
                    </button>

                    {selectedEvent.htmlLink && (
                      <a
                        href={selectedEvent.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:text-white text-xs font-mono rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        OPEN IN WEB
                      </a>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Empty Placeholder */
                <motion.div
                  key="select-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <Calendar size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No event selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a meeting or agenda item from your calendar to read start/end timings, descriptions, locations, and invitation links.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
