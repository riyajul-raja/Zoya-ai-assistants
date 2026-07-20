const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `    }).filter(Boolean);

    handleTextCommand(textInput, true, safeImageStrings);
    setTextInput("");
    setSelectedImages([]);
  };`;

const replacement = `    }).filter(Boolean);

    let commandText = textInput;
    if (isImageMode) {
      commandText = \`generate image of \${textInput}\`;
      setIsImageMode(false);
    }

    handleTextCommand(commandText, true, safeImageStrings);
    setTextInput("");
    setSelectedImages([]);
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
