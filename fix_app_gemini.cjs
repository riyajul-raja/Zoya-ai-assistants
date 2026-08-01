const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update DebugInfo import
content = content.replace(
  'import { getZoyaResponse, getZoyaResponseStream } from "./services/geminiService";',
  'import { getZoyaResponse, getZoyaResponseStream, DebugInfo } from "./services/geminiService";'
);

// Update ChatMessage interface
const chatMessageInterfaceMatch = content.match(/export interface ChatMessage \{[\s\S]*?\n\}/);
if (chatMessageInterfaceMatch) {
  let newInterface = chatMessageInterfaceMatch[0].replace(
    /feedback\?: "like" \| "dislike";\n\}/,
    'feedback?: "like" | "dislike";\n  debugInfo?: Partial<DebugInfo>;\n}'
  );
  content = content.replace(chatMessageInterfaceMatch[0], newInterface);
}

// Update the call to getZoyaResponseStream
const callStreamMatch = content.match(/responseText = await getZoyaResponseStream\([\s\S]*?prev\.map\(\(msg\) =>[\s\S]*?msg\.id === responseMessageId \? \{ \.\.\.msg, text: currentText \} : msg[\s\S]*?\)\s*\);\s*if \(\!isMuted/);

if (callStreamMatch) {
  // Let's just use string replace for the call assignment and update messages later.
  content = content.replace(
    'responseText = await getZoyaResponseStream(',
    'const responseStreamResult = await getZoyaResponseStream('
  );
  
  // Now we need to extract responseText and update the message with debugInfo
  content = content.replace(
    /if \(!isMuted && !skipSpeech\) \{\n              const textToProcess = currentText.slice\(lastProcessedIndex\);/,
    `if (!isMuted && !skipSpeech) {\n              const textToProcess = currentText.slice(lastProcessedIndex);`
  );
  
  // Find where it ends the call
  // Actually, wait, it's easier to find the end of the `try {` block
  // The try block in App.tsx:
  // try {
  //   ... queueSentenceSpeak
  //   responseText = await getZoyaResponseStream(...)
  //   if (liveSessionRef.current) ...
  // }
}

fs.writeFileSync('src/App.tsx', content);
