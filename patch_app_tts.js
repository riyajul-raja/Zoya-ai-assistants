import fs from 'fs/promises';

const content = await fs.readFile('src/App.tsx', 'utf-8');

// Replace import
let updated = content.replace(/import \{ getZoyaResponseStream \} from "\.\/services\/geminiService";/, 'import { getZoyaResponseStream, getZoyaAudio } from "./services/geminiService";');

// Replace TTS logic
updated = updated.replace(/const queueSentenceSpeak = \(sentence: string, isFromHistory: boolean = false, msgId: string, skipSpeech: boolean = false\) => \{[\s\S]*?if \(!isFromHistory && !isMuted\) \{[\s\S]*?window\.speechSynthesis\.speak\(utterance\);[\s\S]*?\}[\s\S]*?\};/, `const queueSentenceSpeak = async (sentence: string, isFromHistory: boolean = false, msgId: string, skipSpeech: boolean = false) => {
    if (!sentence.trim()) return;
    
    // In chat mode, if we are NOT muted, use getZoyaAudio
    if (!isFromHistory && !isMuted && !skipSpeech) {
      try {
        const base64Audio = await getZoyaAudio(sentence);
        if (base64Audio) {
           const audio = new Audio("data:audio/wav;base64," + base64Audio);
           await audio.play();
        }
      } catch(e) {
        console.error("Audio playback error", e);
      }
    }
  };`);

// Remove window.speechSynthesis.cancel() inside handleSend and toggleCamera
updated = updated.replace(/window\.speechSynthesis\.cancel\(\);/g, '// speechSynthesis removed');

await fs.writeFile('src/App.tsx', updated);
