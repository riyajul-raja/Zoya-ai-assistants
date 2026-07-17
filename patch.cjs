const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /<div\s+className=\{\`relative w-full h-full rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col min-h-0 \$\{\s+isChatMaximized \? "p-4" : "p-2\.5"\s+\} \$\{\s+isGhostMode\s+\? "bg-black\/90 border border-red-500\/90 shadow-\[0_0_25px_rgba\(239,68,68,0\.45\)\]"\s+: isARMode\s+\? "bg-black\/80 border border-red-500\/70 shadow-\[0_0_20px_rgba\(239,68,68,0\.3\)\]"\s+: "bg-neutral-950\/90 border border-red-500\/80 shadow-\[0_0_20px_rgba\(239,68,68,0\.3\)\]"\s+\}\`\}\s+>\s+\{\/\* Header section with toggle full-screen and close buttons \*\/\}/gm;

const replacement = `<div 
              className={\`relative w-full h-full rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col min-h-0 pt-3 \${
                isChatMaximized ? "px-4 pb-4" : "px-2.5 pb-2.5"
              } \${
                isGhostMode
                  ? "bg-black/90 border border-red-500/90 shadow-[0_0_25px_rgba(239,68,68,0.45)]"
                  : isARMode 
                     ? "bg-black/80 border border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                     : "bg-neutral-950/90 border border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              }\`}
            >
              {!isChatMaximized && (
                <div 
                  className="absolute top-0 left-0 right-0 h-4 flex items-start pt-1.5 justify-center cursor-ns-resize group"
                  onPointerDown={handlePointerDown}
                >
                  <div className="w-12 h-1 bg-white/20 group-hover:bg-red-500/80 rounded-full transition-colors pointer-events-none"></div>
                </div>
              )}
              {/* Header section with toggle full-screen and close buttons */}`;

if (regex.test(code)) {
  console.log("Matched!");
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Not matched!");
}
