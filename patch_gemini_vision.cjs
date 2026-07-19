const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const oldModelLogic = `      const isHighThinking = /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);`;
const newModelLogic = `      const isImageAnalysis = !!imageFrame;
      const isHighThinking = isImageAnalysis || /think|solve|complex|calculate|math|reason|puzzle|code|debug|logic/i.test(prompt);`;

code = code.replace(oldModelLogic, newModelLogic);

fs.writeFileSync('src/services/geminiService.ts', code);
console.log("Patched gemini vision");
