const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `          )}

          {/* Sync / Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center hover:text-cyan-400 hover:border-cyan-500/30"
            title="Hard Refresh"
          >
            <RefreshCw size={18} className="transition-transform duration-300 hover:rotate-180" />
          </button>

          {/* Hamburger Menu`;

code = code.replace(/          \)}\s*\{\/\* Hamburger Menu/m, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
