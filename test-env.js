import { defineConfig, build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-app.js', `
  const env = import.meta.env;
  console.log(env.VITE_GROQ_API_KEY);
  console.log(import.meta.env.VITE_GROQ_API_KEY);
`);

await build({
  root: '.',
  build: {
    lib: { entry: 'test-app.js', formats: ['es'] },
    write: true,
    emptyOutDir: false,
  }
});

console.log("Output:");
console.log(fs.readFileSync('dist/test-app.js', 'utf8'));
