import { build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-src.js', `
  const env = import.meta.env;
  console.log(env.VITE_DYNAMIC_KEY);
`);

process.env.VITE_DYNAMIC_KEY = "hello_dynamic";

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
