const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {`;
const replacement = `  const handleDownloadImage = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = \`zoya_\${prompt.substring(0,20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'generated'}.jpg\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };

  const handleRegenerateImage = (messageId: string, prompt: string) => {
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt || "a beautiful abstract landscape");
    const newImageUrl = \`https://image.pollinations.ai/prompt/\${encodedPrompt}?seed=\${seed}&width=1024&height=1024&nologo=true\`;
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          generatedImageUrl: newImageUrl
        };
      }
      return msg;
    }));
  };

  const handleTextCommand = useCallback(async (finalTranscript: string, skipSpeech: boolean = false, attachedImageBase64s: string[] = []) => {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
