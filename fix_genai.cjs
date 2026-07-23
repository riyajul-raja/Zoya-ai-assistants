const fs = require('fs');
let paths = ['api/chat.ts', 'api/chat/stream.ts', 'src/services/geminiService.ts'];

for (let p of paths) {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/new GoogleGenAI\(\{ apiKey: key(.*?)\}\)/g, 'new GoogleGenAI({ apiKey: key.trim(), httpOptions: { headers: { "x-goog-api-key": key.trim() } } })');
  fs.writeFileSync(p, content);
  console.log("Fixed " + p);
}
