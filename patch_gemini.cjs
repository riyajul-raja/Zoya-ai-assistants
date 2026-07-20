const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const target = `    if (normalizedImageFrames.length > 0) {
      currentMessageParts = normalizedImageFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame,
        }
      }));`;

const replacement = `    if (normalizedImageFrames.length > 0) {
      currentMessageParts = normalizedImageFrames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame.includes(',') ? frame.split(',')[1] : frame,
        }
      }));`;

code = code.split(target).join(replacement);
fs.writeFileSync('src/services/geminiService.ts', code);
