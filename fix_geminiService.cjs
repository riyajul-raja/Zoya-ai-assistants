const fs = require('fs');

let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(/if \(key1\) keys\.push\(key1\)/g, 'if (key1) keys.push(key1.trim())')
                 .replace(/if \(key2\) keys\.push\(key2\)/g, 'if (key2) keys.push(key2.trim())')
                 .replace(/if \(key3\) keys\.push\(key3\)/g, 'if (key3) keys.push(key3.trim())')
                 .replace(/if \(key4\) keys\.push\(key4\)/g, 'if (key4) keys.push(key4.trim())')
                 .replace(/if \(keyDef && !keys\.includes\(keyDef\)\) keys\.push\(keyDef\)/g, 'if (keyDef && !keys.includes(keyDef.trim())) keys.push(keyDef.trim())');

fs.writeFileSync('src/services/geminiService.ts', content);
console.log("Updated src/services/geminiService.ts");
