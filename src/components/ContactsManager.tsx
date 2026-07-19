import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Trash2, Edit2, X, Loader2, Mail, Phone, 
  Building, MapPin, Cake, User, LogOut, ChevronRight, RefreshCw, UserPlus, Mic
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout, getAccessToken, setAccessToken 
} from "../services/firebaseService";

// Google People API interfaces
interface ContactPerson {
  resourceName: string;
  etag: string;
  names?: Array<{
    displayName: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
  addresses?: Array<{
    formattedValue?: string;
    type?: string;
  }>;
  birthdays?: Array<{
    date?: {
      year?: number;
      month?: number;
      day?: number;
    };
  }>;
  photos?: Array<{
    url: string;
    default?: boolean;
  }>;
}

interface ContactsManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function ContactsManager({ onClose, isGhostMode = false, onToast }: ContactsManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactPerson | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceAction, setVoiceAction] = useState<{ type: 'call' | 'whatsapp'; name: string; number: string; } | null>(null);

  // Form modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Form fields
  const [formGivenName, setFormGivenName] = useState("");
  const [formFamilyName, setFormFamilyName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formBirthMonth, setFormBirthMonth] = useState("");
  const [formBirthDay, setFormBirthDay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchContacts(cachedToken);
      },
      () => {
        setIsAuthenticated(false);
        setFirebaseUser(null);
        setToken(null);
        setIsAuthChecking(false);
      },
      'zoya_google_contacts_token'
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn(['https://www.googleapis.com/auth/contacts.readonly'], 'zoya_google_contacts_token');
      if (result) {
        setToken(result.accessToken);
        setFirebaseUser(result.user);
        setIsAuthenticated(true);
        onToast("Authentication successful!");
        fetchContacts(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      onToast("Login failed. Please check browser settings.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout('zoya_google_contacts_token');
      setIsAuthenticated(false);
      setFirebaseUser(null);
      setToken(null);
      setContacts([]);
      setSelectedContact(null);
      onToast("Logged out successfully.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Initialize Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Speech Recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      onToast("Listening for voice command...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      let actionType: 'call' | 'whatsapp' | null = null;
      let nameToCallRaw = '';

      if (transcript.includes('call ')) {
        actionType = 'call';
        nameToCallRaw = transcript.substring(transcript.indexOf('call ') + 5).trim();
      } else if (transcript.includes('whatsapp ')) {
        actionType = 'whatsapp';
        nameToCallRaw = transcript.substring(transcript.indexOf('whatsapp ') + 9).trim();
      }
      
      if (actionType && nameToCallRaw) {
        const nameToCall = nameToCallRaw.replace(/\s+/g, '');
        
        if (nameToCall) {
          const match = contacts.find((c) => {
            const contactNameRaw = (c.names?.[0]?.displayName || "").toLowerCase();
            const contactName = contactNameRaw.replace(/\s+/g, '');
            return contactName.includes(nameToCall) || nameToCall.includes(contactName);
          });

          if (match) {
            const matchedContactPhoneNumber = match.phoneNumbers?.[0]?.value;
            if (matchedContactPhoneNumber) {
              const cleanNumber = matchedContactPhoneNumber.replace(/[\s\-\(\)]/g, '');
              
              setVoiceAction({
                type: actionType,
                name: match.names?.[0]?.displayName || "Unknown",
                number: cleanNumber
              });
              onToast(`Tap to ${actionType === 'call' ? 'Call' : 'WhatsApp'} ${match.names?.[0]?.displayName}`);
            } else {
              onToast(`Found ${match.names?.[0]?.displayName}, but no phone number available.`);
            }
          } else {
            onToast(`Contact not found.`);
          }
        }
      } else {
        onToast(`Recognized: "${transcript}". Say "Call [Name]" or "WhatsApp [Name]".`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      onToast(`Microphone error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const fetchContacts = async (accessToken: string) => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?pageSize=100&personFields=names,emailAddresses,phoneNumbers,organizations,addresses,birthdays,photos",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setIsAuthenticated(false);
          setToken(null);
          return;
        }
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      setContacts(data.connections || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      // Removed red toast since user might just need to log in
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Open creation modal
  const openAddModal = () => {
    setFormGivenName("");
    setFormFamilyName("");
    setFormEmail("");
    setFormPhone("");
    setFormCompany("");
    setFormTitle("");
    setFormBirthMonth("");
    setFormBirthDay("");
    setIsAddOpen(true);
  };

  // Open edit modal
  const openEditModal = (contact: ContactPerson) => {
    setSelectedContact(contact);
    setFormGivenName(contact.names?.[0]?.givenName || "");
    setFormFamilyName(contact.names?.[0]?.familyName || "");
    setFormEmail(contact.emailAddresses?.[0]?.value || "");
    setFormPhone(contact.phoneNumbers?.[0]?.value || "");
    setFormCompany(contact.organizations?.[0]?.name || "");
    setFormTitle(contact.organizations?.[0]?.title || "");
    const birthDate = contact.birthdays?.[0]?.date;
    setFormBirthMonth(birthDate?.month ? birthDate.month.toString() : "");
    setFormBirthDay(birthDate?.day ? birthDate.day.toString() : "");
    setIsEditOpen(true);
  };

  // Create Google Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGivenName.trim()) {
      onToast("First Name is required!");
      return;
    }
    if (!token) return;

    setIsSubmitting(true);

    const newContactPayload: any = {
      names: [
        {
          givenName: formGivenName,
          familyName: formFamilyName,
        }
      ]
    };

    if (formEmail.trim()) {
      newContactPayload.emailAddresses = [{ value: formEmail, type: "home" }];
    }
    if (formPhone.trim()) {
      newContactPayload.phoneNumbers = [{ value: formPhone, type: "mobile" }];
    }
    if (formCompany.trim() || formTitle.trim()) {
      newContactPayload.organizations = [
        {
          name: formCompany,
          title: formTitle,
          type: "work"
        }
      ];
    }
    if (formBirthMonth && formBirthDay) {
      newContactPayload.birthdays = [
        {
          date: {
            month: parseInt(formBirthMonth),
            day: parseInt(formBirthDay)
          }
        }
      ];
    }

    try {
      const response = await fetch("https://people.googleapis.com/v1/people:createContact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newContactPayload)
      });

      if (!response.ok) {
        throw new Error("Failed to create contact");
      }

      onToast("Contact created successfully!");
      setIsAddOpen(false);
      fetchContacts(token);
    } catch (err) {
      console.error("Error creating contact:", err);
      onToast("Failed to create contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Google Contact
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !token) return;
    if (!formGivenName.trim()) {
      onToast("First Name is required!");
      return;
    }

    // MANDATORY USER CONFIRMATION FOR MUTATION/DESTRUCTIVE WORKSPACE API OPERATIONS
    const confirmed = window.confirm(`Update contact for ${formGivenName} ${formFamilyName}?`);
    if (!confirmed) return;

    setIsSubmitting(true);

    const updatedPayload: any = {
      etag: selectedContact.etag,
      names: [
        {
          givenName: formGivenName,
          familyName: formFamilyName,
        }
      ]
    };

    if (formEmail.trim()) {
      updatedPayload.emailAddresses = [{ value: formEmail, type: "home" }];
    }
    if (formPhone.trim()) {
      updatedPayload.phoneNumbers = [{ value: formPhone, type: "mobile" }];
    }
    if (formCompany.trim() || formTitle.trim()) {
      updatedPayload.organizations = [
        {
          name: formCompany,
          title: formTitle,
          type: "work"
        }
      ];
    }
    if (formBirthMonth && formBirthDay) {
      updatedPayload.birthdays = [
        {
          date: {
            month: parseInt(formBirthMonth),
            day: parseInt(formBirthDay)
          }
        }
      ];
    }

    try {
      // For updates, the URL specifies updatePersonFields
      const fields = "names,emailAddresses,phoneNumbers,organizations,birthdays";
      const response = await fetch(
        `https://people.googleapis.com/v1/${selectedContact.resourceName}:updateContact?updatePersonFields=${fields}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedPayload)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update contact");
      }

      const updatedPerson = await response.json();
      setSelectedContact(updatedPerson);
      onToast("Contact updated successfully!");
      setIsEditOpen(false);
      fetchContacts(token);
    } catch (err) {
      console.error("Error updating contact:", err);
      onToast("Failed to update contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Google Contact
  const handleDeleteContact = async (contact: ContactPerson) => {
    const contactName = contact.names?.[0]?.displayName || "this contact";
    
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE WORKSPACE API OPERATIONS
    const confirmed = window.confirm(`Are you sure you want to delete ${contactName} from your Google Contacts? This action cannot be undone.`);
    if (!confirmed) return;

    if (!token) return;

    setIsDeleting(contact.resourceName);

    try {
      const response = await fetch(`https://people.googleapis.com/v1/${contact.resourceName}:deleteContact`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      onToast("Contact deleted successfully!");
      if (selectedContact?.resourceName === contact.resourceName) {
        setSelectedContact(null);
      }
      fetchContacts(token);
    } catch (err) {
      console.error("Error deleting contact:", err);
      onToast("Failed to delete contact.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Filtering list by search query
  const filteredContacts = contacts.filter((contact) => {
    const name = (contact.names?.[0]?.displayName || "").toLowerCase();
    const email = (contact.emailAddresses?.[0]?.value || "").toLowerCase();
    const phone = (contact.phoneNumbers?.[0]?.value || "").toLowerCase();
    const company = (contact.organizations?.[0]?.name || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query) || company.includes(query);
  });

  return (
    <>
      <AnimatePresence>
        {voiceAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-neutral-900 border border-red-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.2)] text-center relative"
            >
              <button
                onClick={() => setVoiceAction(null)}
                className="absolute top-3 right-3 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                {voiceAction.type === 'call' ? <Phone size={28} className="text-red-400" /> : <Mail size={28} className="text-green-400" />}
              </div>
              
              <h3 className="text-xl font-medium text-white mb-1">
                {voiceAction.type === 'call' ? 'Call' : 'WhatsApp'} {voiceAction.name}
              </h3>
              <p className="text-white/50 text-sm mb-6 font-mono">{voiceAction.number}</p>
              
              <a
                href={voiceAction.type === 'call' ? `tel:${voiceAction.number}` : `whatsapp://send?phone=${voiceAction.number}`}
                onClick={() => setTimeout(() => setVoiceAction(null), 1000)}
                className={`block w-full py-3.5 rounded-xl text-white font-medium tracking-wide transition-all shadow-lg active:scale-95 ${
                  voiceAction.type === 'call' 
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' 
                    : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
                }`}
              >
                TAP TO {voiceAction.type === 'call' ? 'CALL' : 'WHATSAPP'}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    <div id="contacts-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="contacts-manager-card"
        className={`w-full max-w-4xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Holographic Header Bar for Sci-Fi Style */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
        
        {/* Absolute Universal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Close Panel"
        >
          <X size={16} />
        </button>
        
        {/* Left pane: Contacts list & search */}
        <div className="flex-1 flex flex-col border-r border-white/10 min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xl font-serif font-medium text-white tracking-wide">
                Zoya Contacts
              </h2>
              {isAuthenticated && (
                <span className="text-[9px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Connected
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  onClick={() => fetchContacts(token!)}
                  disabled={isLoadingContacts}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                  title="Reload Contacts"
                >
                  <RefreshCw size={15} className={isLoadingContacts ? "animate-spin" : ""} />
                </button>
              )}
              {isAuthenticated && (
                <button
                  onClick={openAddModal}
                  className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/40 transition-colors cursor-pointer flex items-center gap-1.5 font-mono text-[11px]"
                  title="Add New Contact"
                >
                  <Plus size={15} />
                  <span>ADD</span>
                </button>
              )}
              {/* Mobile Close Button */}
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search or Login Required Screen */}
          {isAuthChecking ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <UserPlus size={28} className="text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Account Connection Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Account to access, create, update, or remove your contacts directly within the Zoya Console.
              </p>
              
              {/* Material styled sign-in button */}
              <button 
                onClick={handleLogin}
                disabled={isSigningIn}
                className="relative group overflow-hidden bg-white hover:bg-neutral-200 text-black py-3 px-6 rounded-xl font-medium tracking-wide shadow-lg transition-all active:scale-95 duration-200 cursor-pointer flex items-center gap-3"
              >
                {isSigningIn ? (
                  <Loader2 className="animate-spin text-black" size={18} />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Reconnect Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* Search input bar */}
              <div className="p-3 border-b border-white/10 shrink-0 bg-white/2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search contacts by name, email, or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={startListening}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                      isListening
                        ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Voice Command"
                  >
                    <Mic size={16} />
                  </button>
                </div>
              </div>

              {/* Contacts List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {isLoadingContacts && contacts.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-white/40">
                    <User size={28} className="opacity-40 mb-3 text-red-500/50" />
                    <p className="text-xs">No contacts found</p>
                    {searchQuery && (
                      <p className="text-[10px] mt-1">Try another search or add a new contact</p>
                    )}
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const name = contact.names?.[0]?.displayName || "Unnamed Contact";
                    const email = contact.emailAddresses?.[0]?.value || "";
                    const phone = contact.phoneNumbers?.[0]?.value || "";
                    const photoUrl = contact.photos?.[0]?.url || "";
                    const hasCustomPhoto = photoUrl && !contact.photos?.[0]?.default;

                    return (
                      <div
                        key={contact.resourceName}
                        onClick={() => setSelectedContact(contact)}
                        className={`p-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all ${
                          selectedContact?.resourceName === contact.resourceName 
                            ? "bg-red-500/10 border-l-2 border-red-500" 
                            : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {hasCustomPhoto ? (
                            <img
                              src={photoUrl}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold font-mono text-sm uppercase">
                              {name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-medium text-white truncate">{name}</h4>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              {email && (
                                <span className="text-[10px] text-white/50 truncate flex items-center gap-1">
                                  <Mail size={10} className="shrink-0" />
                                  {email}
                                </span>
                              )}
                              {phone && (
                                <span className="text-[10px] text-white/50 truncate flex items-center gap-1">
                                  <Phone size={10} className="shrink-0" />
                                  {phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity ml-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(contact);
                            }}
                            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
                            title="Edit Contact"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(contact);
                            }}
                            disabled={isDeleting === contact.resourceName}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/70 hover:text-red-400"
                            title="Delete Contact"
                          >
                            {isDeleting === contact.resourceName ? (
                              <Loader2 size={12} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                          <ChevronRight size={14} className="text-white/30 hidden md:block" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Connected User Profile Footer */}
              {firebaseUser && (
                <div className="p-4 border-t border-white/10 shrink-0 bg-white/2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {firebaseUser.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt={firebaseUser.displayName || "Google User"}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs uppercase">
                        {firebaseUser.displayName?.charAt(0) || "G"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 leading-none">Signed in as</p>
                      <p className="text-xs font-medium text-white truncate mt-1">
                        {firebaseUser.displayName || firebaseUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1"
                  >
                    <LogOut size={11} />
                    <span>LOGOUT</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right pane: Contact detail details / Form Editor */}
        <div className="hidden md:flex md:w-[380px] flex-col h-full bg-white/1">
          {/* Default Close button on top-right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>

          {/* Panel Contents */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between h-full pt-16">
            <AnimatePresence mode="wait">
              {isAddOpen || isEditOpen ? (
                /* Contact Form Editor */
                <motion.form
                  key="contact-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={isAddOpen ? handleCreateContact : handleUpdateContact}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <h3 className="text-sm font-mono text-red-500 font-bold uppercase tracking-wider">
                        {isAddOpen ? "Create Contact" : "Edit Contact"}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={formGivenName}
                          onChange={(e) => setFormGivenName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formFamilyName}
                          onChange={(e) => setFormFamilyName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Company</label>
                        <input
                          type="text"
                          value={formCompany}
                          onChange={(e) => setFormCompany(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Job Title</label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">Birthday (Month & Day)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={formBirthMonth}
                          onChange={(e) => setFormBirthMonth(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        >
                          <option value="" className="bg-neutral-900 text-white/50">Month</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m} className="bg-neutral-900 text-white">
                              {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={formBirthDay}
                          onChange={(e) => setFormBirthDay(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        >
                          <option value="" className="bg-neutral-900 text-white/50">Day</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d} className="bg-neutral-900 text-white">{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        "Save Details"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddOpen(false);
                        setIsEditOpen(false);
                      }}
                      className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              ) : selectedContact ? (
                /* Contact Details View */
                <motion.div
                  key="contact-details"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col justify-between h-full space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    {selectedContact.photos?.[0]?.url && !selectedContact.photos?.[0]?.default ? (
                      <img
                        src={selectedContact.photos[0].url}
                        alt={selectedContact.names?.[0]?.displayName}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full border-2 border-red-500/40 p-1 object-cover shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/20 text-red-400 flex items-center justify-center font-bold text-3xl shadow-[0_0_15px_rgba(239,68,68,0.15)] uppercase">
                        {selectedContact.names?.[0]?.displayName.charAt(0) || "U"}
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-base font-serif font-medium text-white">
                        {selectedContact.names?.[0]?.displayName || "Unnamed Contact"}
                      </h3>
                      {selectedContact.organizations?.[0]?.title && (
                        <p className="text-[10px] text-red-400/80 font-mono mt-1 uppercase tracking-wide">
                          {selectedContact.organizations[0].title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 pt-6 border-t border-white/5">
                    {selectedContact.emailAddresses?.[0]?.value && (
                      <div className="flex gap-3 text-left">
                        <Mail size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Email Address</p>
                          <a 
                            href={`mailto:${selectedContact.emailAddresses[0].value}`}
                            className="text-xs text-white/80 hover:text-white transition-colors hover:underline"
                          >
                            {selectedContact.emailAddresses[0].value}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedContact.phoneNumbers?.[0]?.value && (
                      <div className="flex gap-3 text-left">
                        <Phone size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Phone Number</p>
                          <a 
                            href={`tel:${selectedContact.phoneNumbers[0].value}`}
                            className="text-xs text-white/80 hover:text-white transition-colors hover:underline"
                          >
                            {selectedContact.phoneNumbers[0].value}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedContact.organizations?.[0]?.name && (
                      <div className="flex gap-3 text-left">
                        <Building size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Organization</p>
                          <p className="text-xs text-white/80">
                            {selectedContact.organizations[0].name}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedContact.addresses?.[0]?.formattedValue && (
                      <div className="flex gap-3 text-left">
                        <MapPin size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Address</p>
                          <p className="text-xs text-white/80 leading-normal">
                            {selectedContact.addresses[0].formattedValue}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedContact.birthdays?.[0]?.date && (
                      <div className="flex gap-3 text-left">
                        <Cake size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Birthday</p>
                          <p className="text-xs text-white/80">
                            {selectedContact.birthdays[0].date.month && 
                              new Date(2000, selectedContact.birthdays[0].date.month - 1).toLocaleString('default', { month: 'long' })}{" "}
                            {selectedContact.birthdays[0].date.day}
                            {selectedContact.birthdays[0].date.year && `, ${selectedContact.birthdays[0].date.year}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      onClick={() => openEditModal(selectedContact)}
                      className="flex-1 py-2 px-3 bg-red-600/20 border border-red-500/40 hover:bg-red-600/35 hover:border-red-500/55 text-red-300 hover:text-white text-xs font-mono rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit2 size={12} />
                      <span>EDIT CONTACT</span>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(selectedContact)}
                      className="py-2 px-3 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-center"
                      title="Delete contact"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Detail Placeholder */
                <motion.div
                  key="details-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <User size={48} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No contact selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select a contact from the panel list to view full profile details, update information, or initiate a delete operation.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
      </>
  );
}
