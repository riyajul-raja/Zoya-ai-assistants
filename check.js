import fs from 'fs';
const text = fs.readFileSync('dist/assets/index-BYxf_kj0.js', 'utf8');
const match = text.match(/VITE_[A-Z_]+/g);
const unique = [...new Set(match)];
console.log(unique);
