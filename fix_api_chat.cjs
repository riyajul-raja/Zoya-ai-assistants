const fs = require('fs');

const files = ['api/chat.ts', 'api/chat/stream.ts'];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/model: "gemini-2\.5-flash"/g, 'model: targetModel || "gemini-2.5-flash"');
        content = content.replace(/let targetModel = "gemini";/, 'let targetModel = "gemini-2.5-flash";');
        content = content.replace(/model: selectedModel \|\| "gemini-2\.5-flash"/g, 'model: targetModel || "gemini-2.5-flash"');
        
        // Add targetModel definition to api/chat.ts if not present
        if (file === 'api/chat.ts' && !content.includes('let targetModel =')) {
            content = content.replace(/const geminiKey = getGeminiKey\(\);/, 'let targetModel = selectedModel || "gemini-2.5-flash";\n\n        const geminiKey = getGeminiKey();');
        }
        
        fs.writeFileSync(file, content);
    }
}
