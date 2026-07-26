const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleDownloadImage = async (url: string, prompt: string) => {
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
  };`;

const replacement = `  const handleDownloadImage = async (url: string, prompt: string) => {
    try {
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
