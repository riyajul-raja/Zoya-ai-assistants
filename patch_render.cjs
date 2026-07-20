const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update ChatMessage interface
code = code.replace(
  /image\?: string;/,
  "image?: string;\n  images?: string[];"
);

// Update handleTextCommand image setting
code = code.replace(
  /image: capturedImageBase64s\.length > 0 \? \`data:image\/jpeg;base64,\$\{capturedImageBase64s\[0\]\}\` : undefined,/,
  "image: capturedImageBase64s.length > 0 ? \`data:image/jpeg;base64,\${capturedImageBase64s[0]}\` : undefined,\n        images: capturedImageBase64s.length > 0 ? capturedImageBase64s.map(b64 => \`data:image/jpeg;base64,\${b64}\`) : undefined,"
);

fs.writeFileSync('src/App.tsx', code);
