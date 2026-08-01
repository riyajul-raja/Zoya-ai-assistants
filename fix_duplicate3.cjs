const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '    if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {\n      setAppState("idle");\n      return;\n    }',
  '    if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {\n      setAppState("idle");\n      isProcessingRequestRef.current = false;\n      return;\n    }'
);

content = content.replace(
  '        return; // Halt here, don\'t call Gemini',
  '        isProcessingRequestRef.current = false;\n        return; // Halt here, don\'t call Gemini'
);

content = content.replace(
  '    if (liveSessionRef.current && attachedImageBase64s.length === 0) {\n      liveSessionRef.current.sendText(finalTranscript);\n      return;\n    }',
  '    if (liveSessionRef.current && attachedImageBase64s.length === 0) {\n      liveSessionRef.current.sendText(finalTranscript);\n      isProcessingRequestRef.current = false;\n      return;\n    }'
);

content = content.replace(
  '      if (!isMuted && !skipSpeech) {\n        speakMessageText("Here is the image you requested");\n      }\n      return;\n    }',
  '      if (!isMuted && !skipSpeech) {\n        speakMessageText("Here is the image you requested");\n      }\n      isProcessingRequestRef.current = false;\n      return;\n    }'
);


fs.writeFileSync('src/App.tsx', content);
