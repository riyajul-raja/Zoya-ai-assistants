const fs = require('fs');
let code = fs.readFileSync('src/components/TypingIndicator.tsx', 'utf8');

const target = `      {thought && (
        <div className="mt-2 text-[10px] md:text-xs text-white/60 font-mono leading-relaxed border-l-2 border-white/20 pl-2 opacity-80 max-w-full overflow-hidden break-words whitespace-pre-wrap">
          {thought}
        </div>
      )}`;

const replacement = `      {thought && (
        <div className="mt-3 text-[10px] md:text-[11px] text-pink-200/70 font-mono leading-relaxed border-l-[1.5px] border-pink-500/40 pl-2.5 opacity-90 max-w-full overflow-hidden break-words whitespace-pre-wrap bg-black/20 p-2 rounded-r-lg">
          <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
             <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
             <span className="uppercase text-[8px] tracking-widest font-semibold text-pink-300">Zoya is thinking...</span>
          </div>
          {thought}
        </div>
      )}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/TypingIndicator.tsx', code);
