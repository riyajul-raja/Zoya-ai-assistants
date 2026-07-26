const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/chat/stream');
ws.on('open', () => console.log('Connected'));
ws.on('message', data => console.log('Message:', data.toString()));
ws.on('error', err => console.log('Error:', err.message));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));
