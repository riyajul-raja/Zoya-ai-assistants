const fs = require('fs');

let content = fs.readFileSync('api/envHelper.ts', 'utf8');

content = content.replace(/keys\.push\(key1\)/g, 'keys.push(key1.trim())')
                 .replace(/keys\.push\(key2\)/g, 'keys.push(key2.trim())')
                 .replace(/keys\.push\(key3\)/g, 'keys.push(key3.trim())')
                 .replace(/keys\.push\(key4\)/g, 'keys.push(key4.trim())')
                 .replace(/keys\.push\(keyDef\)/g, 'keys.push(keyDef.trim())');

fs.writeFileSync('api/envHelper.ts', content);
console.log("Updated api/envHelper.ts");
