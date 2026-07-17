import React, { useState, useEffect } from "react";
import { 
  GraduationCap, BookOpen, Users, Award, MessageSquare, Plus, Trash2, Calendar, 
  UserCheck, Clock, ClipboardList, X, Loader2, LogOut, Cloud, CloudOff, Sparkles, BookMarked, ListTodo, Search, RefreshCw, Send, Save, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  courseState?: string;
  alternateLink?: string;
  creationTime?: string;
}

interface CourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  maxPoints?: number;
  workType?: "ASSIGNMENT" | "SHORT_ANSWER_QUESTION" | "MULTIPLE_CHOICE_QUESTION";
  state?: string;
  creationTime?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
}

interface Announcement {
  id: string;
  courseId: string;
  text: string;
  state?: string;
  creationTime?: string;
}

interface UserProfile {
  id: string;
  name: {
    fullName: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

interface ClassroomManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function ClassroomManager({ onClose, isGhostMode = false, onToast }: ClassroomManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Classroom data
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<"coursework" | "announcements" | "people">("coursework");
  const [isLoading, setIsLoading] = useState(false);
  const [apiMode, setApiMode] = useState<"real" | "fallback">("real");

  // Tab content states
  const [coursework, setCoursework] = useState<CourseWork[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isFetchingTabContent, setIsFetchingTabContent] = useState(false);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Create modals/forms
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseSection, setNewCourseSection] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseRoom, setNewCourseRoom] = useState("");

