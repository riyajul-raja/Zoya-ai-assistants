import React, { useEffect, useState } from "react";
import { X, Activity, Server, Clock, Zap, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { diagnosticsStore, DiagnosticsState, ProviderDiagnostic } from "../services/diagnosticsStore";
import { motion, AnimatePresence } from "framer-motion";

interface DiagnosticsPanelProps {
  onClose: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ onClose }) => {
  const [state, setState] = useState<DiagnosticsState>(diagnosticsStore.getState());
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const unsubscribe = diagnosticsStore.subscribe((newState) => {
      setState(newState);
    });

    import("../utils/envHelper").then(m => {
      const clientEnv = m.getClientEnv();
      
      // Fetch initial config from backend
      fetch("/api/config")
        .then(res => res.json())
        .then(config => {
          diagnosticsStore.setAllConfigured(!!(config.gemini || clientEnv.gemini));
                            })
        .catch(err => {
          console.error("Failed to fetch diagnostics config:", err);
          // Fallback to client check
          diagnosticsStore.setAllConfigured(!!clientEnv.gemini);
                            });
    }).catch(e => console.error(e));

    return () => unsubscribe();
  }, []);

  const providers = Object.values(state) as ProviderDiagnostic[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
      className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[85vh] bg-black/90 backdrop-blur-2xl border border-white/10 sm:rounded-3xl shadow-2xl z-[200] flex flex-col overflow-hidden pointer-events-auto"
    >
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">System Diagnostics</h2>
            <p className="text-xs text-white/50 font-mono tracking-wider uppercase mt-0.5">Model Provider Telemetry</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer mr-1"
          title="Status Info"
        >
          <Info size={20} />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {providers.map((p) => {
          let statusColor = "text-white/40";
          let statusBg = "bg-white/5 border-white/10";
          let StatusIcon = Server;
          
          if (!p.isConfigured) {
            statusColor = "text-yellow-400";
            statusBg = "bg-yellow-500/10 border-yellow-500/30";
            StatusIcon = AlertCircle;
          } else if (p.status === "pending") {
            statusColor = "text-blue-400";
            statusBg = "bg-blue-500/10 border-blue-500/30";
            StatusIcon = Zap;
          } else if (p.status === "success") {
            statusColor = "text-emerald-400";
            statusBg = "bg-emerald-500/10 border-emerald-500/30";
            StatusIcon = CheckCircle2;
          } else if (p.status === "error") {
            statusColor = "text-red-400";
            statusBg = "bg-red-500/10 border-red-500/30";
            StatusIcon = XCircle;
          }

          const isOnline = p.isConfigured && p.status !== "error";

          return (
            <div key={p.provider} className={`p-4 rounded-2xl border ${statusBg} transition-all duration-300 relative overflow-hidden group`}>
              {/* Background gradient hint */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-current to-transparent ${statusColor}`} />
              
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-black/40 border border-white/5 ${statusColor}`}>
                    <StatusIcon size={20} className={p.status === "pending" ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white capitalize">{p.modelName}</h3>
                      <button onClick={() => setShowInfo(true)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border cursor-pointer hover:opacity-80 transition-opacity ${
                        !p.isConfigured || p.status === "error"
                          ? "bg-red-500/20 text-red-300 border-red-500/30" 
                          : p.latencyMs > 3000
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }`}>
                        {!p.isConfigured || p.status === "error" ? "OFFLINE" : p.latencyMs > 3000 ? "DEGRADED" : "ONLINE"}
                      </button>
                    </div>
                    <p className="text-xs text-white/50 font-mono mt-1">{p.subtitle}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 text-right">
                  {p.latencyMs > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-white/70">
                      <Clock size={12} className="text-white/40" />
                      <span>{p.latencyMs}ms</span>
                    </div>
                  )}
                  {p.tokenUsage && (
                    <div className="text-[10px] font-mono text-white/50 border border-white/10 rounded px-1.5 py-0.5 bg-black/20">
                      Tokens: <span className="text-white/80">{p.tokenUsage.total}</span> 
                      <span className="opacity-50 mx-1">|</span>
                      <span className="text-emerald-400/80">{p.tokenUsage.prompt}</span> 
                      <span className="opacity-50">+</span> 
                      <span className="text-blue-400/80">{p.tokenUsage.completion}</span>
                    </div>
                  )}
                </div>
              </div>

              {p.lastError && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-200 break-words">
                  <div className="flex items-center gap-2 mb-1 text-red-400 font-semibold tracking-wider uppercase text-[10px]">
                    <AlertCircle size={12} />
                    Last Error
                  </div>
                  {p.lastError}
                </div>
              )}
            </div>
          );
        })}
      
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 right-4 sm:right-6 w-72 rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl p-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] z-[300]"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold text-sm">Status Meanings</h3>
              <button onClick={() => setShowInfo(false)} className="text-white/50 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">ONLINE</div>
                <p className="text-xs text-white/70 leading-relaxed">Jab model smooth kaam kar raha ho.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">DEGRADED</div>
                <p className="text-xs text-white/70 leading-relaxed">Jab response thoda slow ho ya API key rotate ho rahi ho.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-red-500/20 text-red-300 border-red-500/30">OFFLINE</div>
                <p className="text-xs text-white/70 leading-relaxed">Jab Google ki taraf se wo particular model down ho ya fail ho jaye.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
};
