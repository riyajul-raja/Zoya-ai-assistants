const fs = require('fs');
let code = fs.readFileSync('src/components/TypingIndicator.tsx', 'utf8');

const target = `export default function TypingIndicator({ isGhostMode = false }: { isGhostMode?: boolean }) {`;
const replacement = `export default function TypingIndicator({ isGhostMode = false, thought = null }: { isGhostMode?: boolean, thought?: string | null }) {`;

code = code.replace(target, replacement);

const target2 = `        </span>
      </div>
    </motion.div>
  );`;

const replacement2 = `        </span>
      </div>
      {thought && (
        <div className="mt-2 text-[10px] md:text-xs text-white/60 font-mono leading-relaxed border-l-2 border-white/20 pl-2 opacity-80 max-w-full overflow-hidden break-words whitespace-pre-wrap">
          {thought}
        </div>
      )}
    </motion.div>
  );`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/TypingIndicator.tsx', code);
