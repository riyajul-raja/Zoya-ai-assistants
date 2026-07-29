const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

content = content.replace(
  '  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);',
  `  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);`
);

content = content.replace(
  `  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text || '');
    setCopiedMsgId(id);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };`,
  `  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text || '');
    setCopiedMsgId(id);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
