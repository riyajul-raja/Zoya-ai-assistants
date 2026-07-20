const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const oldChatLogic = `      chatSession = ai.chats.create({
        model: targetModel,
        config: targetConfig,
        history: formattedHistory,
      });
    }

    const hiddenContext = \`System Context: The current exact date and time is \${dynamicTime} (IST).\\n\\n\`;
    let messageInput: any = \`\${hiddenContext}\${prompt}\`;
    if (imageFrame) {
      messageInput = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageFrame,
          }
        },
        {
          text: \`\${hiddenContext}\${prompt}\`
        }
      ];
    }

    try {
      const responseStream = await chatSession.sendMessageStream({ message: messageInput });`;

const newChatLogic = `      const hiddenContext = \`System Context: The current exact date and time is \${dynamicTime} (IST).\\n\\n\`;
      let currentMessageParts: any[] = [];
      if (imageFrame) {
        currentMessageParts = [
          {
            inlineData: {
              data: imageFrame,
              mimeType: "image/jpeg"
            }
          },
          { text: \`\${hiddenContext}\${prompt}\` }
        ];
      } else {
        currentMessageParts = [{ text: \`\${hiddenContext}\${prompt}\` }];
      }

      const finalContents = [
        ...formattedHistory,
        {
          role: "user",
          parts: currentMessageParts
        }
      ];

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        config: targetConfig,
        contents: finalContents,
      });`;

code = code.replace(oldChatLogic, newChatLogic);

fs.writeFileSync('src/services/geminiService.ts', code);
console.log("Patched getZoyaResponseStream to use generateContentStream");