  // Post forms
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"announcement" | "coursework">("announcement");
  const [composeText, setComposeText] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composePoints, setComposePoints] = useState("100");
  const [composeDueDate, setComposeDueDate] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchCourses(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
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
        onToast("Google Classroom access authorized!");
        fetchCourses(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Ensure Google Classroom scopes are approved.");
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
      setCourses([]);
      setSelectedCourse(null);
      setCoursework([]);
      setAnnouncements([]);
      setTeachers([]);
      setStudents([]);
      setIsCreateCourseOpen(false);
      setIsComposeOpen(false);
      onToast("Signed out from Google Classroom.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch Classroom Courses
  const fetchCourses = async (accessToken: string, forceLocalMode = false) => {
    if (forceLocalMode) {
      loadFallbackData();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("https://classroom.googleapis.com/v1/courses?pageSize=20", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        // If 403 or 404 (consumer accounts have specific domain restrictions)
        if (response.status === 403 || response.status === 404) {
          console.log("Classroom API restricted to school domains. Activating premium local workspace fallback.");
          setApiMode("fallback");
          loadFallbackData();
          return;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const fetchedCourses = data.courses || [];
      setCourses(fetchedCourses);
      setApiMode("real");

      if (fetchedCourses.length > 0) {
        handleSelectCourse(fetchedCourses[0], accessToken);
      }
    } catch (err) {
      console.error("Error fetching Classroom courses:", err);
      setApiMode("fallback");
      loadFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackData = () => {
    const cached = localStorage.getItem("zoya_classroom_courses");
    if (cached) {
      const parsed = JSON.parse(cached);
      setCourses(parsed.courses || []);
      if (parsed.courses && parsed.courses.length > 0) {
        handleSelectCourse(parsed.courses[0], null, parsed);
      }
    } else {
      const initialCourses: Course[] = [
        {
          id: "crs-xenobiology",
          name: "ASTRO-420: Xenobiology & Lifeform Classification",
          section: "Section A",
          descriptionHeading: "Astrobiological Ecology",
          description: "Understanding organic chemistry configurations in extreme outer-space planetary ecosystems.",
          room: "Lab-Deck-9",
          courseState: "ACTIVE",
          creationTime: new Date().toISOString()
        },
        {
          id: "crs-navigation",
          name: "NAV-101: Quantum Slipstream Celestial Navigation",
          section: "Hangar Deck",
          descriptionHeading: "Warp Dynamics & Coordinates",
          description: "Hands-on calibration of multi-dimensional folding drives and relativistic time dilation equations.",
          room: "Bridge-Simulator-B",
          courseState: "ACTIVE",
          creationTime: new Date().toISOString()
        }
      ];

      const initialCoursework: CourseWork[] = [
        {
          id: "cw-xeno-1",
          courseId: "crs-xenobiology",
          title: "Assignment 1: Proxima b Flora Spectral Analysis",
          description: "Run infrared spectroscopy analysis on the foliage samples collected from the twilight zone. Predict photosynthesis efficiency.",
          maxPoints: 100,
          workType: "ASSIGNMENT",
          state: "PUBLISHED",
          creationTime: new Date().toISOString(),
          dueDate: {
            year: 2026,
            month: 7,
            day: 25
          }
        },
        {
          id: "cw-nav-1",
          courseId: "crs-navigation",
          title: "Laboratory exercise: Quantum Calibration",
          description: "Calibrate the ship's antimatter engine phase shifts. Align warp fields to mitigate chronoton leaks.",
          maxPoints: 50,
          workType: "ASSIGNMENT",
          state: "PUBLISHED",
          creationTime: new Date().toISOString(),
          dueDate: {
            year: 2026,
            month: 7,
            day: 30
          }
        }
      ];

      const initialAnnouncements: Announcement[] = [
        {
          id: "ann-xeno-1",
          courseId: "crs-xenobiology",
          text: "Attention Cadets: Reminding everyone that active bio-hazard suits are MANDATORY for tomorrow's live dissection lab. Secure your seals.",
          state: "PUBLISHED",
          creationTime: new Date().toISOString()
        },
        {
          id: "ann-nav-1",
          courseId: "crs-navigation",
          text: "Quantum simulators will be offline tonight for sub-space maintenance. Please formulate your transit coordinates on physical star-charts.",
          state: "PUBLISHED",
          creationTime: new Date().toISOString()
        }
      ];

      const initialTeachers: UserProfile[] = [
        {
          id: "prof-zoya",
          name: { fullName: "Professor Zoya AI" },
          emailAddress: "zoya.ai@zoya-federation.org",
          photoUrl: ""
        }
      ];

      const initialStudents: UserProfile[] = [
        {
          id: "std-vance",
          name: { fullName: "Cadet Sarah Vance" },
          emailAddress: "s.vance@cadet.zoya.org"
        },
        {
          id: "std-kane",
          name: { fullName: "Cadet Michael Kane" },
          emailAddress: "m.kane@cadet.zoya.org"
        },
        {
          id: "std-ria",
          name: { fullName: "Riyajul Ansari" },
          emailAddress: "riyajul.ansari@school.org"
        }
      ];

      const payload = {
        courses: initialCourses,
        coursework: initialCoursework,
        announcements: initialAnnouncements,
        teachers: initialTeachers,
        students: initialStudents
      };

      setCourses(initialCourses);
      localStorage.setItem("zoya_classroom_courses", JSON.stringify(payload));
      handleSelectCourse(initialCourses[0], null, payload);
    }
  };

  const handleSelectCourse = async (course: Course, currentToken: string | null = token, preloadedPayload?: any) => {
    setSelectedCourse(course);
    setIsFetchingTabContent(true);

    if (apiMode === "fallback" || !currentToken) {
      // Fallback local load
      const payload = preloadedPayload || JSON.parse(localStorage.getItem("zoya_classroom_courses") || "{}");
      const filteredCW = (payload.coursework || []).filter((cw: CourseWork) => cw.courseId === course.id);
      const filteredAnn = (payload.announcements || []).filter((ann: Announcement) => ann.courseId === course.id);
      
      setCoursework(filteredCW);
      setAnnouncements(filteredAnn);
      setTeachers(payload.teachers || []);
      setStudents(payload.students || []);
      setIsFetchingTabContent(false);
      return;
    }

    // Real API fetches
    try {
      const headers = { Authorization: `Bearer ${currentToken}` };

      // Parallelize Course details fetches
      const [cwRes, annRes, tRes, sRes] = await Promise.all([
        fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, { headers }).then(r => r.json().catch(() => ({}))),
        fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/announcements`, { headers }).then(r => r.json().catch(() => ({}))),
        fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/teachers`, { headers }).then(r => r.json().catch(() => ({}))),
        fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/students`, { headers }).then(r => r.json().catch(() => ({})))
      ]);

      setCoursework(cwRes.courseWork || []);
      setAnnouncements(annRes.announcements || []);
      
      setTeachers((tRes.teachers || []).map((t: any) => t.profile || t));
      setStudents((sRes.students || []).map((s: any) => s.profile || s));

    } catch (err) {
      console.error("Error loading course details from Classroom API:", err);
      onToast("Failed to fetch Google Classroom course components.");
    } finally {
      setIsFetchingTabContent(false);
    }
  };

  // Create Course
  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      onToast("Course title is required.");
      return;
    }

    setIsLoading(true);
    const newCourseObj: any = {
      name: newCourseName.trim(),
      section: newCourseSection.trim() || undefined,
      descriptionHeading: newCourseDesc.trim() || undefined,
      room: newCourseRoom.trim() || undefined,
      courseState: "ACTIVE"
    };

    try {
      if (apiMode === "real" && token) {
        const response = await fetch("https://classroom.googleapis.com/v1/courses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newCourseObj)
        });

        if (!response.ok) {
          throw new Error(`API failed to create course: ${response.status}`);
        }

        const created = await response.json();
        setCourses(prev => [created, ...prev]);
        handleSelectCourse(created, token);
        onToast(`Classroom "${created.name}" created successfully!`);
      } else {
        // Fallback local mode
        const localCourse: Course = {
          ...newCourseObj,
          id: `crs-local-${Date.now()}`,
          creationTime: new Date().toISOString()
        };

        const payload = JSON.parse(localStorage.getItem("zoya_classroom_courses") || "{}");
        payload.courses = [localCourse, ...(payload.courses || [])];
        localStorage.setItem("zoya_classroom_courses", JSON.stringify(payload));
        
        setCourses(payload.courses);
        handleSelectCourse(localCourse, null, payload);
        onToast(`Local class "${localCourse.name}" launched.`);
      }

      // Reset Form
      setNewCourseName("");
      setNewCourseSection("");
      setNewCourseDesc("");
      setNewCourseRoom("");
      setIsCreateCourseOpen(false);
    } catch (err) {
      console.error("Error creating course:", err);
      onToast("Could not create classroom. Checked restrictions.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Course
  const deleteCourse = async (courseId: string, courseName: string) => {
    const confirmed = window.confirm(`Permanently delete course "${courseName}"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      if (apiMode === "real" && token) {
        const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Classroom deletion failed");
        }

        const remaining = courses.filter(c => c.id !== courseId);
        setCourses(remaining);
        if (remaining.length > 0) {
          handleSelectCourse(remaining[0], token);
        } else {
          setSelectedCourse(null);
        }
        onToast(`Deleted course "${courseName}"`);
      } else {
        // Local fallback delete
        const payload = JSON.parse(localStorage.getItem("zoya_classroom_courses") || "{}");
        payload.courses = (payload.courses || []).filter((c: Course) => c.id !== courseId);
        payload.coursework = (payload.coursework || []).filter((cw: CourseWork) => cw.courseId !== courseId);
        payload.announcements = (payload.announcements || []).filter((ann: Announcement) => ann.courseId !== courseId);
        localStorage.setItem("zoya_classroom_courses", JSON.stringify(payload));

        setCourses(payload.courses);
        if (payload.courses.length > 0) {
          handleSelectCourse(payload.courses[0], null, payload);
        } else {
          setSelectedCourse(null);
        }
        onToast(`Removed local class "${courseName}"`);
      }
    } catch (err) {
      console.error("Error deleting course:", err);
      onToast("Failed to delete classroom course.");
    } finally {
      setIsLoading(false);
    }
  };

  // Compose / Post (Announcement or coursework)
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    if (composeType === "announcement" && !composeText.trim()) {
      onToast("Announcement text is required.");
      return;
    }
    if (composeType === "coursework" && !composeTitle.trim()) {
      onToast("Assignment title is required.");
      return;
    }

    setIsPosting(true);
    try {
      if (composeType === "announcement") {
        const announcementPayload = {
          text: composeText.trim(),
          state: "PUBLISHED"
        };

        if (apiMode === "real" && token) {
          const response = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourse.id}/announcements`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(announcementPayload)
          });

          if (!response.ok) throw new Error("API post announcement failed");
          const created = await response.json();
          setAnnouncements(prev => [created, ...prev]);
          onToast("Announcement shared on Google Classroom!");
        } else {
          // Fallback announcement
          const localAnn: Announcement = {
            id: `ann-local-${Date.now()}`,
            courseId: selectedCourse.id,
            text: composeText.trim(),
            state: "PUBLISHED",
            creationTime: new Date().toISOString()
          };

          const payload = JSON.parse(localStorage.getItem("zoya_classroom_courses") || "{}");
          payload.announcements = [localAnn, ...(payload.announcements || [])];
          localStorage.setItem("zoya_classroom_courses", JSON.stringify(payload));

          setAnnouncements(prev => [localAnn, ...prev]);
          onToast("Announcement dispatched to secure local feed!");
        }
      } else {
        // CourseWork / Assignment
        const points = parseInt(composePoints) || 100;
        let dueDateObj: any = undefined;

        if (composeDueDate) {
          const date = new Date(composeDueDate);
          dueDateObj = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
          };
        }

        const courseworkPayload: any = {
          title: composeTitle.trim(),
          description: composeText.trim() || undefined,
          maxPoints: points,
          workType: "ASSIGNMENT",
          state: "PUBLISHED",
          dueDate: dueDateObj
        };

        if (apiMode === "real" && token) {
          const response = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourse.id}/courseWork`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(courseworkPayload)
          });

          if (!response.ok) throw new Error("API coursework creation failed");
          const created = await response.json();
          setCoursework(prev => [created, ...prev]);
          onToast("Assignment posted successfully!");
        } else {
          // Fallback CourseWork
          const localCW: CourseWork = {
            id: `cw-local-${Date.now()}`,
            courseId: selectedCourse.id,
            title: composeTitle.trim(),
            description: composeText.trim() || undefined,
            maxPoints: points,
            workType: "ASSIGNMENT",
            state: "PUBLISHED",
            creationTime: new Date().toISOString(),
            dueDate: dueDateObj
          };

          const payload = JSON.parse(localStorage.getItem("zoya_classroom_courses") || "{}");
          payload.coursework = [localCW, ...(payload.coursework || [])];
          localStorage.setItem("zoya_classroom_courses", JSON.stringify(payload));

          setCoursework(prev => [localCW, ...prev]);
          onToast("Assignment published to class syllabus.");
        }
      }

      // Reset Compose
      setComposeText("");
      setComposeTitle("");
      setComposePoints("100");
      setComposeDueDate("");
      setIsComposeOpen(false);
    } catch (err) {
      console.error("Error creating post:", err);
      onToast("Failed to publish Classwork update.");
    } finally {
      setIsPosting(false);
    }
  };

  // Filter lists based on search query
  const filteredCourseWork = coursework.filter(cw => 
    cw.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (cw.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAnnouncements = announcements.filter(ann => 
    ann.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="classroom-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="classroom-manager-card"
        className={`w-full max-w-6xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
            : "bg-neutral-950/95 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
        }`}
      >
        {/* Hologram neon top bar accent */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 animate-pulse" />

        {/* Left Panel: Course list & Profile info */}
        <div className="w-full md:w-[260px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Classroom
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Federation Learning Hub</p>
              </div>
            </div>

            {/* Compose buttons */}
            {isAuthenticated && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsCreateCourseOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  <span>LAUNCH CLASS</span>
                </button>
              </div>
            )}

            {/* Active Mode details */}
            {isAuthenticated && (
              <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                apiMode === "real" 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                  : "bg-amber-500/5 border-amber-500/20 text-amber-400"
              }`}>
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider font-semibold">
                  {apiMode === "real" ? <Cloud size={11} /> : <CloudOff size={11} />}
                  <span>{apiMode === "real" ? "REAL TIME SYNC" : "SECURE FALLBACK MODE"}</span>
                </div>
                <p className="text-[9px] text-white/50 leading-relaxed font-sans">
                  {apiMode === "real" 
                    ? "Direct API links verify classroom coursework status live." 
                    : "School/organization domains restrict third-party access on consumer accounts. Operating premium sandbox workspace."}
                </p>
              </div>
            )}

            {/* Courses Navigation list */}
            {isAuthenticated && (
              <div className="space-y-3">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest px-1">Your Courses</p>
                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className={`group w-full flex items-center justify-between rounded-xl px-3 py-2 text-left font-sans text-xs cursor-pointer transition-all ${
                        selectedCourse?.id === course.id
                          ? "bg-emerald-500/15 border-l-2 border-emerald-500 text-white font-medium"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                      onClick={() => handleSelectCourse(course)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GraduationCap size={14} className={selectedCourse?.id === course.id ? "text-emerald-400" : "text-white/30"} />
                        <span className="truncate pr-2">{course.name}</span>
                      </div>
                      
                      {/* Delete Course */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCourse(course.id, course.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity shrink-0"
                        title="Delete Course"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <p className="text-[10px] font-mono text-white/35 text-center py-4">No enrolled courses</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile footer */}
          {isAuthenticated && firebaseUser && (
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
                  <div className="w-6.5 h-6.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] uppercase">
                    {firebaseUser.displayName?.charAt(0) || "G"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-white/30 leading-none">Cadet Officer</p>
                  <p className="text-[11px] font-medium text-white truncate mt-1">
                    {firebaseUser.displayName || firebaseUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full p-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer text-[10px] font-mono flex items-center justify-center gap-1.5"
              >
                <LogOut size={11} />
                <span>SIGN OUT</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Panel: Class Hub and Tabs */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Main header block */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={18} className="text-emerald-500 animate-pulse" />
                <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                  LEARNING CORES
                </h3>
                {isAuthenticated && selectedCourse && (
                  <button
                    onClick={() => handleSelectCourse(selectedCourse)}
                    className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw size={11} className={isFetchingTabContent ? "animate-spin text-emerald-400" : ""} />
                  </button>
                )}
              </div>

              {isAuthenticated && selectedCourse && (
                <div className="relative max-w-xs w-full md:w-64">
                  <Search size={12} className="absolute inset-y-0 left-3 mt-2.5 text-white/35" />
                  <input
                    type="text"
                    placeholder="Filter syllabus content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 text-white text-xs pl-8.5 pr-3 py-1.5 rounded-xl font-sans focus:outline-none transition-all placeholder:text-white/30"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 ml-4 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <GraduationCap size={28} className="text-emerald-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Classroom Hub</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed font-sans">
                Track enrolled galactic syllabuses, manage homework coursework assignments, submit tasks, post announcements, and sync class rosters securely.
              </p>
              
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="bg-white hover:bg-neutral-200 text-black py-2.5 px-5 rounded-xl font-medium tracking-wide shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center gap-3 text-xs"
              >
                {isSigningIn ? (
                  <Loader2 className="animate-spin text-black" size={15} />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Authorize Classroom</span>
              </button>
            </div>
          ) : selectedCourse ? (
            <div className="flex-1 flex flex-col h-[calc(100%-60px)] min-w-0">
              {/* Course Info Banner */}
              <div className="p-5 bg-white/2 border-b border-white/5 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                  {selectedCourse.section || "Active Course"}
                </span>
                <h4 className="text-base font-serif font-semibold text-white">
                  {selectedCourse.name}
                </h4>
                {selectedCourse.description && (
                  <p className="text-xs text-white/55 mt-1.5 leading-relaxed font-sans max-w-2xl font-light">
                    {selectedCourse.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-white/40">
                  {selectedCourse.room && (
                    <span className="flex items-center gap-1">
                      <BookMarked size={11} /> Room: <strong className="text-white/60">{selectedCourse.room}</strong>
                    </span>
                  )}
                  {selectedCourse.alternateLink && (
                    <a 
                      href={selectedCourse.alternateLink} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1.5"
                    >
                      Open Google Classroom Website ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex bg-neutral-900/40 border-b border-white/10 shrink-0 px-4">
                <button
                  onClick={() => setActiveTab("coursework")}
                  className={`py-3 px-4 font-mono text-xs tracking-wider border-b-2 transition-all relative flex items-center gap-2 ${
                    activeTab === "coursework" 
                      ? "border-emerald-500 text-white font-medium" 
                      : "border-transparent text-white/40 hover:text-white"
                  }`}
                >
                  <ListTodo size={12} />
                  <span>Syllabus (Assignments)</span>
                  {coursework.length > 0 && (
                    <span className="text-[9px] bg-white/10 text-white px-1.5 py-0.5 rounded-full">
                      {coursework.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("announcements")}
                  className={`py-3 px-4 font-mono text-xs tracking-wider border-b-2 transition-all relative flex items-center gap-2 ${
                    activeTab === "announcements" 
                      ? "border-emerald-500 text-white font-medium" 
                      : "border-transparent text-white/40 hover:text-white"
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>Stream (Announcements)</span>
                </button>
                <button
                  onClick={() => setActiveTab("people")}
                  className={`py-3 px-4 font-mono text-xs tracking-wider border-b-2 transition-all relative flex items-center gap-2 ${
                    activeTab === "people" 
                      ? "border-emerald-500 text-white font-medium" 
                      : "border-transparent text-white/40 hover:text-white"
                  }`}
                >
                  <Users size={12} />
                  <span>Roster (People)</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-5">
                {isFetchingTabContent ? (
                  <div className="h-48 flex flex-col items-center justify-center space-y-3 text-white/45 font-mono">
                    <Loader2 size={24} className="animate-spin text-emerald-500" />
                    <span>Querying classroom modules...</span>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {activeTab === "coursework" && (
                      <motion.div
                        key="coursework-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-mono text-white/45 uppercase tracking-widest">COURSEWORK SYLLABUS</h5>
                          <button
                            onClick={() => {
                              setComposeType("coursework");
                              setIsComposeOpen(true);
                            }}
                            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer border border-emerald-500/25 px-2.5 py-1 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Plus size={12} />
                            <span>POST ASSIGNMENT</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {filteredCourseWork.map((cw) => (
                            <div
                              key={cw.id}
                              className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-emerald-500/20 transition-colors flex flex-col md:flex-row justify-between md:items-start gap-4 group"
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mt-0.5 shrink-0">
                                  <ClipboardList size={16} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <h6 className="text-xs font-semibold text-white leading-normal">
                                    {cw.title}
                                  </h6>
                                  {cw.description && (
                                    <p className="text-[11px] text-white/55 font-light leading-relaxed mt-1 font-sans break-words whitespace-pre-wrap">
                                      {cw.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[9px] font-mono text-white/30">
                                    <span>MAX POINTS: <strong className="text-white/60">{cw.maxPoints || "Ungraded"}</strong></span>
                                    <span>TYPE: <strong className="text-white/60">{cw.workType || "ASSIGNMENT"}</strong></span>
                                    <span>STATE: <strong className="text-emerald-400/80">{cw.state || "PUBLISHED"}</strong></span>
                                  </div>
                                </div>
                              </div>

                              {/* Due dates block */}
                              {cw.dueDate && (
                                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-500/15 bg-rose-500/5 text-rose-400 text-[10px] font-mono self-start md:self-auto">
                                  <Clock size={11} />
                                  <span>
                                    Due: {cw.dueDate.month}/{cw.dueDate.day}/{cw.dueDate.year}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}

                          {filteredCourseWork.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/30">
                              <ClipboardList size={28} className="mx-auto text-white/10 mb-2" />
                              <p className="text-xs font-mono">No coursework assignments matched filter</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "announcements" && (
                      <motion.div
                        key="announcements-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-mono text-white/45 uppercase tracking-widest">CLASS FEED</h5>
                          <button
                            onClick={() => {
                              setComposeType("announcement");
                              setIsComposeOpen(true);
                            }}
                            className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer border border-emerald-500/25 px-2.5 py-1 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Plus size={12} />
                            <span>POST UPDATE</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {filteredAnnouncements.map((ann) => (
                            <div
                              key={ann.id}
                              className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-emerald-500/20 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mt-0.5 shrink-0">
                                  <MessageSquare size={14} />
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs text-white/80 leading-relaxed font-sans whitespace-pre-wrap break-words">
                                    {ann.text}
                                  </p>
                                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5 text-[9px] font-mono text-white/35">
                                    <span>ANNOUNCEMENT STREAM</span>
                                    <span>
                                      {ann.creationTime 
                                        ? new Date(ann.creationTime).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
                                        : "Static Record"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {filteredAnnouncements.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/30">
                              <MessageSquare size={28} className="mx-auto text-white/10 mb-2" />
                              <p className="text-xs font-mono">No stream announcements matched filter</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "people" && (
                      <motion.div
                        key="people-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {/* Teachers Section */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-2">TEACHERS</h5>
                          <div className="space-y-2">
                            {teachers.map((prof) => (
                              <div key={prof.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center font-mono text-emerald-400 text-xs font-bold uppercase shrink-0">
                                  {prof.name.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white truncate">{prof.name.fullName}</p>
                                  {prof.emailAddress && (
                                    <p className="text-[9px] font-mono text-white/40 truncate">{prof.emailAddress}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {teachers.length === 0 && (
                              <p className="text-[10px] text-white/30 font-mono py-2">No teachers mapped</p>
                            )}
                          </div>
                        </div>

                        {/* Students Section */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-2">CADETS (STUDENTS)</h5>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {students.map((student) => (
                              <div key={student.id} className="p-3 bg-white/2 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-mono text-teal-400 text-xs font-bold uppercase shrink-0">
                                  {student.name.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-white truncate">{student.name.fullName}</p>
                                  {student.emailAddress && (
                                    <p className="text-[9px] font-mono text-white/40 truncate">{student.emailAddress}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {students.length === 0 && (
                              <p className="text-[10px] text-white/30 font-mono py-2">No cadets enrolled</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/30">
              <GraduationCap size={32} className="opacity-20 mb-2 text-emerald-500/40 animate-pulse" />
              <p className="text-xs font-mono uppercase">Select or Launch a Course</p>
              <p className="text-[10px] mt-1 max-w-xs leading-normal">
                Course lists are restricted to approved domains. Select a course in the sidebar, or launch your own classroom to organize study modules.
              </p>
            </div>
          )}
        </div>

        {/* Modal: Create Course */}
        <AnimatePresence>
          {isCreateCourseOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-neutral-950 border border-emerald-500/50 rounded-2xl p-5 shadow-2xl relative"
              >
                <button
                  onClick={() => setIsCreateCourseOpen(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>

                <h4 className="text-sm font-mono text-emerald-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <GraduationCap size={16} />
                  <span>Launch Classroom</span>
                </h4>

                <form onSubmit={createCourse} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Class Title (Required)</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Xenobiology Level 2"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Section (E.g. Period or Sector)</label>
                    <input
                      type="text"
                      placeholder="E.g. Sector-9 Astro Range"
                      value={newCourseSection}
                      onChange={(e) => setNewCourseSection(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Syllabus Description Summary</label>
                    <textarea
                      placeholder="Describe what cadet students will learn in this course..."
                      rows={3}
                      value={newCourseDesc}
                      onChange={(e) => setNewCourseDesc(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Room or Station</label>
                    <input
                      type="text"
                      placeholder="E.g. Bridge Deck Lab"
                      value={newCourseRoom}
                      onChange={(e) => setNewCourseRoom(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
                    >
                      <Save size={13} />
                      <span>LAUNCH HUB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateCourseOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Compose Post (Announcement or coursework) */}
        <AnimatePresence>
          {isComposeOpen && selectedCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-neutral-950 border border-emerald-500/50 rounded-2xl p-5 shadow-2xl relative"
              >
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>

                <h4 className="text-sm font-mono text-emerald-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles size={16} />
                  <span>Create Syllabus Material</span>
                </h4>

                <form onSubmit={handlePost} className="space-y-4">
                  {/* Selector */}
                  <div className="grid grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setComposeType("announcement")}
                      className={`py-2 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                        composeType === "announcement" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                      }`}
                    >
                      STREAM UPDATE
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeType("coursework")}
                      className={`py-2 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                        composeType === "coursework" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white"
                      }`}
                    >
                      ASSIGNMENT TASK
                    </button>
                  </div>

                  {composeType === "coursework" && (
                    <>
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Assignment Title</label>
                        <input
                          type="text"
                          required
                          placeholder="E.g., Spectroscopy Lab Report"
                          value={composeTitle}
                          onChange={(e) => setComposeTitle(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Max Points</label>
                          <input
                            type="number"
                            placeholder="100"
                            value={composePoints}
                            onChange={(e) => setComposePoints(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Due Date</label>
                          <input
                            type="date"
                            value={composeDueDate}
                            onChange={(e) => setComposeDueDate(e.target.value)}
                            className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-mono"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">
                      {composeType === "coursework" ? "Instructions & Description" : "Announcement Update Content"}
                    </label>
                    <textarea
                      required={composeType === "announcement"}
                      placeholder={composeType === "coursework" ? "Provide complete instruction guidelines for cadets..." : "Post information updates directly to the stream..."}
                      rows={5}
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500/50 font-sans resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={isPosting}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
                    >
                      {isPosting ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                      <span>PUBLISH STREAM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsComposeOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
