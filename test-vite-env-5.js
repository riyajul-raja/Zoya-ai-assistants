import { build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-src.js', `
  const env = import.meta.env;
  console.log(env.VITE_GROQ_API_KEY);
`);

await build({
  root: '.',
  build: {
    lib: { entry: 'test-src.js', formats: ['es'] },
    write: true,
    emptyOutDir: false,
  }
});

console.log("Output:");
console.log(fs.readFileSync('dist/react-example.js', 'utf8'));
