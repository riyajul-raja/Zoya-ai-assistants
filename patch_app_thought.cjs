const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);`;
const replacement = `  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeThought, setActiveThought] = useState<string | null>(null);`;

code = code.replace(target, replacement);

const target2 = `        responseText = await getZoyaResponseStream(
          promptToSend,
          messagesRef.current,
          capturedImageBase64s,
          isProfessionalMode,
          environmentContext,
          (currentText) => {
            setIsTyping(false);
            setIsLoading(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === responseMessageId ? { ...msg, text: currentText } : msg
              )
            );
            if (!isMuted && !skipSpeech) {
              const textToProcess = currentText.slice(lastProcessedIndex);
              const sentenceRegex = /[^.!?\\n]+[.!?\\n]+/g;
              let match;
              let tempIndex = lastProcessedIndex;
              while ((match = sentenceRegex.exec(textToProcess)) !== null) {
                const sentence = match[0];
                queueSentenceSpeak(sentence);
                tempIndex = lastProcessedIndex + match.index + sentence.length;
              }
              lastProcessedIndex = tempIndex;
            }
          }
        );`;

const replacement2 = `        responseText = await getZoyaResponseStream(
          promptToSend,
          messagesRef.current,
          capturedImageBase64s,
          isProfessionalMode,
          environmentContext,
          (currentText) => {
            setIsTyping(false);
            setIsLoading(false);
            
            // Extract thought and clean text
            let cleanText = currentText;
            let currentThought = null;
            
            const thoughtMatch = currentText.match(/<thought>([\\s\\S]*?)(?:<\\/thought>|$)/);
            if (thoughtMatch) {
              currentThought = thoughtMatch[1].trim();
              cleanText = currentText.replace(/<thought>[\\s\\S]*?(?:<\\/thought>|$)/g, '').trim();
            }
            
            setActiveThought(currentThought);
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === responseMessageId ? { ...msg, text: cleanText } : msg
              )
            );
            if (!isMuted && !skipSpeech) {
              const textToProcess = cleanText.slice(lastProcessedIndex);
              const sentenceRegex = /[^.!?\\n]+[.!?\\n]+/g;
              let match;
              let tempIndex = lastProcessedIndex;
              while ((match = sentenceRegex.exec(textToProcess)) !== null) {
                const sentence = match[0];
                queueSentenceSpeak(sentence);
                tempIndex = lastProcessedIndex + match.index + sentence.length;
              }
              lastProcessedIndex = tempIndex;
            }
          }
        );
        setActiveThought(null);`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/App.tsx', code);
