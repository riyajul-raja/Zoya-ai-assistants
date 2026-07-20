const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  'ImagePlus, Paperclip } from "lucide-react";',
  'ImagePlus, Paperclip, Plus, Sparkles, Image as ImageIcon } from "lucide-react";'
);
fs.writeFileSync('src/App.tsx', code);
