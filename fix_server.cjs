const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /const ai = new GoogleGenAI\(\{ apiKey: process.env.GEMINI_API_KEY \}\);/,
  `const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2;\nconst ai = new GoogleGenAI({ apiKey });\nimport { WebSocketServer, WebSocket as WS } from 'ws';`
);

// Add the upgrade handler at the bottom, replacing app.listen
content = content.replace(
  /app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{[\s\S]*?\}\);/,
  `const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url;
    if (pathname === '/api/chat/stream' || pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (process.env.NODE_ENV !== "production") {
       // Vite handles other upgrades (HMR)
       return;
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('Client connected to Live API Proxy');
    const url = \`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=\${apiKey}\`;
    
    const geminiWs = new WS(url);

    geminiWs.on('open', () => {
      console.log('Connected to Gemini Live API');
    });

    geminiWs.on('message', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    ws.on('message', (data) => {
      if (geminiWs.readyState === geminiWs.OPEN) {
        geminiWs.send(data);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      geminiWs.close();
    });

    geminiWs.on('close', () => {
      console.log('Gemini disconnected');
      if (ws.readyState === ws.OPEN) ws.close();
    });
    
    geminiWs.on('error', (err) => {
      console.error('Gemini WS Error:', err);
      if (ws.readyState === ws.OPEN) ws.close();
    });
  });`
);

fs.writeFileSync('server.ts', content);
