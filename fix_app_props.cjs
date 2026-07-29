const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add handleRegenerateMessage to ChatPage props
content = content.replace(
  '            setIsInputReadOnly={setIsInputReadOnly}\n            handleImageUpload={handleImageUpload}\n            setIsPlusMenuOpen={setIsPlusMenuOpen}',
  '            setIsInputReadOnly={setIsInputReadOnly}\n            handleImageUpload={handleImageUpload}\n            setIsPlusMenuOpen={setIsPlusMenuOpen}\n            handleRegenerateMessage={handleRegenerateMessage}'
);
fs.writeFileSync('src/App.tsx', content);
