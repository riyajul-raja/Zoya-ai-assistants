const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add a ref to track processing
content = content.replace(
  '  const messagesRef = useRef(messages);',
  '  const messagesRef = useRef(messages);\n  const isProcessingRequestRef = useRef(false);'
);

content = content.replace(
  '  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {',
  `  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {
    if (isProcessingRequestRef.current) {
      console.warn("[handleTextCommand] Duplicate request blocked.");
      return;
    }
    isProcessingRequestRef.current = true;`
);

// We need to make sure we reset it. We can do a try...finally, or just reset it at the end of handleTextCommand
// However, handleTextCommand has early returns.
content = content.replace(
  '    if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {\n      setAppState("idle");\n      return;\n    }',
  '    if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {\n      setAppState("idle");\n      isProcessingRequestRef.current = false;\n      return;\n    }'
);

content = content.replace(
  '        return; // Halt here, don\'t call Gemini',
  '        isProcessingRequestRef.current = false;\n        return; // Halt here, don\'t call Gemini'
);

content = content.replace(
  '      liveSessionRef.current.sendText(finalTranscript);\n      return;',
  '      liveSessionRef.current.sendText(finalTranscript);\n      isProcessingRequestRef.current = false;\n      return;'
);

content = content.replace(
  '      if (!isMuted && !skipSpeech) {\n        speakMessageText("Here is the image you requested");\n      }\n      return;\n    }',
  '      if (!isMuted && !skipSpeech) {\n        speakMessageText("Here is the image you requested");\n      }\n      isProcessingRequestRef.current = false;\n      return;\n    }'
);

// And at the very end of handleTextCommand:
// We need to find the end of it. The function is quite large.
// Let's use a simpler approach. Just wrap the body in a try-finally block. Wait, replacing the whole body is tricky.
