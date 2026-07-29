const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  'const messagesEndRef = useRef<HTMLDivElement>(null);',
  'const messagesEndRef = useRef<HTMLDivElement>(null);\n  const isProcessingRequestRef = useRef(false);'
);
fs.writeFileSync('src/App.tsx', content);
