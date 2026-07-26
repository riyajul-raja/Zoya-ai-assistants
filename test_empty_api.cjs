const http = require('http');

const data = JSON.stringify({
  prompt: "",
  history: [],
  imageFrames: []
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`HTTP Status Code: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk.toString();
  });
  res.on('end', () => {
    console.log(`Response Body:\n${responseBody}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
