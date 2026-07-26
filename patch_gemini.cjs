const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/const response = await fetch\('\/api\/chat\/stream', \{[\s\S]*?\}\);/m, 
`const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, imageFrames })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(\`HTTP error! status: \${response.status}, \${errText}\`);
    }`);

content = content.replace(/const response = await fetch\('\/api\/chat', \{[\s\S]*?\}\);/m, 
`const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, imageFrames })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(\`HTTP error! status: \${response.status}, \${errText}\`);
    }`);

content = content.replace(/const response = await fetch\('\/api\/tts', \{[\s\S]*?\}\);/m, 
`const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(\`HTTP error! status: \${response.status}, \${errText}\`);
    }`);

fs.writeFileSync('src/services/geminiService.ts', content);
