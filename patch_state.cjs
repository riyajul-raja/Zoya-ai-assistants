const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const target = `  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [textInput, setTextInput] = useState("");`;
const replacement = `  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [textInput, setTextInput] = useState("");`;
code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
