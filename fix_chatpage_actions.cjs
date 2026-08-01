const fs = require('fs');
let content = fs.readFileSync('src/components/ChatPage.tsx', 'utf8');

// Add state
content = content.replace(
  '  const [isSidebarOpen, setIsSidebarOpen] = useState(false);',
  `  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text || '');
    setCopiedMsgId(id);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const handleReadAloud = (text: string) => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
    if (!voice && voices.length > 0) voice = voices[0];
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (id: string, feedback: 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m));
  };`
);

fs.writeFileSync('src/components/ChatPage.tsx', content);
