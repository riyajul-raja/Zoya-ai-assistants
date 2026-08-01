const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We will change toggleListening to use Web Speech API instead of Live API
const newToggleListening = `
  const toggleListening = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Instead of using Live API (which is continuous and expensive), we use one-shot STT
    // and pipe it to our Smart Intent Router.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      setIsListening(false);
      setAppState("idle");
      return;
    }

    let speechDetected = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setAppState("listening");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results && event.results[0] && event.results[0][0]
          ? event.results[0][0].transcript
          : "";
          
        if (transcript && transcript.trim()) {
          speechDetected = true;
          console.log("[toggleListening] Voice Transcript:", transcript);
          // Pass to the intent router via handleTextCommand directly
          handleTextCommand(transcript, false, []);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setAppState("idle");
      };

      recognition.onend = () => {
        setIsListening(false);
        if (appState === "listening") {
            setAppState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Speech recognition initialization error:", e);
      setIsListening(false);
      setAppState("idle");
    }
  };
`;

content = content.replace(
  /const toggleListening = async \(e\?: React\.MouseEvent\) => \{[\s\S]*?\n  \};\n/,
  newToggleListening + '\n'
);

fs.writeFileSync('src/App.tsx', content);
