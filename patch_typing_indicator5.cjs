const fs = require('fs');

const code = `import React from "react";
import { motion } from "motion/react";
import { Brain } from "lucide-react";

interface TypingIndicatorProps {
  isGhostMode: boolean;
  thought?: string | null;
}

export default function TypingIndicator({ isGhostMode, thought = null }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col max-w-[85%] self-start items-start"
    >
      {!thought && (
        <div
          className={\`px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg flex items-center gap-1.5 \${
            isGhostMode
              ? "bg-rose-950/45 border-rose-500/45 text-rose-100 rounded-bl-none shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "bg-pink-600/15 border-pink-500/30 text-pink-100 rounded-bl-none shadow-[0_0_12px_rgba(236,72,153,0.15)]"
          }\`}
        >
          <div
            className={\`w-2 h-2 rounded-full dot-bounce-1 \${
              isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
            }\`}
          />
          <div
            className={\`w-2 h-2 rounded-full dot-bounce-2 \${
              isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
            }\`}
          />
          <div
            className={\`w-2 h-2 rounded-full dot-bounce-3 \${
              isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
            }\`}
          />
        </div>
      )}
      
      {!thought && (
        <span
          className={\`text-[10px] opacity-40 mt-1 px-2 font-mono uppercase tracking-widest \${
            isGhostMode ? "text-rose-400" : ""
          }\`}
        >
          Zoya
        </span>
      )}
      
      {thought && (
        <div className="mt-2 text-[11px] md:text-xs text-purple-200/80 font-mono leading-relaxed border border-purple-500/30 bg-purple-950/40 p-3.5 rounded-2xl rounded-bl-none shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md max-w-full">
          <div className="flex items-center gap-2 mb-2 opacity-90 border-b border-purple-500/20 pb-2">
             <Brain className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
             <span className="uppercase text-[9px] tracking-widest font-bold text-purple-300">Zoya is thinking<span className="animate-pulse">...</span></span>
          </div>
          <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar break-words whitespace-pre-wrap">
            {thought}
          </div>
        </div>
      )}
    </motion.div>
  );
}
\`;

fs.writeFileSync('src/components/TypingIndicator.tsx', code);
