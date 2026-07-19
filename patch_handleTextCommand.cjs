const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldHandle = `  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    autoTriggerUIFromText(finalTranscript);

    let capturedImageBase64: string | undefined = undefined;
    if (isCameraActive) {`;

const newHandle = `  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64: string | null = null) => {
    if (!finalTranscript.trim() && !attachedImageBase64) {
      setAppState("idle");
      return;
    }

    autoTriggerUIFromText(finalTranscript);

    let capturedImageBase64: string | undefined = attachedImageBase64 || undefined;
    if (isCameraActive && !capturedImageBase64) {`;

code = code.replace(oldHandle, newHandle);

const oldLive = `    // If live session is active (either because voice is active or camera is ON), send text through it
    if (liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }`;

const newLive = `    // If live session is active (either because voice is active or camera is ON), send text through it
    // But if we have an attached image, fallback to standard REST API with gemini-3.1-pro-preview
    if (liveSessionRef.current && !attachedImageBase64) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }`;

code = code.replace(oldLive, newLive);

const oldHighThinking = `      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);`;
const newHighThinking = `      const isHighThinking = !!capturedImageBase64 || /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);`;

code = code.replace(oldHighThinking, newHighThinking);

const oldSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    if (isInputMicActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsInputMicActive(false);
    }

    handleTextCommand(textInput, true);
    setTextInput("");
  };`;

const newSubmit = `  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedImageBase64) return;

    if (isInputMicActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsInputMicActive(false);
    }

    handleTextCommand(textInput, true, selectedImageBase64);
    setTextInput("");
    setSelectedImageBase64(null);
  };`;

code = code.replace(oldSubmit, newSubmit);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched handleTextCommand and handleTextSubmit");
