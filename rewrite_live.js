import fs from 'fs/promises';

const content = `
import { getZoyaResponseStream } from "./geminiService";

export class LiveSessionManager {
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  private recognition: any = null;
  private isListening: boolean = false;
  private stopRequested: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onUIAction: (panelName: string) => void = () => {};
  
  constructor() {}

  async start(
    useMic: boolean = true, 
    isProfessionalMode: boolean = false, 
    environmentContext: string = "",
    history: { sender: "user" | "zoya"; text: string; image?: string }[] = []
  ) {
    this.stopRequested = false;
    this.onStateChange("listening");
    
    if (useMic) {
      this.startListening(isProfessionalMode, environmentContext, history);
    }
  }

  private startListening(isProfessionalMode: boolean, environmentContext: string, history: any[]) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onresult = async (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      if (transcript && transcript.trim()) {
        this.stopListening();
        this.onMessage("user", transcript);
        this.onStateChange("processing");
        
        try {
          let fullResponse = "";
          await getZoyaResponseStream(
            transcript,
            history,
            undefined, // no image frames for now
            isProfessionalMode,
            environmentContext,
            (chunk) => {
              this.onMessage("zoya", chunk);
              fullResponse = chunk; // accumulated text
            }
          );
          
          this.onStateChange("speaking");
          if (!this.isMuted) {
            this.playTTS(fullResponse, isProfessionalMode, environmentContext, history);
          } else {
            this.onStateChange("listening");
            if (!this.stopRequested) this.startListening(isProfessionalMode, environmentContext, history);
          }
        } catch (error) {
          console.error("LiveSession error:", error);
          this.onStateChange("listening");
          if (!this.stopRequested) this.startListening(isProfessionalMode, environmentContext, history);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
    };

    this.recognition.onend = () => {
      if (!this.stopRequested && !this.isPlaying && this.onStateChange !== undefined) {
         // Optionally restart listening if it stopped unexpectedly
         // this.recognition.start();
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.error("Failed to start recognition", e);
    }
  }

  private stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  private playTTS(text: string, isProfessionalMode: boolean, environmentContext: string, history: any[]) {
    this.isPlaying = true;
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const indianFemale = voices.find(v => (v.name.includes('India') || v.lang === 'en-IN') && (v.name.includes('Female') || v.name.includes('Zira')));
    if (indianFemale) utterance.voice = indianFemale;
    
    utterance.pitch = 1.1;
    utterance.rate = 1.0;
    
    utterance.onend = () => {
      this.isPlaying = false;
      if (!this.stopRequested) {
        this.onStateChange("listening");
        this.startListening(isProfessionalMode, environmentContext, history);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    this.stopRequested = true;
    this.stopListening();
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.onStateChange("idle");
  }

  sendText(text: string) {
    // Treat sendText similarly, pass it to stream and wait
    this.onMessage("user", text);
    this.onStateChange("processing");
    this.stopListening();
    
    let fullResponse = "";
    getZoyaResponseStream(
      text,
      [],
      undefined,
      false,
      "",
      (chunk) => {
        this.onMessage("zoya", chunk);
        fullResponse = chunk;
      }
    ).then(() => {
      this.onStateChange("speaking");
      if (!this.isMuted) {
        this.playTTS(fullResponse, false, "", []);
      } else {
        this.onStateChange("listening");
        if (!this.stopRequested) this.startListening(false, "", []);
      }
    }).catch((err) => {
      console.error("sendText error:", err);
      this.onStateChange("listening");
      if (!this.stopRequested) this.startListening(false, "", []);
    });
  }

  sendVideoFrame(base64Data: string) {
    // Ignoring video frames in REST API fallback to avoid spamming the endpoint.
  }

  getAudioData() {
    // Mock audio data for the UI visualizer when listening
    const volume = this.isListening ? Math.random() * 0.1 : 0;
    const highEnergy = this.isListening ? Math.random() * 0.05 : 0;
    return { volume, highEnergy };
  }
}
`;
await fs.writeFile('src/services/liveService.ts', content);
