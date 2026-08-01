const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '      setAppState("idle");\n    }\n  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking]);',
  '      setAppState("idle");\n    }\n    isProcessingRequestRef.current = false;\n  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking]);'
);

fs.writeFileSync('src/App.tsx', content);
