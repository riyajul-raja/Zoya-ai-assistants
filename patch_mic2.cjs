const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setAppState("idle");
      };

      recognition.onend = () => {
        setIsListening(false);
        setAppState("idle");
      };`;

const replacement = `      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setAppState("idle");
        setIsSessionActive(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setAppState("idle");
        setIsSessionActive(false);
      };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
