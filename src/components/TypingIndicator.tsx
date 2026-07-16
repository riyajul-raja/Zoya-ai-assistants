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
        className={`px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg flex items-center gap-1.5 ${
          isGhostMode
            ? "bg-rose-950/45 border-rose-500/45 text-rose-100 rounded-bl-none shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            : "bg-pink-600/15 border-pink-500/30 text-pink-100 rounded-bl-none shadow-[0_0_12px_rgba(236,72,153,0.15)]"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full dot-bounce-1 ${
            isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
          }`}
        />
        <div
          className={`w-2 h-2 rounded-full dot-bounce-2 ${
            isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
          }`}
        />
        <div
          className={`w-2 h-2 rounded-full dot-bounce-3 ${
            isGhostMode ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]"
          }`}
        />
      </div>
      <span
        className={`text-[10px] opacity-40 mt-1 px-2 font-mono uppercase tracking-widest ${
          isGhostMode ? "text-rose-400" : ""
        }`}
      >
        Zoya
      </span>
    </motion.div>
  );
}
