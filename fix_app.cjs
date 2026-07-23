const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the mangled div tag
content = content.replace('<div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50          <div className="relative">', 
'<div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50">\n          <div className="relative">');

// Fix the mangled map call
content = content.replace('                    ].map((model) => (del) => (', '                    ].map((model) => (');

// Remove GroqIcon from BrandIcons import if present
content = content.replace(/import \{ GeminiIcon, GroqIcon \} from "\.\/components\/BrandIcons";/, 'import { GeminiIcon } from "./components/BrandIcons";');

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx");
