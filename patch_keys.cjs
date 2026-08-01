const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const apiKey = process\.env\.GEMINI_API_KEY[^\n]*;/g, `const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5
    ].filter(Boolean);
    const apiKey = keys[Math.floor(Math.random() * keys.length)] || keys[0];`);
  fs.writeFileSync(file, content);
}

patchFile('api/chat/stream.ts');
patchFile('api/chat.ts');
patchFile('api/tts.ts');
patchFile('api/key.ts');
