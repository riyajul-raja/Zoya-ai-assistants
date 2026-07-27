const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    setAppState("processing");

    // 1. Check for browser commands`;
const replacement = `    setAppState("processing");

    // 0. Check for image generation intent
    const isImageGen = /\\b(generate|create|draw|make|render)\\b.*(?:image|picture|photo|art|drawing|portrait|illustration|wallpaper)/i.test(finalTranscript);
    if (isImageGen && attachedImageBase64s.length === 0) {
      setIsLoading(true);
      const responseMessageId = Date.now().toString() + "-z";
      
      const promptToEncode = finalTranscript
        .replace(/\\b(can you|please|generate|create|draw|make|render)\\b/gi, '')
        .replace(/\\b(an image|a picture|a photo|art|a drawing|a portrait|an illustration|a wallpaper|of)\\b/gi, '')
        .replace(/\\b(image|picture|photo|art|drawing|portrait|illustration|wallpaper)\\b/gi, '')
        .trim() || finalTranscript;
        
      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(promptToEncode || "a beautiful abstract landscape");
      const imageUrl = \`https://image.pollinations.ai/prompt/\${encodedPrompt}?seed=\${seed}&width=1024&height=1024&nologo=true\`;
      
      setMessages((prev) => [
        ...prev,
        { 
          id: responseMessageId, 
          sender: "zoya", 
          role: "model", 
          text: \`Here is the image you requested:\`,
          generatedImageUrl: imageUrl,
          generatedImagePrompt: promptToEncode
        }
      ]);
      setAppState("idle");
      setIsLoading(false);
      
      if (!isMuted && !skipSpeech) {
        speakMessageText("Here is the image you requested");
      }
      return;
    }

    // 1. Check for browser commands`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
