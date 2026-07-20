import React from "react";
import { motion } from "motion/react";

interface TypingIndicatorProps {
  isGhostMode?: boolean;
}

export default function TypingIndicator({ isGhostMode = false }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col max-w-[85%] self-start items-start"
    >
      <div
        className={`w-fit px-4 py-2 rounded-2xl border backdrop-blur-md shadow-lg flex items-center gap-2 ${
          isGhostMode
            ? "bg-rose-950/45 border-rose-500/45 text-rose-100 rounded-bl-none shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            : "bg-pink-600/15 border-pink-500/30 text-pink-100 rounded-bl-none shadow-[0_0_12px_rgba(236,72,153,0.15)]"
        }`}
      >
        <div className="relative flex items-center justify-center p-[2px]">
          <div className="absolute inset-0 rounded-full border-t-2 border-white/50 animate-spin"></div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-xs text-white">
            Z
          </div>
        </div>
        <div className="text-xs font-medium opacity-90 flex items-center">
          Zoya is Thinking
          <span className="animate-pulse tracking-widest ml-0.5">...</span>
        </div>
      </div>
    </motion.div>
  );
}
