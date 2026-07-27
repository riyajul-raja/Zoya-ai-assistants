const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `          )}
          
          
          {/* Hamburger Menu (Dropdown with Tool Labels) */}`;
          
const replacement = `          )}

          {/* Sync / Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-full border transition-all duration-300 cursor-pointer pointer-events-auto flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/25 text-white hover:text-cyan-400 hover:border-cyan-500/30"
            title="Hard Refresh"
          >
            <RefreshCw size={18} />
          </button>

          {/* Hamburger Menu (Dropdown with Tool Labels) */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
