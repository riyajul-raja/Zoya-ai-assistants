import fs from 'fs/promises';

const content = await fs.readFile('api/tts.ts', 'utf-8');
const updated = content.replace(
  /const { text } = req\.body;/,
  `const { text: originalText } = req.body;
  const text = "Generate an audio recording of the following text: " + originalText;`
);

await fs.writeFile('api/tts.ts', updated);
