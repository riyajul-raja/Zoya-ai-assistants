const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<input\\n                    type="file"\\n                    multiple\\n                    accept="image\/\*"\\n                    className="hidden"/g,
  \`<input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"\`
);

fs.writeFileSync('src/App.tsx', code);
