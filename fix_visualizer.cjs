const fs = require('fs');
let content = fs.readFileSync('src/components/Visualizer.tsx', 'utf8');

// Replace ease: "linear" with ease: "linear" as any
content = content.replace(/ease: "linear"/g, 'ease: "linear" as any');
content = content.replace(/ease: "easeInOut"/g, 'ease: "easeInOut" as any');

fs.writeFileSync('src/components/Visualizer.tsx', content);
