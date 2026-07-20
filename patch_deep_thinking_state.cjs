const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [textInput, setTextInput] = useState("");`;

const replacement = `  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [textInput, setTextInput] = useState("");`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
