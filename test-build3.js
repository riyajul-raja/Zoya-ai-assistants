import { defineConfig, build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-src3.js', `
  const groqKey1 = import.meta.env.VITE_GROQ_API_KEY;
  const groqKey2 = process.env.GROQ_API_KEY;
  console.log({ groqKey1, groqKey2 });
`);

process.env.VITE_GROQ_API_KEY = "my_groq_key_from_vercel";

await build({
  root: '.',
  build: {
    lib: { entry: 'test-src3.js', formats: ['es'] },
    write: true,
    emptyOutDir: false,
  }
});

console.log("Output test-src3:");
console.log(fs.readFileSync('dist/react-example.js', 'utf8'));
