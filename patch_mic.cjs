const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/isInputMicActive/g, 'isListening');
code = code.replace(/setIsInputMicActive/g, 'setIsListening');
code = code.replace(/isInputMicActiveRef/g, 'isListeningRef');

const toggleInputDictationTarget = `      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (isSessionActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition on error:", e);
          }
        } else {
          setIsListening(false);
          setAppState("idle");
          setIsSessionActive(false);
          if (!speechDetected) {
            setShowChat(false);
          }
        }
      };

      recognition.onend = () => {
        if (isSessionActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition on end:", e);
          }
        } else {
          setIsListening(false);
          setAppState("idle");
          setIsSessionActive(false);
          if (!speechDetected) {
            setShowChat(false);
          }
        }
      };`;

const toggleInputDictationReplacement = `      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setAppState("idle");
      };

      recognition.onend = () => {
        setIsListening(false);
        setAppState("idle");
      };`;

code = code.replace(toggleInputDictationTarget, toggleInputDictationReplacement);
fs.writeFileSync('src/App.tsx', code);
