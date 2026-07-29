const fs = require('fs');
let content = fs.readFileSync('src/components/ChatSidebar.tsx', 'utf8');

const anchor = `  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);`;
const addition = `  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLongPressRef = useRef<number>(0);

  const startLongPress = (id: string) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      setActiveMenuId(id);
      lastLongPressRef.current = Date.now();
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };`;

content = content.replace(anchor, addition);
fs.writeFileSync('src/components/ChatSidebar.tsx', content);
