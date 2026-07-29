const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldLog = /console\.log\(\`\\\[Intent Router\\\] Text: "\$\{finalTranscript\.substring\(0,20\)\}" => \$\{intentResult\.type\} \(\$\{intentResult\.module \|\| 'N\/A'\}\)\`\);/g;

const newLog = `console.log(
        \`\\n==================================================\\n\` +
        \`Intent: \${intentResult.type}\\n\` +
        \`Module Used: \${intentResult.module || 'Gemini'}\\n\` +
        \`API Called: \${intentResult.type === 'GEMINI' ? 'YES' : 'NO'}\\n\` +
        \`==================================================\\n\`
      );`;

content = content.replace(oldLog, newLog);
fs.writeFileSync('src/App.tsx', content);
