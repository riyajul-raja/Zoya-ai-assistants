const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleTextSubmit = (e: React.FormEvent) => {`;
const replacement = `  const handleCopyMessage = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRegenerateMessage = (msgId: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    
    let userMsg: any = null;
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        userMsg = messages[i];
        userMsgIndex = i;
        break;
      }
    }
    
    if (userMsg) {
      if (navigator.vibrate) navigator.vibrate(20);
      setMessages(prev => prev.slice(0, userMsgIndex));
      
      const images = [];
      if (userMsg.images) {
        images.push(...userMsg.images);
      } else if (userMsg.image) {
        images.push(userMsg.image);
      }
      
      const base64Images = images.map((img: string) => {
        if (img.startsWith('data:image')) {
          return img.split(',')[1] || "";
        }
        return "";
      }).filter(Boolean);
      
      handleTextCommand(userMsg.text, true, base64Images);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
