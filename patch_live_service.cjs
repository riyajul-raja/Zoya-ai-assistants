const fs = require('fs');
let content = fs.readFileSync('src/services/liveService.ts', 'utf8');

// Replace the WebSocket initialization logic
content = content.replace(
  /const wsProtocol = window\.location\.protocol === 'https:' \? 'wss:' : 'ws:';\s*const wsUrl = `\$\{wsProtocol\}\/\/\$\{window\.location\.host\}\/api\/chat\/stream`;\s*const ws = new WebSocket\(wsUrl\);/,
  `// Fetch API Key from serverless function\n        fetch('/api/key').then(res => res.json()).then(data => {\n          const apiKey = data.apiKey;\n          if (!apiKey) {\n            console.error("No API key available");\n            this.stop();\n            reject(new Error("No API key"));\n            return;\n          }\n          const wsUrl = \`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=\${apiKey}\`;\n          const ws = new WebSocket(wsUrl);`
);

// We need to match the close brackets of the Promise since we added a .then
// Let's just do a simpler replacement
