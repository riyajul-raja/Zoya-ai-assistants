import React, { useState, useEffect } from "react";
import { 
  CheckSquare, Square, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, ListTodo, Calendar, AlignLeft, Edit, PlusCircle, CheckCircle2,
  Cloud, CloudOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout, getAccessToken 
} from "../services/firebaseService";

interface TaskList {
  id: string;
  title: string;
  updated?: string;
}

interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  completed?: string;
}

interface TasksManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function TasksManager({ onClose, isGhostMode = false, onToast }: TasksManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [apiMode, setApiMode] = useState<"real" | "fallback">("real");

  // Task lists state
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Create Task Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Editing / Toggling state
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const loadFallbackTasks = () => {
    setApiMode("fallback");
    setTaskLists([{ id: "local-list-1", title: "Zoya Tasks" }]);
    setSelectedListId("local-list-1");
    
    const cached = localStorage.getItem("zoya_tasks");
    if (cached) {
      setTasks(JSON.parse(cached));
    } else {
      const initialTasks: TaskItem[] = [
        {
          id: "local-task-1",
          title: "Complete Zoya Workspace Integration",
          notes: "Verify all components have universal close buttons and offline-first premium storage capabilities.",
          status: "needsAction",
          due: new Date().toISOString()
        },
        {
          id: "local-task-2",
          title: "Verify AI Neural Calibrations",
          notes: "Thermal parameters are balanced. Operator checkpoint confirmed.",
          status: "completed",
          due: new Date().toISOString()
        }
      ];
      setTasks(initialTasks);
      localStorage.setItem("zoya_tasks", JSON.stringify(initialTasks));
    }
  };

  const saveFallbackTasksToStore = (updated: TaskItem[]) => {
    setTasks(updated);
    localStorage.setItem("zoya_tasks", JSON.stringify(updated));
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
        fetchTaskLists(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
        loadFallbackTasks();
      }
    );

    // Sync with Zoya AI commands
    window.addEventListener("zoya_tasks_updated", loadFallbackTasks);

    return () => {
      unsubscribe();
      window.removeEventListener("zoya_tasks_updated", loadFallbackTasks);
    };
  }, []);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        onToast("Google Tasks authorized successfully!");
        fetchTaskLists(result.accessToken);
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
      setTaskLists([]);
      setTasks([]);
      setSelectedTask(null);
      setIsCreateOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch lists
  const fetchTaskLists = async (accessToken: string) => {
    if (!accessToken) {
      loadFallbackTasks();
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        throw new Error("Failed to load task lists");
      }
      const data = await response.json();
      const lists = data.items || [];
      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedListId(lists[0].id);
        fetchTasks(accessToken, lists[0].id);
      }
    } catch (err) {
      console.error("Error loading task lists, falling back:", err);
      loadFallbackTasks();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tasks
  const fetchTasks = async (accessToken: string, listId: string) => {
    if (!listId) return;
    if (!accessToken || apiMode === "fallback") {
      loadFallbackTasks();
      return;
    }
    setIsLoading(true);
    try {
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }
      const data = await response.json();
      setTasks(data.items || []);
    } catch (err) {
      console.error("Error loading tasks, falling back:", err);
      loadFallbackTasks();
    } finally {
      setIsLoading(false);
    }
  };

  // Change active list
  const handleSelectClass = (listId: string) => {
    setSelectedListId(listId);
    setSelectedTask(null);
    setIsCreateOpen(false);
    if (token && apiMode === "real") {
      fetchTasks(token, listId);
    } else {
      loadFallbackTasks();
    }
  };

  // Create new task list
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newListTitle.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to create list");
      }

      const newList = await response.json();
      onToast(`Task list "${newList.title}" created.`);
      setNewListTitle("");
      setIsCreatingList(false);
      
      // Update local task lists and switch
      const updatedLists = [...taskLists, newList];
      setTaskLists(updatedLists);
      setSelectedListId(newList.id);
      fetchTasks(token, newList.id);
    } catch (err) {
      console.error("Error creating list:", err);
      onToast("Failed to create Google Tasks list.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete task list
  const handleDeleteList = async (listId: string, listTitle: string) => {
    if (!token) return;
    const confirmed = window.confirm(`Are you sure you want to delete the task list "${listTitle}"? This will delete all tasks inside it.`);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch(`https://tasks.googleapis.com/tasks/v1/users/@me/lists/${listId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete list");
      }

      onToast(`Deleted list "${listTitle}".`);
      const filtered = taskLists.filter((l) => l.id !== listId);
      setTaskLists(filtered);
      
      if (filtered.length > 0) {
        setSelectedListId(filtered[0].id);
        fetchTasks(token, filtered[0].id);
      } else {
        setSelectedListId("");
        setTasks([]);
      }
      setSelectedTask(null);
    } catch (err) {
      console.error("Error deleting list:", err);
      onToast("Failed to delete task list.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle task completed status
  const handleToggleTaskStatus = async (task: TaskItem) => {
    if (!token || apiMode === "fallback") {
      const newStatus = task.status === "completed" ? "needsAction" : "completed";
      const updated = tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t));
      saveFallbackTasksToStore(updated);
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
      onToast(newStatus === "completed" ? "Task marked as completed." : "Task reopened.");
      return;
    }
    setIsUpdatingId(task.id);

    const newStatus = task.status === "completed" ? "needsAction" : "completed";
    
    try {
      // Correct endpoint: PATCH https://tasks.googleapis.com/tasks/v1/lists/{tasklist}/tasks/{task}
      const response = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: newStatus,
            completed: newStatus === "completed" ? new Date().toISOString() : null
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      const updatedTask = await response.json();
      
      // Update state locally
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
      onToast(newStatus === "completed" ? "Task marked as completed." : "Task reopened.");
    } catch (err) {
      console.error("Error updating task:", err);
      onToast("Failed to update task status.");
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Delete task
  const handleDeleteTask = async (task: TaskItem) => {
    const confirmed = window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`);
    if (!confirmed) return;

    if (!token || apiMode === "fallback") {
      const updated = tasks.filter((t) => t.id !== task.id);
      saveFallbackTasksToStore(updated);
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
      onToast("Task deleted.");
      return;
    }
    setIsDeletingId(task.id);

    try {
      const response = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks/${task.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      onToast("Task deleted.");
      setTasks(tasks.filter((t) => t.id !== task.id));
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      onToast("Failed to delete task.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Create new task inside active list
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || (!token && apiMode === "real") || !selectedListId) {
      onToast("Please supply a task title.");
      return;
    }

    if (!token || apiMode === "fallback") {
      const newTask: TaskItem = {
        id: `local-task-${Date.now()}`,
        title: taskTitle.trim(),
        notes: taskNotes.trim(),
        status: "needsAction",
        due: taskDueDate ? new Date(taskDueDate).toISOString() : undefined
      };
      const updated = [newTask, ...tasks];
      saveFallbackTasksToStore(updated);
      onToast("Task added successfully.");
      setIsCreateOpen(false);
      setTaskTitle("");
      setTaskNotes("");
      setTaskDueDate("");
      return;
    }

    setIsCreating(true);
    try {
      const payload: any = {
        title: taskTitle.trim(),
        notes: taskNotes.trim()
      };

      if (taskDueDate) {
        // Due dates in google tasks must be formatted as RFC 3339 timestamp (e.g. 2026-07-17T00:00:00.000Z)
        payload.due = new Date(taskDueDate).toISOString();
      }

      const response = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const createdTask = await response.json();
      onToast("Task added successfully.");
      setTasks([createdTask, ...tasks]);
      setIsCreateOpen(false);
      setTaskTitle("");
      setTaskNotes("");
      setTaskDueDate("");
    } catch (err) {
      console.error("Error creating task:", err);
      onToast("Failed to add task.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = showCompleted || t.status === "needsAction";
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="tasks-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="tasks-manager-card"
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

        {/* Left Side: Lists Drawer and Profile */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Tasks
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Task Synapse Engine</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setSelectedTask(null);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>ADD TASK</span>
              </button>
            )}

            {/* List Navigation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                <span>Task Lists</span>
                {isAuthenticated && !isCreatingList && (
                  <button 
                    onClick={() => setIsCreatingList(true)}
                    className="hover:text-red-400 transition-colors"
                    title="New Task List"
                  >
                    <PlusCircle size={13} />
                  </button>
                )}
              </div>

              {/* Quick inline List Creator */}
              {isCreatingList && (
                <form onSubmit={handleCreateList} className="space-y-2 p-2 rounded-xl bg-white/5 border border-white/10 animate-fade-in">
                  <input
                    type="text"
                    required
                    placeholder="List Title..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="w-full bg-transparent border-b border-white/20 pb-1 text-xs text-white focus:outline-none focus:border-red-500/50"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="submit"
                      className="text-[9px] font-mono bg-red-600 px-2 py-1 rounded text-white hover:bg-red-700"
                    >
                      SAVE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingList(false);
                        setNewListTitle("");
                      }}
                      className="text-[9px] font-mono bg-white/5 px-2 py-1 rounded text-white/60 hover:bg-white/10"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1">
                {taskLists.map((lst) => (
                  <div
                    key={lst.id}
                    className={`group w-full flex items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs cursor-pointer transition-colors ${
                      selectedListId === lst.id
                        ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => handleSelectClass(lst.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ListTodo size={14} className={selectedListId === lst.id ? "text-red-400" : "text-white/30"} />
                      <span className="truncate">{lst.title}</span>
                    </div>
                    
                    {/* Delete list button */}
                    {taskLists.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(lst.id, lst.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity"
                        title="Delete List"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile Footer */}
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
                  <div className="w-6.5 h-6.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] uppercase">
                    {firebaseUser.displayName?.charAt(0) || "G"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[9px] text-white/30 leading-none">Task Owner</p>
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
          )}
        </div>

        {/* Center Pane: Tasks list */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ListTodo size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                {taskLists.find(l => l.id === selectedListId)?.title || "TASKS"} LISTING
              </h3>
              {isAuthenticated && (
                <button
                  onClick={() => fetchTasks(token!, selectedListId)}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Tasks"
                >
                  <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          {apiMode === "fallback" && (
            <div className="p-3 bg-red-950/40 border-b border-red-500/20 text-[11px] text-red-300 font-mono flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <CloudOff size={13} className="animate-pulse" />
                <span>Running in premium Offline-First local storage mode. Connect Google Account to sync live tasks.</span>
              </div>
              <button 
                onClick={handleLogin} 
                disabled={isSigningIn}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] tracking-wide font-sans cursor-pointer transition-all flex items-center gap-1.5"
              >
                {isSigningIn && <Loader2 size={10} className="animate-spin" />}
                <span>CONNECT</span>
              </button>
            </div>
          )}

          <>
              {/* Filter bar */}
              <div className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2 items-center">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
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

                {/* Show completed Toggle */}
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`border rounded-xl px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                    showCompleted 
                      ? "bg-red-500/10 border-red-500/40 text-red-400" 
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {showCompleted ? "SHOWING COMPLETED" : "HIDING COMPLETED"}
                </button>
              </div>

              {/* Tasks List Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isLoading && filteredTasks.length === 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={28} />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <ListTodo size={32} className="opacity-35 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No Tasks Found</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Add a task or toggle the "HIDING COMPLETED" state to show finished items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsCreateOpen(false);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden group hover:border-white/10 hover:bg-white/4 ${
                          selectedTask?.id === task.id
                            ? "bg-red-500/10 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                            : "bg-white/2 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Complete Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskStatus(task);
                            }}
                            disabled={isUpdatingId === task.id}
                            className="p-1 text-white/50 hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer shrink-0"
                          >
                            {isUpdatingId === task.id ? (
                              <Loader2 size={15} className="animate-spin text-red-400" />
                            ) : task.status === "completed" ? (
                              <CheckSquare size={16} className="text-red-500" />
                            ) : (
                              <Square size={16} className="text-white/40" />
                            )}
                          </button>

                          {/* Task Content Text */}
                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-medium block truncate ${
                              task.status === "completed" 
                                ? "text-white/30 line-through font-normal" 
                                : "text-white"
                            }`}>
                              {task.title || "(No Title)"}
                            </span>
                            {task.due && (
                              <span className="text-[9px] font-mono text-red-400/80 flex items-center gap-1 mt-0.5">
                                <Calendar size={9} />
                                <span>Due: {new Date(task.due).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            disabled={isDeletingId === task.id}
                            className="p-1 rounded hover:bg-red-500/25 text-white/40 hover:text-red-400"
                            title="Delete Task"
                          >
                            {isDeletingId === task.id ? (
                              <Loader2 size={10} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          </div>

        {/* Right Pane: Selected Task Viewer OR Compose Form */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* Task Composer Form */
                <motion.form
                  key="task-composer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateTask}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Add New Task
                      </h3>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Complete intelligence reports"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Due Date (Optional)</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Task Notes</label>
                      <textarea
                        placeholder="Add checklist notes, requirements, links..."
                        rows={6}
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreating || !taskTitle.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>SAVE TASK</span>
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
              ) : selectedTask ? (
                /* Selected Task Details Viewer */
                <motion.div
                  key="task-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div>
                      <h3 className={`text-sm font-medium text-white leading-relaxed break-words ${
                        selectedTask.status === "completed" ? "line-through text-white/40" : ""
                      }`}>
                        {selectedTask.title}
                      </h3>
                      
                      <div className="mt-4 space-y-3 border-t border-b border-white/5 py-4 text-[11px] font-mono text-white/50">
                        <div className="flex gap-2.5 items-center">
                          <CheckCircle2 size={12} className={selectedTask.status === "completed" ? "text-red-500" : "text-white/30"} />
                          <span className="text-white/80">
                            Status: <strong className="uppercase font-semibold">{selectedTask.status === "completed" ? "Completed" : "Needs Action"}</strong>
                          </span>
                        </div>
                        {selectedTask.due && (
                          <div className="flex gap-2.5 items-center">
                            <Calendar size={12} className="text-red-400" />
                            <span className="text-white/80">
                              Due: {new Date(selectedTask.due).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {selectedTask.completed && (
                          <div className="flex gap-2.5 items-center animate-fade-in">
                            <CheckSquare size={12} className="text-emerald-500" />
                            <span className="text-emerald-400">
                              Completed: {new Date(selectedTask.completed).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes block */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/30 uppercase">
                        <AlignLeft size={10} />
                        <span>Description Notes</span>
                      </div>
                      <div className="bg-neutral-900/60 rounded-xl p-4 border border-white/5 whitespace-pre-wrap font-sans text-xs text-white/80 leading-relaxed min-h-[100px]">
                        {selectedTask.notes || "No additional notes specified for this task."}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 flex gap-2">
                    <button
                      onClick={() => handleToggleTaskStatus(selectedTask)}
                      disabled={isUpdatingId === selectedTask.id}
                      className="flex-1 py-2.5 px-3 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-xs font-mono flex items-center justify-center gap-2"
                    >
                      {isUpdatingId === selectedTask.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : selectedTask.status === "completed" ? (
                        <Square size={12} />
                      ) : (
                        <CheckSquare size={12} />
                      )}
                      <span>
                        {selectedTask.status === "completed" ? "REOPEN TASK" : "MARK COMPLETE"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleDeleteTask(selectedTask)}
                      disabled={isDeletingId === selectedTask.id}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-red-500/15 hover:border-red-500/30 text-white/80 hover:text-red-400 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Empty Selection Placeholder */
                <motion.div
                  key="select-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <ListTodo size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No task selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select any task to review notes, check due dates, switch list headers, and process completions.
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
