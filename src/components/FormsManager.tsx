import React, { useState, useEffect, useRef } from "react";
import { 
  FileSpreadsheet, ClipboardList, Search, Trash2, Plus, X, Loader2, LogOut, 
  RefreshCw, Check, Send, AlertCircle, Play, ExternalLink, HelpCircle,
  FileEdit, AlignLeft, Calendar, FileDown, BookOpen, PenTool, Layers, CheckSquare,
  HelpCircle as QuestionIcon, PlusCircle, User, Users, ChevronRight, Eye, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout 
} from "../services/firebaseService";

interface FormFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  responderUri?: string;
}

interface FormItem {
  itemId: string;
  title?: string;
  description?: string;
  questionItem?: {
    question?: {
      questionId: string;
      required?: boolean;
      choiceQuestion?: {
        type: "RADIO" | "CHECKBOX" | "DROP_DOWN";
        options: Array<{ value: string }>;
      };
      textQuestion?: {
        paragraph?: boolean;
      };
    };
  };
}

interface GoogleFormDetails {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  responderUri: string;
  linkedSheetId?: string;
  items?: FormItem[];
}

interface FormResponseAnswer {
  questionId: string;
  textAnswers?: {
    answers?: Array<{ value: string }>;
  };
}

interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers?: Record<string, FormResponseAnswer>;
}

