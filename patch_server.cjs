const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Remove WebSocketServer
content = content.replace(/import \{ WebSocketServer, WebSocket as WS \} from 'ws';\n?/, '');
content = content.replace(/const wss = new WebSocketServer\(\{ noServer: true \}\);[\s\S]*?\}\);/m, '');

// Restore simple listen
content = content.replace(/const httpServer = app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{[\s\S]*?\}\);/, `app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });`);

fs.writeFileSync('server.ts', content);
