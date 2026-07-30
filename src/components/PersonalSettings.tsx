import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, ExternalLink, Key, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface PersonalSettingsProps {
  onBack: () => void;
  autoFocusApiKey?: boolean;
  onApiKeyVerified?: () => void;
}

export default function PersonalSettings({ onBack, autoFocusApiKey, onApiKeyVerified }: PersonalSettingsProps) {
  const [userName, setUserName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const apiKeyCardRef = useRef<HTMLDivElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('zoya_user_name') || localStorage.getItem('user_name') || '';
    setUserName(savedName);

    const savedKey = localStorage.getItem('zoya_gemini_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('zoya_api_key') || '';
    setApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (autoFocusApiKey) {
      const timer = setTimeout(() => {
        if (apiKeyCardRef.current) {
          apiKeyCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (apiKeyInputRef.current) {
          apiKeyInputRef.current.focus();
          try {
            apiKeyInputRef.current.click();
          } catch (e) {}
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoFocusApiKey]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userName.trim();
    if (trimmed) {
      localStorage.setItem('zoya_user_name', trimmed);
      localStorage.setItem('user_name', trimmed);
    } else {
      localStorage.removeItem('zoya_user_name');
      localStorage.removeItem('user_name');
    }
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const validateGeminiKey = async (key: string): Promise<boolean> => {
    if (!key || key.trim().length < 10) return false;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.trim())}`);
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setApiKeySaved(false);

    const trimmed = apiKey.trim();
    
    if (!trimmed) {
      setKeyError("Invalid Gemini API Key");
      return;
    }

    setIsValidatingKey(true);
    const isValid = await validateGeminiKey(trimmed);
    setIsValidatingKey(false);

    if (isValid) {
      localStorage.setItem('zoya_gemini_api_key', trimmed);
      localStorage.setItem('gemini_api_key', trimmed);
      localStorage.setItem('zoya_api_key', trimmed);
      setApiKeySaved(true);
      if (onApiKeyVerified) {
        onApiKeyVerified();
      }
      setTimeout(() => setApiKeySaved(false), 3000);
    } else {
      setKeyError("Invalid Gemini API Key");
    }
  };

  const handleGetApiKey = () => {
    window.open('https://aistudio.google.com/api-keys', '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-3xl z-[210] flex flex-col pointer-events-auto overflow-hidden text-white"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 hyper-glass rounded-b-[2rem] -mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer group px-4 py-2.5 hyper-glass rounded-xl hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.96]"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium tracking-wide">Back</span>
        </button>
        <span className="text-base font-serif font-medium text-white tracking-widest uppercase">Personal Settings</span>
        <div className="w-[88px]" />
      </div>

      {/* Main Content Scroll Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center">
        <div className="w-full max-w-xl flex flex-col gap-6">

          {/* SECTION 1: Your Name */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-[24px] bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-5 hover:border-white/20 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                <User size={22} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                  Your Name
                </h2>
                <p className="text-xs text-neutral-400">
                  How Zoya addresses you
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                />
                <span className="text-[11px] text-neutral-500 px-1">
                  Example: <span className="text-neutral-400">Riyajul</span>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer"
              >
                {nameSaved ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-emerald-400">Saved Successfully!</span>
                  </>
                ) : (
                  <span>Save Name</span>
                )}
              </button>
            </form>
          </motion.div>

          {/* SECTION 2: Gemini API Key */}
          <motion.div
            ref={apiKeyCardRef}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-[24px] bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 md:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-5 hover:border-white/20 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                <Key size={22} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                  Gemini API Key
                </h2>
                <p className="text-xs text-neutral-400">
                  Powers Zoya's AI Brain
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-neutral-300">
              Connect your own Google Gemini API key for unlimited AI access.
            </p>

            <button
              type="button"
              onClick={handleGetApiKey}
              className="w-full py-3 px-5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] border border-amber-500/30 text-amber-300 font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer group shadow-sm"
            >
              <span>Get Gemini API Key →</span>
              <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <form onSubmit={handleSaveApiKey} className="flex flex-col gap-4">
              <div className="relative w-full">
                <input
                  ref={apiKeyInputRef}
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (keyError) setKeyError(null);
                  }}
                  placeholder="Paste your Gemini API Key"
                  className="w-full pl-4 pr-11 py-3.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
                  title={showApiKey ? "Hide API Key" : "Show API Key"}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {keyError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex flex-col gap-1 text-xs animate-fadeIn">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle size={15} />
                    <span>Invalid Gemini API Key</span>
                  </div>
                  <p className="text-rose-300/80 pl-5">
                    Please enter a valid Google Gemini API Key.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isValidatingKey}
                className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidatingKey ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-300" />
                    <span>Validating Key...</span>
                  </>
                ) : apiKeySaved ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-emerald-400">API Key Saved Successfully</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