interface FormsManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function FormsManager({ onClose, isGhostMode = false, onToast }: FormsManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Lists state
  const [forms, setForms] = useState<FormFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected form and details
  const [selectedForm, setSelectedForm] = useState<FormFile | null>(null);
  const [formDetails, setFormDetails] = useState<GoogleFormDetails | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  // Form Responses
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  // Tab state in Center (Structure vs Responses)
  const [centerTab, setCenterTab] = useState<"structure" | "responses">("structure");

  // Creation form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Add Question form state
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionType, setQuestionType] = useState<"TEXT" | "PARAGRAPH" | "RADIO" | "CHECKBOX">("TEXT");
  const [questionOptions, setQuestionOptions] = useState<string>("");
  const [isQuestionRequired, setIsQuestionRequired] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Deletion tracking
  const [isDeletingFormId, setIsDeletingFormId] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchForms(cachedToken);
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
        onToast("Google Forms access authorized!");
        fetchForms(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Authentication failed. Ensure Google Account scopes are approved.");
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
      setForms([]);
      setSelectedForm(null);
      setFormDetails(null);
      setResponses([]);
      setIsCreateOpen(false);
      setIsAddQuestionOpen(false);
      onToast("Signed out from Google Account.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch Google Forms from Drive API
  const fetchForms = async (accessToken: string, filterStr = "") => {
    setIsLoading(true);
    try {
      let q = "mimeType = 'application/vnd.google-apps.form' and trashed = false";
      if (filterStr) {
        q += ` and name contains '${filterStr.replace(/'/g, "\\'")}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=45`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to search forms in Drive");
      }

      const data = await response.json();
      setForms(data.files || []);
    } catch (err) {
      console.error("Error listing forms:", err);
      onToast("Failed to fetch Google Forms files.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch individual Form structure and details
  const loadFormDetails = async (formId: string, accessToken: string) => {
    setIsLoadingForm(true);
    try {
      const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve Form specifications");
      }

      const data = await response.json();
      setFormDetails(data);
    } catch (err) {
      console.error("Error loading form structure:", err);
      onToast("Could not download Form specifications.");
      setFormDetails(null);
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Fetch Form responses
  const loadFormResponses = async (formId: string, accessToken: string) => {
    setIsLoadingResponses(true);
    try {
      const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve responses");
      }

      const data = await response.json();
      setResponses(data.responses || []);
    } catch (err) {
      console.error("Error loading form responses:", err);
      setResponses([]);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const handleSelectForm = (form: FormFile) => {
    setSelectedForm(form);
    setIsCreateOpen(false);
    setIsAddQuestionOpen(false);
    setCenterTab("structure");
    if (token) {
      loadFormDetails(form.id, token);
      loadFormResponses(form.id, token);
    }
  };

  // Create Google Form
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim() || !token) {
      onToast("Please supply a valid form title.");
      return;
    }

    setIsCreating(true);
    try {
      // Create metadata first
      const body: any = {
        info: {
          title: newFormTitle.trim()
        }
      };
      if (newFormDescription.trim()) {
        body.info.description = newFormDescription.trim();
      }

      const response = await fetch("https://forms.googleapis.com/v1/forms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error("Failed to create Google Form");
      }

      const createdForm = await response.json();
      onToast(`Form "${createdForm.info.title}" created successfully!`);
      setNewFormTitle("");
      setNewFormDescription("");
      setIsCreateOpen(false);

      // Add to listings
      const updatedFile: FormFile = {
        id: createdForm.formId,
        name: createdForm.info.title,
        mimeType: "application/vnd.google-apps.form",
        modifiedTime: new Date().toISOString(),
        responderUri: createdForm.responderUri
      };

      setForms([updatedFile, ...forms]);
      handleSelectForm(updatedFile);
    } catch (err) {
      console.error("Error creating form:", err);
      onToast("Failed to create Google Form.");
    } finally {
      setIsCreating(false);
    }
  };

  // Add Question / Item to Form
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedForm || !questionTitle.trim()) return;

    setIsAddingQuestion(true);
    try {
      // Determine index based on existing item count
      const index = formDetails?.items?.length || 0;

      // Construct question choice objects if needed
      const isChoice = questionType === "RADIO" || questionType === "CHECKBOX";
      const choices = isChoice 
        ? questionOptions.split("\n").filter(o => o.trim()).map(val => ({ value: val.trim() }))
        : [];

      // Create item payload
      const item: any = {
        title: questionTitle.trim(),
        questionItem: {
          question: {
            required: isQuestionRequired
          }
        }
      };

      if (isChoice) {
        item.questionItem.question.choiceQuestion = {
          type: questionType,
          options: choices.length > 0 ? choices : [{ value: "Option 1" }]
        };
      } else {
        item.questionItem.question.textQuestion = {
          paragraph: questionType === "PARAGRAPH"
        };
      }

      const updateBody = {
        requests: [
          {
            createItem: {
              item: item,
              location: {
                index: index
              }
            }
          }
        ]
      };

      const response = await fetch(
        `https://forms.googleapis.com/v1/forms/${selectedForm.id}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updateBody)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to insert question item");
      }

      onToast("Question successfully added to Google Form!");
      setQuestionTitle("");
      setQuestionOptions("");
      setIsQuestionRequired(false);
      setIsAddQuestionOpen(false);

      // Reload form content
      loadFormDetails(selectedForm.id, token);
    } catch (err) {
      console.error("Error inserting question:", err);
      onToast("Could not append question to Google Form.");
    } finally {
      setIsAddingQuestion(false);
    }
  };

  // Delete Google Form from Drive
  const handleDeleteForm = async (form: FormFile) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete Google Form "${form.name}"? This will trash it from your Drive.`);
    if (!confirmed) return;

    if (!token) return;
    setIsDeletingFormId(form.id);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${form.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete form file");
      }

      onToast(`"${form.name}" deleted from Google Drive.`);
      setForms(forms.filter((f) => f.id !== form.id));
      if (selectedForm?.id === form.id) {
        setSelectedForm(null);
        setFormDetails(null);
        setResponses([]);
      }
    } catch (err) {
      console.error("Error deleting form:", err);
      onToast("Could not delete form from Google Drive.");
    } finally {
      setIsDeletingFormId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchForms(token, searchQuery);
    }
  };

  return (
    <div id="forms-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="forms-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Hologram top edge strip line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Side: Forms Drawer */}
        <div className="w-full md:w-[240px] border-r border-white/10 shrink-0 bg-white/2 flex flex-col justify-between h-full">
          <div className="p-5 flex flex-col h-[calc(100%-70px)] overflow-y-auto space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="text-lg font-serif font-medium text-white tracking-wide">
                  Zoya Forms
                </h2>
                <p className="text-[9px] font-mono text-white/40 uppercase">Survey System</p>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setSelectedForm(null);
                  setFormDetails(null);
                  setResponses([]);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl font-mono text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>NEW FORM</span>
              </button>
            )}

            {/* Form list items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                <span>Google Forms</span>
              </div>

              <div className="space-y-1">
                {forms.map((f) => (
                  <div
                    key={f.id}
                    className={`group w-full flex items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs cursor-pointer transition-colors ${
                      selectedForm?.id === f.id
                        ? "bg-red-500/15 border-l-2 border-red-500 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={() => handleSelectForm(f)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ClipboardList size={14} className={selectedForm?.id === f.id ? "text-red-400" : "text-white/30"} />
                      <span className="truncate">{f.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(f);
                      }}
                      disabled={isDeletingFormId === f.id}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/35 transition-opacity"
                      title="Delete Form"
                    >
                      {isDeletingFormId === f.id ? (
                        <Loader2 size={11} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profile footer */}
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
                  <p className="text-[9px] text-white/30 leading-none">Supervisor</p>
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

        {/* Center Panel: Forms Inspector */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ClipboardList size={18} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-mono text-white uppercase tracking-widest">
                FORM CONTROL CENTER
              </h3>
              {isAuthenticated && (
                <button
                  onClick={() => token && fetchForms(token, searchQuery)}
                  disabled={isLoading}
                  className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Reload Google Forms"
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

          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <ClipboardList size={28} className="text-red-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Forms Authorization Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Account to authorize body creation, survey responses, question insertion, and workspace telemetry monitoring.
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
                <span>Connect Google Forms</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <form onSubmit={handleSearchSubmit} className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search surveys..."
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

              {/* Form Details Viewer */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {isLoadingForm ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-xs font-mono text-white/40 uppercase">Downloading form draft structure...</p>
                  </div>
                ) : formDetails ? (
                  <div className="w-full flex-1 flex flex-col space-y-6">
                    {/* Control Tab Buttons (Structure vs Responses) */}
                    <div className="flex gap-2 border-b border-white/10 pb-3">
                      <button
                        onClick={() => setCenterTab("structure")}
                        className={`px-4 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          centerTab === "structure"
                            ? "bg-red-500/15 border border-red-500/30 text-white"
                            : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        <Layers size={13} />
                        <span>Survey Items ({formDetails.items?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => setCenterTab("responses")}
                        className={`px-4 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          centerTab === "responses"
                            ? "bg-red-500/15 border border-red-500/30 text-white"
                            : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        <Activity size={13} />
                        <span>Submissions ({responses.length})</span>
                      </button>
                    </div>

                    {centerTab === "structure" ? (
                      /* STRUCTURE VIEW */
                      <div className="space-y-4">
                        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 relative shadow-2xl space-y-4">
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none rounded-2xl" />

                          <div className="relative z-10 space-y-1">
                            <span className="text-[9px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                              METADATA
                            </span>
                            <h2 className="text-base font-serif font-semibold text-white mt-2 leading-snug">
                              {formDetails.info.title}
                            </h2>
                            {formDetails.info.description && (
                              <p className="text-xs text-white/65 italic leading-relaxed mt-1">
                                {formDetails.info.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Question Elements list */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                            Form Questions Stack
                          </h4>

                          {formDetails.items && formDetails.items.length > 0 ? (
                            formDetails.items.map((item, index) => {
                              const q = item.questionItem?.question;
                              const isChoice = !!q?.choiceQuestion;
                              const options = q?.choiceQuestion?.options || [];

                              return (
                                <div 
                                  key={item.itemId || index}
                                  className="p-4 rounded-xl bg-white/3 border border-white/5 flex gap-3.5 items-start relative hover:border-red-500/30 transition-all"
                                >
                                  <div className="p-1.5 rounded-lg bg-red-600/15 text-red-400 font-mono text-xs shrink-0 mt-0.5">
                                    {index + 1}
                                  </div>

                                  <div className="space-y-2 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-white block truncate">
                                        {item.title || "Untitled Question Item"}
                                      </span>
                                      {q?.required && (
                                        <span className="text-[8px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-1.5 py-0.2 rounded uppercase">
                                          Required
                                        </span>
                                      )}
                                    </div>

                                    {item.description && (
                                      <p className="text-[10px] text-white/50">{item.description}</p>
                                    )}

                                    {/* Question Options / Type Spec */}
                                    {isChoice ? (
                                      <div className="space-y-1.5 pl-1.5">
                                        {options.map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center gap-2 text-[11px] text-white/75 font-mono">
                                            {q.choiceQuestion?.type === "CHECKBOX" ? (
                                              <CheckSquare size={11} className="text-white/30" />
                                            ) : (
                                              <div className="w-2.5 h-2.5 rounded-full border border-white/30 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-0 group-hover:opacity-100" />
                                              </div>
                                            )}
                                            <span>{opt.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="h-6.5 w-full bg-white/5 border border-white/5 rounded-lg flex items-center px-2 text-[10px] text-white/30 italic font-mono">
                                        {q?.textQuestion?.paragraph ? "Multiline Paragraph Input" : "Short Text Input"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/30 font-mono text-xs">
                              No questions loaded inside this Google Form. Use the creator pane on the right to append survey inputs.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* RESPONSES VIEW */
                      <div className="space-y-4">
                        {isLoadingResponses ? (
                          <div className="flex items-center gap-2 py-6 justify-center">
                            <Loader2 size={13} className="animate-spin text-red-500" />
                            <span className="text-[11px] font-mono text-white/30 uppercase">Downloading survey response telemetry...</span>
                          </div>
                        ) : responses.length > 0 ? (
                          <div className="space-y-3.5">
                            {responses.map((resp, idx) => {
                              const dateStr = resp.lastSubmittedTime ? new Date(resp.lastSubmittedTime).toLocaleString() : "Unknown date";
                              return (
                                <div 
                                  key={resp.responseId || idx}
                                  className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3.5"
                                >
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <User size={12} className="text-red-400" />
                                      <span className="text-[10px] font-mono text-white font-bold">
                                        Response #{responses.length - idx}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-white/40">
                                      {dateStr}
                                    </span>
                                  </div>

                                  {/* Answers Grid */}
                                  <div className="space-y-2">
                                    {formDetails.items?.map((item, qIdx) => {
                                      const qId = item.questionItem?.question?.questionId;
                                      const answer = qId ? resp.answers?.[qId] : null;
                                      const ansVal = answer?.textAnswers?.answers?.map(a => a.value).join(", ") || "";

                                      return (
                                        <div key={qIdx} className="text-xs flex gap-2">
                                          <div className="text-[10px] font-mono text-white/40 w-1/3 truncate">
                                            {item.title || "Question"}
                                          </div>
                                          <div className="text-white/85 font-mono flex-1 bg-white/5 px-2 py-1 rounded">
                                            {ansVal ? ansVal : <em className="text-white/20">No response</em>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center rounded-xl border border-dashed border-white/10 text-white/30 font-mono text-xs">
                            No submission telemetry detected. Share your responder link to gather audience inputs.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <ClipboardList size={36} className="opacity-35 mb-2 text-red-500/40" />
                    <p className="text-xs font-mono uppercase tracking-wider">No survey selected</p>
                    <p className="text-[10px] mt-1 max-w-xs leading-normal">
                      Select a Google Form draft from the left sidebar or initialize a new blank layout template to configure input elements and inspect response submissions.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side Control: Form Composer Panel */}
        <div className="hidden md:flex md:w-[400px] flex-col h-full bg-white/1 border-l border-white/10 relative">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 h-full flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {isCreateOpen ? (
                /* CREATE FORM METADATA PANEL */
                <motion.form
                  key="create-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateForm}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Create Google Form
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Survey Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., Synapse Product Feedback"
                        value={newFormTitle}
                        onChange={(e) => setNewFormTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Description (Optional)</label>
                      <textarea
                        placeholder="Provide details about the survey objectives or response instructions..."
                        rows={3}
                        value={newFormDescription}
                        onChange={(e) => setNewFormDescription(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 resize-none font-sans"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase">
                        <HelpCircle size={10} />
                        <span>Google Forms Integration</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                        This builds a standard interactive Google Form draft directly inside Google Drive. Once constructed, you can configure items, add questions, and gather real-time feedback immediately.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreating || !newFormTitle.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>CREATE FORM</span>
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
              ) : isAddQuestionOpen && selectedForm ? (
                /* ADD NEW QUESTION PANEL */
                <motion.form
                  key="add-question-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleAddQuestion}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4 overflow-y-auto max-h-[80%] pr-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-mono text-red-500 font-bold uppercase tracking-wider">
                        Append Survey Question
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Question Title</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g., What is your primary objective?"
                        value={questionTitle}
                        onChange={(e) => setQuestionTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Input Field Type</label>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-red-500/50 font-mono"
                      >
                        <option value="TEXT">Short Text Field</option>
                        <option value="PARAGRAPH">Multiline Paragraph</option>
                        <option value="RADIO">Single Choice (Radio Buttons)</option>
                        <option value="CHECKBOX">Multiple Choice (Checkboxes)</option>
                      </select>
                    </div>

                    {(questionType === "RADIO" || questionType === "CHECKBOX") && (
                      <div>
                        <label className="block text-[9px] font-mono text-white/50 uppercase mb-1">Choices (one per line)</label>
                        <textarea
                          required
                          placeholder={`Option 1\nOption 2\nOption 3`}
                          rows={4}
                          value={questionOptions}
                          onChange={(e) => setQuestionOptions(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 font-mono leading-relaxed"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5">
                      <span className="text-[10px] font-mono text-white/60">Mark question as Required?</span>
                      <button
                        type="button"
                        onClick={() => setIsQuestionRequired(!isQuestionRequired)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${isQuestionRequired ? "bg-red-600 justify-end" : "bg-neutral-800 justify-start"}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isAddingQuestion || !questionTitle.trim()}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAddingQuestion ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <PlusCircle size={12} />
                          <span>APPEND QUESTION</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddQuestionOpen(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </motion.form>
              ) : selectedForm && formDetails ? (
                /* SURVEY DETAILS SUMMARY PANEL */
                <motion.div
                  key="form-overview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">Active Survey</span>
                      <h3 className="text-sm font-medium text-white leading-relaxed break-words">
                        {formDetails.info.title}
                      </h3>
                      <p className="text-[9px] font-mono text-white/30 truncate">
                        FORM ID: {formDetails.formId}
                      </p>
                    </div>

                    <div className="border-t border-b border-white/5 py-4 space-y-3 font-mono text-[11px] text-white/50">
                      <div className="flex gap-2.5 items-center">
                        <ClipboardList size={12} className="text-red-400" />
                        <span className="text-white/80">
                          MimeType: <strong className="font-semibold text-white">Google Form</strong>
                        </span>
                      </div>
                      {selectedForm.modifiedTime && (
                        <div className="flex gap-2.5 items-center">
                          <Calendar size={12} className="text-rose-400" />
                          <span className="text-white/80">
                            Modified: {new Date(selectedForm.modifiedTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick helper tips */}
                    <div className="p-4 rounded-2xl bg-red-600/5 border border-red-500/10 space-y-2">
                      <h4 className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Survey Telemetry</h4>
                      <ul className="text-[10px] text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                        <li>The body preview displays active structural questions.</li>
                        <li>Click "Append Question" to insert checkboxes, radios, or paragraph blocks.</li>
                        <li>Launch "Open Live Form" to share or fill responses directly in Google's original live layout.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-white/10 shrink-0 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAddQuestionOpen(true)}
                        className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle size={12} />
                        <span>APPEND QUESTION</span>
                      </button>

                      <button
                        onClick={() => handleDeleteForm(selectedForm)}
                        className="py-2.5 px-4 bg-white/5 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-mono rounded-xl cursor-pointer"
                      >
                        DELETE
                      </button>
                    </div>

                    {formDetails.responderUri && (
                      <a
                        href={formDetails.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white flex items-center justify-center gap-1.5 text-xs font-mono uppercase rounded-xl transition-colors"
                      >
                        <Eye size={12} className="text-red-400" />
                        <span>OPEN LIVE FORM</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* EMPTY PLACEHOLDER */
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <ClipboardList size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No survey selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a survey template from the left side panel list or compose a brand new draft to begin appending questions and tracking subscriber submissions.
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
