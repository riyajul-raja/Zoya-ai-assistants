import fs from 'fs/promises';

const content = await fs.readFile('src/services/liveService.ts', 'utf-8');
const updated = content.replace(/import \{ getZoyaResponseStream \} from ".\/geminiService";/g, 'import { getZoyaResponseStream, getZoyaAudio } from "./geminiService";')
  .replace(/  private playTTS\(text: string, isProfessionalMode: boolean, environmentContext: string, history: any\[\]\) \{[\s\S]*?window.speechSynthesis.speak\(utterance\);\n  \}/g, `  private async playTTS(text: string, isProfessionalMode: boolean, environmentContext: string, history: any[]) {
    this.isPlaying = true;
    try {
      const base64Audio = await getZoyaAudio(text);
      if (base64Audio) {
        const audio = new Audio("data:audio/wav;base64," + base64Audio);
        audio.onended = () => {
          this.isPlaying = false;
          if (!this.stopRequested) {
            this.onStateChange("listening");
            this.startListening(isProfessionalMode, environmentContext, history);
          }
        };
        await audio.play();
        return;
      }
    } catch(e) {
      console.error("TTS error", e);
    }
    
    // fallback
    this.isPlaying = false;
    if (!this.stopRequested) {
      this.onStateChange("listening");
      this.startListening(isProfessionalMode, environmentContext, history);
    }
  }`);
await fs.writeFile('src/services/liveService.ts', updated);
