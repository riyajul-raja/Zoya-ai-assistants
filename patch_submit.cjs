const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    // Stop voice dictation if active
    if (isInputMicActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsInputMicActive(false);
    }

    handleTextCommand(textInput, true);
    setTextInput("");
  };`;

const newSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && selectedImages.length === 0) return;
    
    // Stop voice dictation if active
    if (isInputMicActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsInputMicActive(false);
    }

    handleTextCommand(textInput, true, selectedImages);
    setTextInput("");
    setSelectedImages([]);
  };`;

code = code.replace(oldSubmit, newSubmit);

fs.writeFileSync('src/App.tsx', code);
