const http = require('http');

const data = JSON.stringify({
  prompt: "hello",
  history: [],
  imageFrames: ["base64string123"]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
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
