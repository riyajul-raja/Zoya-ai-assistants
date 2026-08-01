const fs = require('fs');
let content = fs.readFileSync('src/services/liveService.ts', 'utf8');

const target = `      // Connect to Live API
      this.sessionPromise = new Promise((resolve, reject) => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = \`\${wsProtocol}//\${window.location.host}/api/chat/stream\`;
        const ws = new WebSocket(wsUrl);`;

const replacement = `      // Connect to Live API
      this.sessionPromise = new Promise(async (resolve, reject) => {
        let apiKey = "";
        try {
           const res = await fetch('/api/key');
           const data = await res.json();
           apiKey = data.apiKey;
        } catch (e) {
           console.error("Failed to fetch API key", e);
           this.stop();
           reject(e);
           return;
        }
        
        if (!apiKey) {
           this.stop();
           reject(new Error("No API key"));
           return;
        }
        const wsUrl = \`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=\${apiKey}\`;
        const ws = new WebSocket(wsUrl);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/services/liveService.ts', content);
