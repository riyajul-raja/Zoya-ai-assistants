import React from "react";
import { motion } from "motion/react";

interface TypingIndicatorProps {
  isGhostMode: boolean;
}

export default function TypingIndicator({ isGhostMode }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col max-w-[85%] self-start items-start"
    >
      <div
        className={`px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg flex items-center gap-3 ${
          isGhostMode
            ? "bg-rose-950/45 border-rose-500/45 text-rose-100 rounded-bl-none shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            : "bg-pink-600/15 border-pink-500/30 text-pink-100 rounded-bl-none shadow-[0_0_12px_rgba(236,72,153,0.15)]"
        }`}
      >
        <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 border-r-pink-500 border-b-blue-500 border-l-cyan-500 animate-spin"></div>
          <span className="text-white font-bold text-sm">Z</span>
        </div>
        <div className="text-sm font-medium opacity-90 flex items-center">
          Zoya is Thinking
          <span className="animate-pulse tracking-widest ml-0.5">...</span>
        </div>
      </div>
    </motion.div>
  );
}
