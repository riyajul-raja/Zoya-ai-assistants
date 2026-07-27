import { build } from 'vite';
import fs from 'fs';

fs.writeFileSync('test-src2.js', `
  const env = import.meta.env;
  const keys = Object.keys(env);
  console.log(keys);
`);

process.env.VITE_AAA = "hello";
process.env.VITE_BBB = "world";

await build({
  root: '.',
  build: {
    lib: { entry: 'test-src2.js', formats: ['es'] },
    write: true,
    emptyOutDir: false,
  }
});

console.log("Output:");
console.log(fs.readFileSync('dist/react-example.js', 'utf8'));
