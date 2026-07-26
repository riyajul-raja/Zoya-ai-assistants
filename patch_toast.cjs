const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find the catch block in handleTextCommand
const target = `      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking]);`;

const replacement = `      }
      triggerToast("Error: " + errMsg.substring(0, 50));
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, isCameraActive, isProfessionalMode, environmentContext, isDeepThinking, triggerToast]);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
