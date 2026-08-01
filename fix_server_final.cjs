const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
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
  });
}

startServer();`;

content = content.replace(target, `  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}
startServer();`);

fs.writeFileSync('server.ts', content);
