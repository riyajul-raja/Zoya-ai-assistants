const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find the line with [Intent Router] Text:
const index = content.indexOf('console.log(`[Intent Router] Text:');
if (index !== -1) {
  const endIndex = content.indexOf(');', index) + 2;
  const oldLog = content.substring(index, endIndex);
  
  const newLog = `console.log(
        \`\\n==================================================\\n\` +
        \`Intent: \${intentResult.type}\\n\` +
        \`Module Used: \${intentResult.module || 'Gemini'}\\n\` +
        \`API Called: \${intentResult.type === 'GEMINI' ? 'YES' : 'NO'}\\n\` +
        \`==================================================\\n\`
      );`;
      
  content = content.replace(oldLog, newLog);
  fs.writeFileSync('src/App.tsx', content);
} else {
  console.log("Could not find the log line.");
}
