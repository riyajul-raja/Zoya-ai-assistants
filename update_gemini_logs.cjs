const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

let count = 0;
content = content.replace(
  'export async function getZoyaResponseStream(',
  `let requestCount = 0;
export async function getZoyaResponseStream(`
);

content = content.replace(
  '  try {\n    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });',
  `  try {
    requestCount++;
    console.log(\`[API Request] Sending request #\${requestCount} for prompt: "\${prompt.substring(0, 30)}..."\`);
    
    const key = process.env.GEMINI_API_KEY || '';
    console.log(\`[API Key Rotation] Selected key: \${key ? key.substring(0, 6) + '***' : 'NONE'}. Rotation is NOT implemented (single key used).\`);
    const ai = new GoogleGenAI({ apiKey: key });`
);

fs.writeFileSync('src/services/geminiService.ts', content);
