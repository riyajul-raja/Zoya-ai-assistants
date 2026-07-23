const fs = require('fs');
let content = fs.readFileSync('src/components/DiagnosticsPanel.tsx', 'utf8');

// Add Info icon to lucide-react imports if it's not there
if (!content.includes('Info')) {
  content = content.replace('X, Activity, Server, Clock, Zap, CheckCircle2, XCircle, AlertCircle', 'X, Activity, Server, Clock, Zap, CheckCircle2, XCircle, AlertCircle, Info');
}

// Add state for tooltip
content = content.replace(/const \[state, setState\] = useState<DiagnosticsState>\(diagnosticsStore\.getState\(\)\);/, 
  'const [state, setState] = useState<DiagnosticsState>(diagnosticsStore.getState());\n  const [showInfo, setShowInfo] = useState(false);');

// Add the tooltip overlay UI at the end of the modal content, before the closing motion.div
const infoModal = `
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
`;

content = content.replace(/<\/div>\n\s*<\/motion\.div>/, infoModal + '      </div>\n    </motion.div>');

// Now add the Info button to the top header area of the Diagnostics panel
content = content.replace(/<button\n\s*onClick=\{onClose\}/, 
  `<button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer mr-1"
          title="Status Info"
        >
          <Info size={20} />
        </button>
        <button
          onClick={onClose}`);

// Now update the badge logic inside the map
const oldBadgeWrapper = /<div className=\{`px-2 py-0\.5 rounded-full text-\[10px\] font-bold tracking-wider uppercase border \$\{[\s\S]*?\}\`\}>\s*\{!p\.isConfigured \? "OFFLINE" : p\.status === "error" \? "DEGRADED" : "ONLINE"\}\s*<\/div>/;

const newBadgeWrapper = `<button onClick={() => setShowInfo(true)} className={\`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border cursor-pointer hover:opacity-80 transition-opacity \${
                        !p.isConfigured || p.status === "error"
                          ? "bg-red-500/20 text-red-300 border-red-500/30" 
                          : p.latencyMs > 3000
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }\`}>
                        {!p.isConfigured || p.status === "error" ? "OFFLINE" : p.latencyMs > 3000 ? "DEGRADED" : "ONLINE"}
                      </button>`;

if (oldBadgeWrapper.test(content)) {
  content = content.replace(oldBadgeWrapper, newBadgeWrapper);
} else {
    // try a more generic replacement if regex didn't match perfectly
    const regex = /<div className=\{`px-2 py-0\.5 rounded-full text-\[10px\] font-bold tracking-wider uppercase border \$\{[\s\S]*?\}\`\}>\s*\{.*?\}\s*<\/div>/;
    content = content.replace(regex, newBadgeWrapper);
}

fs.writeFileSync('src/components/DiagnosticsPanel.tsx', content);
console.log("Updated DiagnosticsPanel.tsx");
