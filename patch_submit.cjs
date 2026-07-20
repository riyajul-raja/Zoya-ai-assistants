const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        role: "user",
        text: finalTranscript,
        image: capturedImageBase64s.length > 0 ? \`data:image/jpeg;base64,\${capturedImageBase64s[0]}\` : undefined,
        images: capturedImageBase64s.length > 0 ? capturedImageBase64s.map(b64 => \`data:image/jpeg;base64,\${b64}\`) : undefined,
      },
    ]);`;

const replacement = `    // 1. SAFE URL CREATION
    const safeImages = capturedImageBase64s.map(img => {
      if (typeof img === 'string') {
        return img.startsWith('data:') ? img : \`data:image/jpeg;base64,\${img}\`;
      }
      if (img instanceof File || img instanceof Blob) {
        return URL.createObjectURL(img);
      }
      return "";
    }).filter(Boolean);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        role: "user",
        text: finalTranscript,
        image: safeImages.length > 0 ? safeImages[0] : undefined,
        images: safeImages.length > 0 ? safeImages : undefined,
      },
    ]);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
