import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, MapPin, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, CalendarRange, User, AlignLeft,
  CloudOff, Cloud, ChevronLeft, ChevronRight
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // Effect for changing months
  useEffect(() => {
    if (token && isAuthenticated) {
      fetchEvents(token, searchQuery, currentMonth);
    }
  }, [currentMonth]);

  // Initialize Auth & Load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        setApiMode("real");
        fetchEvents(cachedToken, "", currentMonth);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
        setEvents([]);
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
  const fetchEvents = async (accessToken: string, queryStr = "", targetMonth?: Date) => {
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
      
      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`;
      
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
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (event: CalendarEvent) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE SYSTEM WORKSPACE OPERATIONS
    const confirmed = window.confirm(`Permanently delete "${event.summary}" from your Calendar? This action cannot be undone.`);
    if (!confirmed) return;

    if (!token) {
      onToast("You must be signed in to delete events.");
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
      fetchEvents(token, searchQuery, currentMonth);
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
    if (!summary.trim() || !startDate) {
      onToast("Please provide an event title and date.");
      return;
    }

    // MANDATORY USER CONFIRMATION FOR SENSITIVE / MUTATING ACTIONS (CREATING EVENTS)
    const confirmed = window.confirm(`Create "${summary}" on ${startDate}?`);
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
            setStartDate("");
            
      fetchEvents(token, searchQuery, currentMonth);
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
      fetchEvents(token, searchQuery, currentMonth);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
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
        <div className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between max-h-[35vh] md:max-h-full md:h-full overflow-hidden hidden md:flex">
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
                ) : events.filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart).getTime() + 86400000 >= new Date().getTime(); // Include today
                    }).length === 0 ? (
                   <p className="text-[10px] text-white/30 text-center px-2 py-4 font-mono uppercase">No upcoming events</p>
                ) : (
                  events
                    .filter(event => {
                      const evStart = event.start.dateTime || event.start.date;
                      if (!evStart) return false;
                      return new Date(evStart).getTime() + 86400000 >= new Date().getTime();
                    })
                    .slice(0, 5)
                    .map(event => (
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

        {/* Center Pane: Events Month Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10 shrink-0 flex items-center justify-between bg-white/2">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-red-500 animate-pulse hidden md:block" />
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="text-[11px] md:text-sm font-mono text-white uppercase tracking-widest w-20 md:w-28 text-center truncate">
                  {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </h3>
                <button 
                  onClick={() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="p-1 md:p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (token) {
                    fetchEvents(token, searchQuery, currentMonth);
                  }
                }}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Reload Schedule"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
              {/* Mobile Auth Button */}
              <div className="md:hidden flex items-center">
                {!isAuthenticated ? (
                  <button
                    onClick={handleLogin}
                    disabled={isSigningIn}
                    className="p-1.5 rounded bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1 border border-red-500/20"
                  >
                    {isSigningIn ? <Loader2 size={12} className="animate-spin" /> : <User size={12} />}
                    <span className="hidden sm:inline">LOGIN</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                       setIsCreateOpen(true);
                       setSelectedEvent(null);
                    }}
                    className="p-1.5 rounded bg-white/5 text-white/70 hover:text-white transition-colors cursor-pointer mr-1"
                    title="Add Event"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col bg-black/20 custom-scrollbar">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[9px] md:text-[10px] font-mono text-white/40 uppercase py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            {isLoading && events.length === 0 ? (
               <div className="flex-1 flex items-center justify-center">
                 <Loader2 className="animate-spin text-red-500" size={28} />
               </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr flex-1">
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }, (_, i) => i).map(blank => (
                  <div key={`blank-${blank}`} className="min-h-[60px] md:min-h-[90px] p-1 rounded-lg bg-white/5 border border-transparent opacity-50" />
                ))}
                
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                  const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  // Ensure local timezone doesn't mess up YYYY-MM-DD
                  const dateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
                  
                  // Find events for this day
                  const dayEvents = events.filter(ev => {
                    const evStart = ev.start.dateTime || ev.start.date;
                    if (!evStart) return false;
                    const evDateObj = new Date(evStart);
                    const evDateStr = evDateObj.getFullYear() + "-" + String(evDateObj.getMonth() + 1).padStart(2, '0') + "-" + String(evDateObj.getDate()).padStart(2, '0');
                    return evDateStr === dateStr;
                  });
                  
                  const todayObj = new Date();
                  const todayStr = todayObj.getFullYear() + "-" + String(todayObj.getMonth() + 1).padStart(2, '0') + "-" + String(todayObj.getDate()).padStart(2, '0');
                  const isToday = todayStr === dateStr;

                  return (
                    <div 
                      key={day} 
                      className={`min-h-[60px] md:min-h-[90px] p-1 md:p-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors overflow-hidden ${
                        isToday 
                          ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                          : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`text-lg md:text-xl font-mono font-medium ${isToday ? 'text-red-400' : 'text-white/60'} text-center`}>
                        {day}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto w-full items-center custom-scrollbar scrollbar-hide">
                        {dayEvents.map(ev => (
                          <div 
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                              setIsCreateOpen(false);
                            }}
                            className={`text-[9px] md:text-[10px] text-center w-full truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                              selectedEvent?.id === ev.id
                                ? "bg-red-500 text-white font-medium shadow-sm"
                                : "bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white"
                            }`}
                            title={ev.summary || "Untitled Event"}
                          >
                            {ev.summary || "Untitled Event"}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Right Pane: Selected Event Details View OR Scheduling Composer */}
        <div className={`${selectedEvent ? 'flex' : 'hidden'} md:flex absolute md:relative inset-0 z-40 md:w-[400px] flex-col h-full bg-neutral-950/95 md:bg-white/1 border-l border-white/10`}>
          
          {/* Mobile Back Button */}
          <button 
            onClick={() => { setSelectedEvent(null); setIsCreateOpen(false); }}
            className="md:hidden absolute top-4 left-4 z-50 p-2 rounded-full bg-white/10 text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {selectedEvent ? (
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
      </div>
    </div>
  );
}
