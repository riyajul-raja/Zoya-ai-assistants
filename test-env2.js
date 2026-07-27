import { defineConfig, build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-app2.js', `
  const env = import.meta.env;
  console.log(env.VITE_UNKNOWN_KEY);
`);

process.env.VITE_UNKNOWN_KEY = "my_secret_value";

await build({
  root: '.',
  build: {
    lib: { entry: 'test-app2.js', formats: ['es'] },
    write: true,
    emptyOutDir: false,
  }
});

console.log("Output:");
console.log(fs.readFileSync('dist/react-example.js', 'utf8'));
