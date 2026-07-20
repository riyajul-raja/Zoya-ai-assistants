const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. State change
code = code.replace(
  /const \[selectedImageBase64, setSelectedImageBase64\] = useState<string \| null>\(null\);/g,
  "const [selectedImages, setSelectedImages] = useState<string[]>([]);"
);

// 2. handleImageUpload
code = code.replace(
  /const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?e\.target\.value = "";\n  \};/g,
  `const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImages((prev) => [...prev, result.split(",")[1]]);
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = "";
  };`
);

// We need to add "multiple" attribute to the input file element.
code = code.replace(
  /<input\n\s*type="file"\n\s*accept="image\/\*"\n\s*className="hidden"/g,
  '<input\\n                    type="file"\\n                    multiple\\n                    accept="image/*"\\n                    className="hidden"'
);

// 3. handleTextCommand signature and logic
code = code.replace(
  /const handleTextCommand = useCallback\(async \(finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64: string \| null = null\) => \{/g,
  "const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {"
);

code = code.replace(
  /if \(!finalTranscript\.trim\(\) && !attachedImageBase64\) \{/g,
  "if (!finalTranscript.trim() && attachedImageBase64s.length === 0) {"
);

code = code.replace(
  /let capturedImageBase64: string \| undefined = attachedImageBase64 \|\| undefined;/g,
  "let capturedImageBase64s: string[] = [...attachedImageBase64s];"
);

// In the camera capture logic:
code = code.replace(
  /if \(isCameraActive && !capturedImageBase64\) \{/g,
  "if (isCameraActive && capturedImageBase64s.length === 0) {"
);
code = code.replace(
  /capturedImageBase64 = dataUrl\.split\(","\)\[1\];/g,
  "capturedImageBase64s.push(dataUrl.split(',')[1]);"
);

// When appending the user message
code = code.replace(
  /image: capturedImageBase64 \? `data:image\/jpeg;base64,\$\{capturedImageBase64\}` : undefined,/g,
  "image: capturedImageBase64s.length > 0 ? `data:image/jpeg;base64,${capturedImageBase64s[0]}` : undefined,"
);

// In the liveSessionRef check
code = code.replace(
  /if \(liveSessionRef\.current && !attachedImageBase64\) \{/g,
  "if (liveSessionRef.current && attachedImageBase64s.length === 0) {"
);

// Check isHighThinking
code = code.replace(
  /const isHighThinking = !!capturedImageBase64 \|\| \/think\|solve\|complex\|calculate\|math\|reason\|puzzle\|code\|debug\|logic\/i\.test\(finalTranscript\);/g,
  "const isHighThinking = (capturedImageBase64s.length > 0) || /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(finalTranscript);"
);

// Update getZoyaResponseStream call
code = code.replace(
  /responseText = await getZoyaResponseStream\(\n\s*finalTranscript,\n\s*messagesRef\.current,\n\s*capturedImageBase64,/g,
  `responseText = await getZoyaResponseStream(
          finalTranscript,
          messagesRef.current,
          capturedImageBase64s,`
);

// 4. handleTextSubmit
code = code.replace(
  /handleTextCommand\(textInput, false, selectedImageBase64\);\n\s*setTextInput\(""\);\n\s*setSelectedImageBase64\(null\);/g,
  `handleTextCommand(textInput, false, selectedImages);
    setTextInput("");
    setSelectedImages([]);`
);

// 5. In UI render logic
// Replace disabled condition
code = code.replace(
  /disabled=\{\!textInput\.trim\(\) && \!selectedImageBase64\}/g,
  "disabled={!textInput.trim() && selectedImages.length === 0}"
);

// Replace Image Preview UI
const oldPreviewUI = `{selectedImageBase64 && (
                <div className="relative mt-2 p-2 border border-white/10 rounded-lg bg-black/20 w-fit">
                  <img src={\`data:image/jpeg;base64,\${selectedImageBase64}\`} className="h-16 w-16 object-cover rounded-md" alt="Attached" />
                  <button
                    type="button"
                    onClick={() => setSelectedImageBase64(null)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 shadow-md"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}`;

const newPreviewUI = `{selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 p-2 border border-white/10 rounded-lg bg-black/20 w-fit max-w-full overflow-x-auto">
                  {selectedImages.map((base64, index) => (
                    <div key={index} className="relative shrink-0">
                      <img src={\`data:image/jpeg;base64,\${base64}\`} className="h-16 w-16 object-cover rounded-md border border-white/20" alt={\`Attached \${index + 1}\`} />
                      <button
                        type="button"
                        onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 shadow-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}`;

code = code.replace(oldPreviewUI, newPreviewUI);

fs.writeFileSync('src/App.tsx', code);
