const fs = require('fs');
let content = fs.readFileSync('src/components/TypingIndicator.tsx', 'utf8');

const newContent = `import React from "react";
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
        className={\`w-fit px-5 py-3 rounded-[20px] backdrop-blur-2xl flex items-center gap-3 \${
          isGhostMode
            ? "bg-rose-950/45 border border-rose-500/45 text-rose-100 rounded-bl-[4px] shadow-[0_8px_32px_rgba(244,63,94,0.15)]"
            : "bg-white/[0.04] border border-white/10 text-neutral-100 rounded-bl-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        }\`}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-[-4px] rounded-full border-t-[1.5px] border-white/50 animate-spin"></div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            Z
          </div>
        </div>
        <div className="text-[14px] font-medium opacity-90 flex items-center tracking-wide">
          Zoya is typing
          <span className="flex gap-0.5 ml-1.5">
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0 }} className="w-1 h-1 rounded-full bg-white/70" />
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 rounded-full bg-white/70" />
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 rounded-full bg-white/70" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
`;

fs.writeFileSync('src/components/TypingIndicator.tsx', newContent);
