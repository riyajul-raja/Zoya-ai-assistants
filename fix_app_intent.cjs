const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `{ id: responseMessageId, sender: "zoya", role: "model", text: intentResult.response || "" }`;
const newCode = `{ id: responseMessageId, sender: "zoya", role: "model", text: intentResult.response || "", debugInfo: { intent: "LOCAL", apiUsed: false, modelName: "N/A", isCached: false, responseTimeMs: 0, status: "Success" } }`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/App.tsx', content);
