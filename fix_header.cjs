const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update header
content = content.replace(
  /<header className="absolute top-0 left-0 w-full flex justify-between items-center z-50 shrink-0 px-6 py-4 md:px-12 md:py-6 pointer-events-auto">/,
  '<header className="absolute top-0 left-0 w-full flex items-center justify-between gap-2 z-50 shrink-0 px-4 py-4 md:px-12 md:py-6 pointer-events-auto">'
);

// Update Left and Right blocks to shrink-0 just in case
content = content.replace(
  /<div className="flex items-center gap-3">/,
  '<div className="flex items-center gap-3 shrink-0">'
);
content = content.replace(
  /<div className="flex items-center gap-2">/,
  '<div className="flex items-center gap-2 shrink-0">'
);

// Update the Center AI Model Selector positioning
content = content.replace(
  /<div className="absolute left-1\/2 -translate-x-1\/2 top-1\/2 -translate-y-1\/2 z-50">/,
  '<div className="flex-1 flex justify-center items-center z-50 min-w-0">'
);

// Update the button inside to have max-width and truncate
const oldButton = `<button
              onClick={() => setIsModelSelectorExpanded(!isModelSelectorExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all cursor-pointer shadow-lg backdrop-blur-md"
            >`;

const newButton = `<button
              onClick={() => setIsModelSelectorExpanded(!isModelSelectorExpanded)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all cursor-pointer shadow-lg backdrop-blur-md w-full max-w-[160px] sm:max-w-[200px]"
            >`;

content = content.replace(oldButton, newButton);

// Update the span to have truncate
const oldSpan = `<span className="text-xs font-medium tracking-wide">
                {selectedModel ===`;

const newSpan = `<span className="text-xs font-medium tracking-wide truncate">
                {selectedModel ===`;

content = content.replace(oldSpan, newSpan);

// Ensure GeminiIcon shrink-0
content = content.replace(/<GeminiIcon size=\{14\} \/>/, '<div className="shrink-0"><GeminiIcon size={14} /></div>');

// Ensure ChevronDown shrink-0
const oldChevron = `<ChevronDown
                size={14}
                className={\`text-white/50 transition-transform duration-300 \${isModelSelectorExpanded ? 'rotate-180' : ''}\`}
              />`;
const newChevron = `<ChevronDown
                size={14}
                className={\`shrink-0 text-white/50 transition-transform duration-300 \${isModelSelectorExpanded ? 'rotate-180' : ''}\`}
              />`;

content = content.replace(oldChevron, newChevron);

// ensure the relative wrapper has full width if possible
content = content.replace(/<div className="relative">/, '<div className="relative flex justify-center w-full">');

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx header layout");
