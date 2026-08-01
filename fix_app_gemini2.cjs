const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `        );
        
        setIsTyping(false);`;

const newCode = `        );
        
        responseText = responseStreamResult.text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseMessageId ? { ...msg, text: responseText, debugInfo: responseStreamResult.debugInfo } : msg
          )
        );

        setIsTyping(false);`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/App.tsx', content);
