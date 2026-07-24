const fs = require('fs');

// 1. api/envHelper.ts
let envHelper = fs.readFileSync('api/envHelper.ts', 'utf8');
envHelper = envHelper.replace(/if \(key1\) keys\.push\(key1\.trim\(\)\);/g, 'if (key1 && !key1.trim().startsWith("ya29.")) keys.push(key1.trim());');
envHelper = envHelper.replace(/if \(key2\) keys\.push\(key2\.trim\(\)\);/g, 'if (key2 && !key2.trim().startsWith("ya29.")) keys.push(key2.trim());');
envHelper = envHelper.replace(/if \(key3\) keys\.push\(key3\.trim\(\)\);/g, 'if (key3 && !key3.trim().startsWith("ya29.")) keys.push(key3.trim());');
envHelper = envHelper.replace(/if \(key4\) keys\.push\(key4\.trim\(\)\);/g, 'if (key4 && !key4.trim().startsWith("ya29.")) keys.push(key4.trim());');
fs.writeFileSync('api/envHelper.ts', envHelper);

// 2. src/services/geminiService.ts
let geminiSvc = fs.readFileSync('src/services/geminiService.ts', 'utf8');
geminiSvc = geminiSvc.replace(/if \(key1\) keys\.push\(key1\.trim\(\)\);/g, 'if (key1 && !key1.trim().startsWith("ya29.")) keys.push(key1.trim());');
geminiSvc = geminiSvc.replace(/if \(key2\) keys\.push\(key2\.trim\(\)\);/g, 'if (key2 && !key2.trim().startsWith("ya29.")) keys.push(key2.trim());');
geminiSvc = geminiSvc.replace(/if \(key3\) keys\.push\(key3\.trim\(\)\);/g, 'if (key3 && !key3.trim().startsWith("ya29.")) keys.push(key3.trim());');
geminiSvc = geminiSvc.replace(/if \(key4\) keys\.push\(key4\.trim\(\)\);/g, 'if (key4 && !key4.trim().startsWith("ya29.")) keys.push(key4.trim());');
fs.writeFileSync('src/services/geminiService.ts', geminiSvc);

console.log("Filtered ALL OAuth tokens");
