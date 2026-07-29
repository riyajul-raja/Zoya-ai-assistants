const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The toggleInputDictation method starts around line 1946 (before rewrite_voice)
// Let's just find and replace inside toggleInputDictation
const dictationRegex = /const toggleInputDictation = \(\) => \{[\s\S]*?recognition\.start\(\);\n    \} catch \(e\) \{[\s\S]*?\}\n  \};/;
let dictationMatch = content.match(dictationRegex);
if (dictationMatch) {
  let modified = dictationMatch[0].replace(/setIsSessionActive\(true\);/g, '');
  modified = modified.replace(/setIsSessionActive\(false\);/g, '');
  content = content.replace(dictationMatch[0], modified);
  fs.writeFileSync('src/App.tsx', content);
} else {
  console.log("Could not find toggleInputDictation");
}
