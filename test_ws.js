const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/chat/stream');
ws.on('open', () => console.log('connected'));
ws.on('error', (e) => console.log('error:', e.message));
ws.on('unexpected-response', (req, res) => {
    console.log('unexpected response:', res.statusCode, res.statusMessage);
});
