const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldState = `  const [textInput, setTextInput] = useState("");`;
const newState = `  const [textInput, setTextInput] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };`;

code = code.replace(oldState, newState);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched state");
