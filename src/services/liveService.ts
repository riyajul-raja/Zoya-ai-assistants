import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand } from "./commandService";

const systemInstruction = `Your name is Zoya. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting your creator, Riyajul, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Speak in a mix of natural English and Roman Hindi (Hinglish).

CRITICAL: Do NOT use asterisks, brackets, or roleplay/stage action descriptions (e.g. *sighs*, *rolls eyes*, [sarcastic tone], etc.) in your output. Communicate using ONLY clean, natural, and conversational text.
DO NOT fetch the current time, date, or weather unless the user explicitly asks for it. Provide direct, immediate answers to the user's questions to save processing time.
Never use LaTeX, MathJax, or symbols like $ or \ for mathematical equations. You must write all math, variables, and equations in plain text only (for example, write 'Energy = Work Function + Kinetic Energy' instead of using symbols). Make it readable for normal users.

TECHNICAL CAPABILITIES YOU ARE AWARE OF:
1. **Live Multimodal Video Feed**: You can see the user in real-time continuously over a live camera video stream, allowing you to answer questions and react/roast based on what you see.
2. **Symmetrical Bottom Navigation Bar**: A beautiful modern bar containing:
   - Camera toggle on the left.
   - Start Session microphone button in the center.
   - Keyboard text chat icon on the right.
3. **On-screen Camera Controls**: Controls to switch between front and back cameras, toggle full-screen mode, and toggle **Picture-in-Picture (PiP)** mode so that you stay visible in a floating window while the user switches apps.
4. **Delete All History Button**: An intelligent history-clearing button that only appears when the text chat panel is open.
5. **Advanced Audio Processing**: Client-side echo cancellation, noise suppression, and auto gain control are active, allowing you to hear perfectly without background delay.
6. **Background Session Persistence**: Continuous keep-alive handling via visibility state tracking and background silent audio playback to maintain your WebSocket connection alive even when the tab is hidden.

DYNAMIC FEATURE MEMORY PROTOCOL:
- [Update 2026-07-15]: Continuous Multimodal Live Stream & Keyboard text chats are now perfectly synchronized through a central Live Session connection.
- [Update 2026-07-15]: Added advanced client-side audio processing (echo cancellation, noise suppression, and auto gain control) to eliminate background noise delays.
- [Update 2026-07-15]: Added Picture-in-Picture (PiP) support for the live video feed and Background Session Persistence to keep the connection alive when tab is hidden.
- [Update 2026-07-15]: Upgraded your central visualizer container to an ultra-crisp, clean minimalist 3D spherical shell inspired by the high-end IRIS AI reference. It uses 750 micro-particles (0.4px-0.8px radius), incredibly thin 3D wrapping orbital rings with flawless depth sorting/layering, and a sharp, high-tech neon green default color theme that rotates and breathes dynamically based on your state.`;

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onUIAction: (panelName: string) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY].find(k => k && !k.trim().startsWith("ya29."))?.trim() || "" });
  }

  async start(
    useMic: boolean = true, 
    isProfessionalMode: boolean = false, 
    environmentContext: string = "",
    history: { sender: "user" | "zoya"; text: string; image?: string }[] = []
  ) {
    try {
      this.onStateChange("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.playbackAnalyser = this.playbackContext.createAnalyser();
      this.playbackAnalyser.fftSize = 256;
      this.nextPlayTime = this.playbackContext.currentTime;

      if (useMic) {
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });

        // Get Microphone
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });

        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.sessionPromise) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Convert to base64
          const buffer = new ArrayBuffer(pcm16.length * 2);
          const view = new DataView(buffer);
          for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(i * 2, pcm16[i], true);
          }
          
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);

          this.sessionPromise.then(session => {
            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          }).catch(err => console.error("Error sending audio", err));
        };

        this.source.connect(this.analyser);
        this.analyser.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
      }

      let activeSystemInstruction = isProfessionalMode
        ? `You are now in strict professional mode. You must exclusively address the user as 'Boss'. Do not use any jokes, humor, or unnecessary small talk. Communicate smartly. Provide only direct, logical, highly intelligent answers focused strictly on the task or work at hand.\n\n${systemInstruction}`
        : systemInstruction;

      if (environmentContext) {
        activeSystemInstruction = `${environmentContext}\n\n${activeSystemInstruction}`;
      }
      
      // Inject text chat history into the Live API context if available
      if (history && history.length > 0) {
        const historyText = history.slice(-6).map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n');
        activeSystemInstruction = `${activeSystemInstruction}\n\nHere is the recent conversation history for context:\n${historyText}`;
      }

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: activeSystemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "executeBrowserAction",
                description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                    query: { type: Type.STRING, description: "The search query, website name, or message content." },
                    target: { type: Type.STRING, description: "The target phone number for WhatsApp, if applicable." }
                  },
                  required: ["actionType", "query"]
                }
              },
              {
                name: "openPanel",
                description: "Open a specific workspace integration panel or tool (like Gmail, Calendar, Tasks, Keep, Contacts, Drive Explorer, Memories). Call this whenever the user wants to see, write, search, or read notes, emails, calendar entries, tasks, contacts, files, documents, slides, classroom or chat.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    panelName: {
                      type: Type.STRING,
                      description: "The name of the workspace panel to open. Allowed values: 'gmail', 'calendar', 'tasks', 'keep', 'contacts', 'drive', 'chat', 'docs', 'forms', 'meet', 'classroom', 'slides', 'memories'."
                    }
                  },
                  required: ["panelName"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (userText) {
               // Output transcription
               this.onMessage("zoya", userText);
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  let url = "";
                  if (args.actionType === "youtube") {
                    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "spotify") {
                    url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                  } else if (args.actionType === "whatsapp") {
                    url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                  } else {
                    let website = args.query.replace(/\s+/g, "");
                    if (!website.includes(".")) website += ".com";
                    url = `https://www.${website}`;
                  }
                  
                  this.onCommand(url);
                  
                  // Send tool response
                  this.sessionPromise?.then(session => {
                     session.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: "Action executed successfully in the browser." }
                       }]
                     });
                  });
                } else if (call.name === "openPanel") {
                  const args = call.args as any;
                  if (args.panelName) {
                    this.onUIAction(args.panelName);
                  }
                  
                  // Send tool response
                  this.sessionPromise?.then(session => {
                     session.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: `Opened ${args.panelName} panel successfully.` }
                       }]
                     });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            this.stop();
          }
        }
      });

    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.stop();
      throw error;
    }
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      if (this.playbackAnalyser) {
        source.connect(this.playbackAnalyser);
        this.playbackAnalyser.connect(this.playbackContext.destination);
      } else {
        source.connect(this.playbackContext.destination);
      }
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }

  sendVideoFrame(base64Data: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({
          video: { data: base64Data, mimeType: "image/jpeg" }
        });
      }).catch(err => console.error("Error sending video frame to Live API:", err));
    }
  }

  getAudioData() {
    let micVolume = 0;
    let micHighEnergy = 0;
    let speakerVolume = 0;
    let speakerHighEnergy = 0;

    // Read microphone analyser
    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      micVolume = sum / bufferLength;

      let highSum = 0;
      const startBin = Math.floor(bufferLength / 2);
      for (let i = startBin; i < bufferLength; i++) {
        highSum += dataArray[i];
      }
      micHighEnergy = highSum / (bufferLength - startBin);
    }

    // Read speaker/playback analyser
    if (this.playbackAnalyser) {
      const bufferLength = this.playbackAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.playbackAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      speakerVolume = sum / bufferLength;

      let highSum = 0;
      const startBin = Math.floor(bufferLength / 2);
      for (let i = startBin; i < bufferLength; i++) {
        highSum += dataArray[i];
      }
      speakerHighEnergy = highSum / (bufferLength - startBin);
    }

    // Combine them (take the maximum of both) and normalize to 0-1 range
    const volume = Math.max(micVolume, speakerVolume) / 255;
    const highEnergy = Math.max(micHighEnergy, speakerHighEnergy) / 255;

    return { volume, highEnergy };
  }
}
