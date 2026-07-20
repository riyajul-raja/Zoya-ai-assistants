const fs = require('fs');

let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// Replace getZoyaResponseStream signature and logic
code = code.replace(
  /imageFrame\?: string,/g,
  "imageFrames?: string | string[],"
);

// We need to fix the logic for both getZoyaResponseStream and getZoyaResponse
// Let's replace the whole blocks

const patchLogic = (funcName) => {
  const isImageAnalysisRegex = /const isImageAnalysis = !!imageFrame;/g;
  code = code.replace(
    isImageAnalysisRegex,
    "const normalizedImageFrames = Array.isArray(imageFrames) ? imageFrames : (imageFrames ? [imageFrames] : []);\n    const isImageAnalysis = normalizedImageFrames.length > 0;"
  );

  const blockToReplace = /let currentMessageParts: any\[\] = \[\];\n    if \(imageFrame\) \{\n      currentMessageParts = \[\n        \{\n          inlineData: \{\n            mimeType: "image\/jpeg",\n            data: imageFrame,\n          \}\n        \},\n        \{\n          text: `\$\{hiddenContext\}\$\{prompt\}`\n        \}\n      \];\n    \} else \{\n      currentMessageParts = \[\{ text: `\$\{hiddenContext\}\$\{prompt\}` \}\];\n    \}/g;

  code = code.replace(blockToReplace, `let currentMessageParts: any[] = [];
    if (normalizedImageFrames.length > 0) {
      currentMessageParts = normalizedImageFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame,
        }
      }));
      currentMessageParts.push({ text: \\\`\\\${hiddenContext}\\\${prompt}\\\` });
    } else {
      currentMessageParts = [{ text: \\\`\\\${hiddenContext}\\\${prompt}\\\` }];
    }`);
};

patchLogic();

fs.writeFileSync('src/services/geminiService.ts', code);
