const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {',
  '  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {\n    console.log("[handleTextCommand] Called with:", finalTranscript.substring(0, 30));'
);

fs.writeFileSync('src/App.tsx', content);
