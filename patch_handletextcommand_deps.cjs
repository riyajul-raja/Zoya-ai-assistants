const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext]);`;
const replacement = `  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
