const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        responseText = await getZoyaResponseStream(
          finalTranscript,
          messagesRef.current,`;

const replacement = `        let promptToSend = finalTranscript;
        if (isDeepThinking) {
          promptToSend = \`[SYSTEM CONTEXT: Engage Deep Thinking Mode. Provide highly advanced, professional, and step-by-step analytical reasoning. Be strictly mindful of token limits—avoid fluff and deliver maximum high-value information.]\\n\\n\${finalTranscript}\`;
        }

        responseText = await getZoyaResponseStream(
          promptToSend,
          messagesRef.current,`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
