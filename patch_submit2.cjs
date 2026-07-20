const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
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

const replacementSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && selectedImages.length === 0) return;
    
    // Stop voice dictation if active
    if (isInputMicActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      setIsInputMicActive(false);
    }

    // STRICT STATE SANITIZATION: ensure selectedImages is purely strings
    const safeImageStrings = selectedImages.map((img: any) => {
      if (typeof img === 'string') {
        return img.startsWith('data:') || img.startsWith('blob:') || img.startsWith('http') ? img : \`data:image/jpeg;base64,\${img}\`;
      }
      if (img instanceof File || img instanceof Blob) {
        try {
          return URL.createObjectURL(img);
        } catch (e) {
          return "";
        }
      }
      return "";
    }).filter(Boolean);

    handleTextCommand(textInput, true, safeImageStrings);
    setTextInput("");
    setSelectedImages([]);
  };`;

code = code.replace(targetSubmit, replacementSubmit);
fs.writeFileSync('src/App.tsx', code);
