const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);`;
  
const replacement = `  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
