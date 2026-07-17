import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Plus, Trash2, X, Loader2, LogOut, ChevronRight, RefreshCw, 
  UploadCloud, Folder, File, FileText, Image, FileSpreadsheet, Film, 
  HelpCircle, Eye, Download, Grid, List, FolderPlus, ArrowLeft, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, googleSignIn, logout, getAccessToken, setAccessToken 
} from "../services/firebaseService";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  owners?: Array<{
    displayName: string;
    photoLink?: string;
  }>;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

interface DriveManagerProps {
  onClose: () => void;
  isGhostMode?: boolean;
  onToast: (msg: string) => void;
}

export default function DriveManager({ onClose, isGhostMode = false, onToast }: DriveManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Files state
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");

  // Folder navigation state
  const [currentFolder, setCurrentFolder] = useState<FolderBreadcrumb>({ id: "root", name: "My Drive" });
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([{ id: "root", name: "My Drive" }]);

  // Folder creation modal state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Deleting state
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setFirebaseUser(user);
        setToken(cachedToken);
        setIsAuthenticated(true);
        setIsAuthChecking(false);
        fetchFiles(cachedToken, "root");
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
        onToast("Google Drive access authorized!");
        fetchFiles(result.accessToken, "root");
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
      setFiles([]);
      setSelectedFile(null);
      setBreadcrumbs([{ id: "root", name: "My Drive" }]);
      setCurrentFolder({ id: "root", name: "My Drive" });
      onToast("Google Account signed out.");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchFiles = async (accessToken: string, folderId: string) => {
    setIsLoading(true);
    try {
      // Query parameters: Order folders first, exclude trashed files, match parents folder
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=100&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,iconLink,owners)&orderBy=folder,name`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load files");
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Error fetching files:", err);
      onToast("Error loading Google Drive files.");
    } finally {
      setIsLoading(false);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      onToast("Folder name is required");
      return;
    }
    if (!token) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [currentFolder.id]
        })
      });

      if (!response.ok) {
        throw new Error("Folder creation failed");
      }

      onToast(`Folder "${newFolderName}" created!`);
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      fetchFiles(token, currentFolder.id);
    } catch (err) {
      console.error("Error creating folder:", err);
      onToast("Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Base64 multipart file upload helper
  const uploadFileToGoogleDrive = async (file: globalThis.File) => {
    if (!token) return;
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const boundary = "314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const reader = new FileReader();
      
      const fileLoadedPromise = new Promise<string | ArrayBuffer | null>((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = (e) => reject(e);
      });

      reader.readAsArrayBuffer(file);
      const result = await fileLoadedPromise;
      if (!result) throw new Error("Could not read file data");

      setUploadProgress(40);

      const contentType = file.type || "application/octet-stream";
      const metadata = {
        name: file.name,
        mimeType: contentType,
        parents: [currentFolder.id]
      };

      // Convert ArrayBuffer to Base64 String
      const base64Data = btoa(
        new Uint8Array(result as ArrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      setUploadProgress(70);

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Transfer-Encoding: base64\r\n" +
        "Content-Type: " + contentType + "\r\n\r\n" +
        base64Data +
        close_delim;

      const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        throw new Error("Google Drive upload failed");
      }

      setUploadProgress(100);
      onToast(`File "${file.name}" uploaded successfully!`);
      fetchFiles(token, currentFolder.id);
    } catch (err) {
      console.error("Error uploading file:", err);
      onToast("Failed to upload file.");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFileToGoogleDrive(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileToGoogleDrive(e.dataTransfer.files[0]);
    }
  };

  // Delete File
  const handleDeleteFile = async (file: DriveFile) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE WORKSPACE API OPERATIONS
    const confirmed = window.confirm(`Are you sure you want to delete "${file.name}" from Google Drive? This action cannot be undone.`);
    if (!confirmed) return;

    if (!token) return;

    setIsDeleting(file.id);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      onToast("File deleted successfully.");
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
      fetchFiles(token, currentFolder.id);
    } catch (err) {
      console.error("Error deleting file:", err);
      onToast("Failed to delete file.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle Double Click / Click on Folder
  const handleItemClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      const nextFolder = { id: file.id, name: file.name };
      const updatedBreadcrumbs = [...breadcrumbs, nextFolder];
      setBreadcrumbs(updatedBreadcrumbs);
      setCurrentFolder(nextFolder);
      setSelectedFile(null);
      if (token) {
        fetchFiles(token, file.id);
      }
    } else {
      setSelectedFile(file);
    }
  };

  // Breadcrumb Navigation
  const handleBreadcrumbClick = (crumb: FolderBreadcrumb, index: number) => {
    const updatedBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(updatedBreadcrumbs);
    setCurrentFolder(crumb);
    setSelectedFile(null);
    if (token) {
      fetchFiles(token, crumb.id);
    }
  };

  // Helpers to render matching file type icons
  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <Folder size={18} className="text-orange-400 fill-orange-400/20" />;
    }
    if (mimeType.startsWith("image/")) {
      return <Image size={18} className="text-emerald-400" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText size={18} className="text-red-400" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("sheet") || mimeType === "application/vnd.google-apps.spreadsheet") {
      return <FileSpreadsheet size={18} className="text-green-400" />;
    }
    if (mimeType.includes("video/")) {
      return <Film size={18} className="text-blue-400" />;
    }
    return <File size={18} className="text-neutral-300" />;
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return "—";
    const bytes = parseInt(bytesStr);
    if (isNaN(bytes)) return "—";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Filtering list by both Search query and Type Filter
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (fileTypeFilter === "all") return true;
    if (fileTypeFilter === "folder") return file.mimeType === "application/vnd.google-apps.folder";
    if (fileTypeFilter === "document") return file.mimeType.includes("document") || file.mimeType.includes("pdf") || file.mimeType.includes("text");
    if (fileTypeFilter === "sheet") return file.mimeType.includes("spreadsheet") || file.mimeType.includes("sheet");
    if (fileTypeFilter === "image") return file.mimeType.startsWith("image/");
    if (fileTypeFilter === "video") return file.mimeType.startsWith("video/");
    
    return true;
  });

  return (
    <div id="drive-manager-overlay" className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div 
        id="drive-manager-card"
        className={`w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col md:flex-row overflow-hidden border backdrop-blur-xl relative transition-all duration-300 ${
          isGhostMode 
            ? "bg-black/95 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : "bg-neutral-950/95 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        }`}
      >
        {/* Decorative Sci-Fi Hologram Accent Header */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

        {/* Left Pane: File navigation and browsing */}
        <div className="flex-1 flex flex-col border-r border-white/10 min-w-0 h-full">
          {/* Header */}
          <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xl font-serif font-medium text-white tracking-wide">
                Zoya Drive Explorer
              </h2>
              {isAuthenticated && (
                <span className="text-[9px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Cloud Connected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  {/* View mode toggle */}
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-red-500/20 text-white" : "text-white/40 hover:text-white/70"}`}
                      title="Grid View"
                    >
                      <Grid size={13} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-red-500/20 text-white" : "text-white/40 hover:text-white/70"}`}
                      title="List View"
                    >
                      <List size={13} />
                    </button>
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={() => fetchFiles(token!, currentFolder.id)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                    title="Refresh Files"
                  >
                    <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                  </button>

                  {/* Create Folder Button */}
                  <button
                    onClick={() => setIsCreateFolderOpen(true)}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1 font-mono text-[11px]"
                    title="Create New Folder"
                  >
                    <FolderPlus size={13} />
                    <span className="hidden sm:inline">FOLDER</span>
                  </button>

                  {/* Upload File Trigger */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/40 transition-colors cursor-pointer flex items-center gap-1.5 font-mono text-[11px]"
                    title="Upload File"
                  >
                    {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    <span>UPLOAD</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
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

          {/* Render Connection Required Screen or Main browser */}
          {isAuthChecking ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <UploadCloud size={28} className="text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Google Drive Connection Required</h3>
              <p className="text-white/50 text-xs max-w-sm mb-6 leading-relaxed">
                Connect your Google Drive account to list, browse folders, upload files, create directories, and manage cloud assets right from this sci-fi console.
              </p>
              
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
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* Breadcrumbs bar */}
              <div className="px-5 py-3 border-b border-white/10 bg-white/2 flex items-center gap-1.5 text-xs text-white/50 overflow-x-auto whitespace-nowrap shrink-0">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight size={12} className="text-white/20 shrink-0" />}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb, idx)}
                      className={`hover:text-red-400 transition-colors cursor-pointer font-mono ${
                        idx === breadcrumbs.length - 1 ? "text-white font-medium" : ""
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Filtering / Search Sub-header */}
              <div className="p-3 border-b border-white/10 shrink-0 bg-white/1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={13} className="absolute left-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search files in this folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-white/40 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* File filter selectors */}
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-red-500/50"
                >
                  <option value="all">All File Types</option>
                  <option value="folder">Folders</option>
                  <option value="document">Documents (PDF, Text)</option>
                  <option value="sheet">Spreadsheets</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              {/* Uploading progress bar indicator */}
              {isUploading && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-2.5 shrink-0 flex items-center justify-between text-xs font-mono text-red-400">
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading selected asset to Cloud...</span>
                  </div>
                  <div className="w-1/3 bg-white/5 border border-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Drag and Drop Zone Container */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 overflow-y-auto relative p-4 transition-all ${
                  isDragOver 
                    ? "bg-red-500/10 border-2 border-dashed border-red-500 m-2 rounded-2xl" 
                    : ""
                }`}
              >
                {/* Drag and Drop overlay text */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-black/85 p-6 pointer-events-none"
                    >
                      <UploadCloud size={48} className="text-red-500 mb-3 animate-bounce" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Release to Upload</h4>
                      <p className="text-[10px] text-white/50 mt-1">Upload directly into "{currentFolder.name}"</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading && files.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/40">
                    <Folder size={32} className="opacity-30 mb-3 text-red-500/50" />
                    <p className="text-xs font-mono uppercase tracking-wider">Folder is empty</p>
                    <p className="text-[10px] mt-1.5 max-w-xs leading-normal">
                      Drag & drop any file directly here or use the **UPLOAD** button in the header bar to save assets.
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  /* Grid View Layout */
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredFiles.map((file) => {
                      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                      return (
                        <div
                          key={file.id}
                          onClick={() => handleItemClick(file)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                            selectedFile?.id === file.id
                              ? "bg-red-500/15 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                              : "bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5"
                          }`}
                        >
                          {/* Top bar with file icon & actions */}
                          <div className="flex items-center justify-between mb-3.5">
                            {getFileIcon(file.mimeType)}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file);
                                }}
                                disabled={isDeleting === file.id}
                                className="p-1 rounded hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                title="Delete file"
                              >
                                {isDeleting === file.id ? (
                                  <Loader2 size={10} className="animate-spin text-red-500" />
                                ) : (
                                  <Trash2 size={11} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* File name and size info */}
                          <div>
                            <h4 className="text-xs font-medium text-white truncate leading-snug" title={file.name}>
                              {file.name}
                            </h4>
                            <p className="text-[9px] font-mono text-white/30 mt-1 uppercase">
                              {isFolder ? "Folder" : formatBytes(file.size)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View Layout */
                  <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                    {filteredFiles.map((file) => {
                      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                      return (
                        <div
                          key={file.id}
                          onClick={() => handleItemClick(file)}
                          className={`p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all ${
                            selectedFile?.id === file.id 
                              ? "bg-red-500/10 border-l-2 border-red-500" 
                              : "border-l-2 border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getFileIcon(file.mimeType)}
                            <div className="min-w-0">
                              <h4 className="text-xs font-medium text-white truncate leading-none">{file.name}</h4>
                              <p className="text-[9px] font-mono text-white/30 mt-1 uppercase">
                                {isFolder ? "Folder" : `File • ${formatBytes(file.size)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="hidden sm:inline text-[9px] font-mono text-white/30">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ""}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file);
                              }}
                              disabled={isDeleting === file.id}
                              className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 sm:opacity-100"
                            >
                              {isDeleting === file.id ? (
                                <Loader2 size={11} className="animate-spin text-red-500" />
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
                      <p className="text-[10px] text-white/40 leading-none">Logged in as</p>
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

        {/* Right pane: Selected File Details view */}
        <div className="hidden md:flex md:w-[360px] flex-col h-full bg-white/1">
          {/* Default Close button on top-right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>

          <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between h-full pt-16">
            <AnimatePresence mode="wait">
              {isCreateFolderOpen ? (
                /* Create Folder modal form */
                <motion.form
                  key="create-folder-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleCreateFolder}
                  className="space-y-4 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <h3 className="text-sm font-mono text-red-500 font-bold uppercase tracking-wider">
                        Create Folder
                      </h3>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase mb-1.5">Folder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Untitled Folder"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-6">
                    <button
                      type="submit"
                      disabled={isCreatingFolder}
                      className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isCreatingFolder ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderOpen(false)}
                      className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              ) : selectedFile ? (
                /* File Details panel */
                <motion.div
                  key="file-details"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col justify-between h-full space-y-6"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Thumbnail or Large Generic Icon */}
                    {selectedFile.thumbnailLink ? (
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-black/40">
                        <img
                          src={selectedFile.thumbnailLink}
                          alt={selectedFile.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        {React.cloneElement(getFileIcon(selectedFile.mimeType), { size: 36 })}
                      </div>
                    )}
                    
                    <div className="w-full">
                      <h3 className="text-sm font-medium text-white break-words px-2 leading-relaxed" title={selectedFile.name}>
                        {selectedFile.name}
                      </h3>
                      <p className="text-[9px] text-red-400/80 font-mono mt-1 uppercase tracking-wide">
                        {selectedFile.mimeType === "application/vnd.google-apps.folder" ? "Folder" : "File Asset"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 pt-6 border-t border-white/5 text-left">
                    {/* Size */}
                    {selectedFile.size && (
                      <div>
                        <p className="text-[9px] font-mono text-white/40 uppercase">File Size</p>
                        <p className="text-xs text-white/80 mt-0.5">{formatBytes(selectedFile.size)}</p>
                      </div>
                    )}

                    {/* Owners */}
                    {selectedFile.owners && selectedFile.owners[0] && (
                      <div className="flex gap-2 items-center">
                        {selectedFile.owners[0].photoLink && (
                          <img
                            src={selectedFile.owners[0].photoLink}
                            alt={selectedFile.owners[0].displayName}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full border border-white/10 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-[9px] font-mono text-white/40 uppercase">Owner</p>
                          <p className="text-xs text-white/80 mt-0.5">{selectedFile.owners[0].displayName}</p>
                        </div>
                      </div>
                    )}

                    {/* Created */}
                    {selectedFile.createdTime && (
                      <div>
                        <p className="text-[9px] font-mono text-white/40 uppercase">Created Date</p>
                        <p className="text-xs text-white/80 mt-0.5">
                          {new Date(selectedFile.createdTime).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Modified */}
                    {selectedFile.modifiedTime && (
                      <div>
                        <p className="text-[9px] font-mono text-white/40 uppercase">Last Modified</p>
                        <p className="text-xs text-white/80 mt-0.5">
                          {new Date(selectedFile.modifiedTime).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col gap-2 pt-6 shrink-0">
                    {selectedFile.webViewLink && (
                      <a
                        href={selectedFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Eye size={12} />
                        <span>OPEN IN GOOGLE DRIVE</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteFile(selectedFile)}
                      disabled={isDeleting === selectedFile.id}
                      className="w-full py-2 px-3 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-xs font-mono flex items-center justify-center gap-2"
                    >
                      {isDeleting === selectedFile.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      <span>DELETE ASSET</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Select Placeholder */
                <motion.div
                  key="details-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 h-full"
                >
                  <File size={44} className="opacity-30 mb-4 text-red-500" />
                  <p className="text-xs font-mono uppercase tracking-wider">No asset selected</p>
                  <p className="text-[10px] mt-2 max-w-xs leading-normal">
                    Select any file or folder from the catalog to inspect structural metadata, download/view source locations, or delete cloud data.
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
