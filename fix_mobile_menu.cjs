const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  '  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);',
  `  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);
  const msgLongPressTimer = useRef<NodeJS.Timeout | null>(null);

  const startMsgLongPress = (id: string) => {
    if (msgLongPressTimer.current) clearTimeout(msgLongPressTimer.current);
    msgLongPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) try { navigator.vibrate(50); } catch (e) {}
      setActiveMobileMenuId(id);
    }, 500);
  };
  const cancelMsgLongPress = () => {
    if (msgLongPressTimer.current) {
      clearTimeout(msgLongPressTimer.current);
      msgLongPressTimer.current = null;
    }
  };
  
  useEffect(() => {
    const handleClickOutside = () => setActiveMobileMenuId(null);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
