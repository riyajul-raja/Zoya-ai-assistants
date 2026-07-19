const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldState = `  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('isZoyaUnlocked') === 'true';
  });`;
const newState = `  const [isUnlocked, setIsUnlocked] = useState(false);
  
  useEffect(() => {
    sessionStorage.removeItem('isZoyaUnlocked');
  }, []);`;
code = code.replace(oldState, newState);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched isUnlocked");
