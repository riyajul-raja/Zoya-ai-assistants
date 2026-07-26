const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/    const fallback = \`API Limit Reached or Error\. Zoya is resting\. Details: \$\{error\.message \|\| String\(error\)\}\`;\n    if \(onChunk\) onChunk\(fallback\);\n    return fallback;/m, '    throw error;');

content = content.replace(/    return \`API Limit Reached or Error\. Zoya is resting\. Details: \$\{error\.message \|\| String\(error\)\}\`;/m, '    throw error;');

fs.writeFileSync('src/services/geminiService.ts', content);
