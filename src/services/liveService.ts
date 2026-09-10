import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { getCurrentRealTimeInfo, processCommand } from "./commandService";
import { getSystemInstruction } from "./geminiService";

export class LiveSessionManager {
  private ai: GoogleGenAI | null = null;
  private apiKey: string = "";
  private userName: string = "";
  private assistantName: string = "Zoya";
  private girlfriendMode: boolean = false;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private silentGain: GainNode | null = null;

  // Real-time Voice Activity Detection (VAD) & Noise Filtering State
  private noiseFloor: number = 0.015;
  private speechHoldFrames: number = 0;
  private preSpeechBuffer: Int16Array[] = [];
  private silentPcmFrame: Int16Array | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  private initialHistory: { sender: "user" | "zoya"; text: string }[] = [];
  private accumulatedUserText: string = "";
  private accumulatedModelText: string = "";
  private currentState: "idle" | "listening" | "processing" | "speaking" = "idle";
  private isSessionRunning: boolean = false;
  private visibilityHandler: (() => void) | null = null;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onActiveChange: (active: boolean) => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onNameDetected: (name: string) => void = () => {};
  public onMemoryDetected: (memory: string) => void = () => {};

  public getState(): "idle" | "listening" | "processing" | "speaking" {
    return this.currentState;
  }

  public isRunning(): boolean {
    return this.isSessionRunning;
  }

  private setState(state: "idle" | "listening" | "processing" | "speaking") {
    if (this.currentState === state) return;
    this.currentState = state;
    this.onStateChange(state);
  }

  private savedMemories: string = "";

  constructor(
    apiKey?: string, 
    userName: string = "", 
    assistantName: string = "Zoya", 
    girlfriendMode: boolean = false,
    initialHistory: { sender: "user" | "zoya"; text: string }[] = [],
    savedMemories: string = ""
  ) {
    this.apiKey = apiKey || localStorage.getItem("zoya_gemini_api_key") || "";
    this.userName = userName;
    this.assistantName = assistantName;
    this.girlfriendMode = girlfriendMode;
    this.initialHistory = initialHistory;
    this.savedMemories = savedMemories;
    if (this.apiKey.trim()) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey.trim() });
    }
  }

  async start() {
    if (!this.apiKey.trim() || !this.ai) {
      throw new Error("NO_API_KEY");
    }

    try {
      this.isSessionRunning = true;
      this.onActiveChange(true);
      this.setState("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;

      // Handle AudioContext state changes (e.g., background throttling or platform suspension)
      this.audioContext.onstatechange = () => {
        if (!this.isSessionRunning) return;
        if (this.audioContext?.state === "suspended") {
          this.audioContext.resume().then(() => {
            if (this.isSessionRunning && this.currentState === "idle") {
              this.setState("listening");
            }
          }).catch(() => {
            if (this.isSessionRunning && !this.isPlaying) {
              this.setState("idle");
            }
          });
        } else if (this.audioContext?.state === "running") {
          if (this.isSessionRunning && this.currentState === "idle" && !this.isPlaying) {
            this.setState("listening");
          }
        }
      };

      // Auto-resume audio contexts when user returns or unlocks screen
      this.visibilityHandler = () => {
        if (document.visibilityState === "visible" && this.isSessionRunning) {
          if (this.audioContext?.state === "suspended") {
            this.audioContext.resume().catch(() => {});
          }
          if (this.playbackContext?.state === "suspended") {
            this.playbackContext.resume().catch(() => {});
          }
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);

      // Get Microphone with full hardware/browser noise suppression, AGC & AEC
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onmute = () => {
          if (this.isSessionRunning && !this.isPlaying) {
            this.setState("idle");
          }
        };
        audioTrack.onunmute = () => {
          if (this.isSessionRunning && !this.isPlaying) {
            this.setState("listening");
          }
        };
        audioTrack.onended = () => {
          if (this.isSessionRunning) {
            this.stop();
          }
        };
      }

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // High-pass filter (85 Hz) suppresses continuous motor hum, fan vibration, HVAC rumble, and 50/60Hz AC mains noise
      this.highpassFilter = this.audioContext.createBiquadFilter();
      this.highpassFilter.type = "highpass";
      this.highpassFilter.frequency.value = 85;
      this.highpassFilter.Q.value = 0.707;

      // Low-pass filter (7500 Hz) filters out high-frequency air hiss and coil whine
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = "lowpass";
      this.lowpassFilter.frequency.value = 7500;
      this.lowpassFilter.Q.value = 0.707;

      // 2048 samples = 128ms per frame at 16kHz for responsive real-time processing
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      // Connect filter graph: source -> highpass -> lowpass -> processor
      this.source.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.processor);

      // Connect processor through silent gain node to destination to keep processor active without audio feedback
      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.value = 0;
      this.processor.connect(this.silentGain);
      this.silentGain.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS energy of the filtered frame
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          const val = inputData[i];
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / inputData.length);

        // Adaptive noise floor tracking:
        // Adapts quickly downwards when quiet, very slowly upwards so speech bursts do not inflate the floor
        if (rms < this.noiseFloor) {
          this.noiseFloor = this.noiseFloor * 0.93 + rms * 0.07;
        } else {
          this.noiseFloor = this.noiseFloor * 0.997 + rms * 0.003;
        }
        this.noiseFloor = Math.max(0.003, Math.min(0.07, this.noiseFloor));

        // Convert current audio frame to 16-bit PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Determine if voice is present
        // When Zoya is speaking, use a higher threshold to avoid echo / fan-induced interruptions
        const speechThreshold = this.isPlaying
          ? Math.max(0.038, this.noiseFloor * 2.8)
          : Math.max(0.013, this.noiseFloor * 2.0);

        const isVoice = rms >= speechThreshold;

        if (isVoice) {
          // If gate was closed, flush pre-buffered frames to capture starting consonants
          if (this.speechHoldFrames === 0 && this.preSpeechBuffer.length > 0) {
            for (const preChunk of this.preSpeechBuffer) {
              this.sendAudioFrame(preChunk);
            }
            this.preSpeechBuffer = [];
          }

          // Reset hangover hold-time (~450ms = ~4 frames at 128ms/frame)
          this.speechHoldFrames = 4;
          this.sendAudioFrame(pcm16);

          if (!this.isPlaying && this.currentState !== "listening") {
            this.setState("listening");
          }
        } else if (this.speechHoldFrames > 0) {
          // Still in hangover window: user is pausing between words or finishing syllable
          this.speechHoldFrames--;
          this.sendAudioFrame(pcm16);
        } else {
          // Ambient background / fan noise only (silence / no speech detected)
          // Keep rolling pre-buffer of up to 2 frames (~256ms)
          this.preSpeechBuffer.push(pcm16);
          if (this.preSpeechBuffer.length > 2) {
            this.preSpeechBuffer.shift();
          }

          // If Zoya is speaking, suppress sending fan noise so Zoya isn't interrupted
          if (this.isPlaying) {
            return;
          }

          // When listening for user, send zeroed frame to maintain clock sync without sending fan noise
          if (!this.silentPcmFrame || this.silentPcmFrame.length !== pcm16.length) {
            this.silentPcmFrame = new Int16Array(pcm16.length);
          }
          this.sendAudioFrame(this.silentPcmFrame);
        }
      };

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: getSystemInstruction(this.userName, this.assistantName, this.girlfriendMode, this.initialHistory, this.savedMemories),
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
                name: "saveUserName",
                description: "Call this immediately when the user tells you their name.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "The user's real name, properly capitalized." }
                  },
                  required: ["name"]
                }
              },
              {
                name: "saveMemory",
                description: "Call this tool whenever the user asks you to remember something (e.g. 'ye yaad rakho', 'remember this', 'isko memory me save karo', 'yaad rakhna ki...', 'please remember that...'), or shares an important personal fact or preference to remember. Do NOT call this tool for passwords or API keys.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    memory: { type: Type.STRING, description: "The concise, clear statement of what the user asked you to remember." }
                  },
                  required: ["memory"]
                }
              },
              {
                name: "getCurrentTime",
                description: "Get the exact real-time current clock time and date from the user's device. You MUST call this tool whenever the user asks for the current time or date (such as 'what time is it', 'abhi kitne baje hain', 'kya time hua hai', 'kitna baja hai', 'time batao', 'samay kya hai', etc.). Never guess or estimate the time.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.setState("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.setState("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.setState("listening");
            }

            // Handle User Input Speech Transcription
            const inputChunk = message.serverContent?.inputTranscription?.text;
            if (inputChunk) {
              this.accumulatedUserText += inputChunk;
            }
            if (message.serverContent?.inputTranscription?.finished) {
              const trimmedUser = this.accumulatedUserText.trim();
              if (trimmedUser) {
                this.onMessage("user", trimmedUser);
              }
              this.accumulatedUserText = "";
              if (!this.isPlaying) {
                this.setState("processing");
              }
            }

            // Handle Model Text Transcriptions
            const modelPartText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            const outputTransText = message.serverContent?.outputTranscription?.text;
            const modelChunk = modelPartText || outputTransText;
            if (modelChunk) {
              // Flush any pending user text BEFORE Zoya's reply so ordering is preserved
              if (this.accumulatedUserText.trim()) {
                this.onMessage("user", this.accumulatedUserText.trim());
                this.accumulatedUserText = "";
              }
              this.accumulatedModelText += modelChunk;
            }

            // Handle Turn Completion
            if (message.serverContent?.turnComplete) {
              if (this.accumulatedUserText.trim()) {
                this.onMessage("user", this.accumulatedUserText.trim());
                this.accumulatedUserText = "";
              }
              if (this.accumulatedModelText.trim()) {
                this.onMessage("zoya", this.accumulatedModelText.trim());
                this.accumulatedModelText = "";
              }
              if (!this.isPlaying && this.isSessionRunning) {
                this.setState("listening");
              }
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              this.setState("processing");
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
                } else if (call.name === "saveUserName") {
                  const args = call.args as any;
                  if (args?.name && typeof args.name === "string") {
                    const cleanName = args.name.trim();
                    if (cleanName) {
                      this.userName = cleanName;
                      this.onNameDetected(cleanName);
                    }
                  }

                  // Send tool response
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: "User name saved successfully." }
                      }]
                    });
                  });
                } else if (call.name === "saveMemory") {
                  const args = call.args as any;
                  if (args?.memory && typeof args.memory === "string") {
                    const cleanMem = args.memory.trim();
                    if (cleanMem) {
                      this.onMemoryDetected(cleanMem);
                    }
                  }

                  // Send tool response
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: "Memory saved successfully in Zoya's memory." }
                      }]
                    });
                  });
                } else if (call.name === "getCurrentTime") {
                  // Obtain exact current time from device clock at this moment
                  const timeInfo = getCurrentRealTimeInfo();
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: {
                          currentTime: timeInfo.time12,
                          exactTime: timeInfo.time12,
                          date: timeInfo.dateStr,
                          timezone: timeInfo.timeZone,
                          result: `The exact real-time system clock on the device right now is ${timeInfo.time12} (${timeInfo.timeZone}). Today's date is ${timeInfo.dateStr}. Speak this exact time clearly to the user.`
                        }
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
      source.connect(this.playbackContext.destination);
      
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
          if (this.isSessionRunning) {
            this.setState("listening");
          }
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

  private sendAudioFrame(pcm16: Int16Array) {
    if (!this.sessionPromise) return;

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
  }

  stop() {
    this.isSessionRunning = false;
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }
    if (this.lowpassFilter) {
      this.lowpassFilter.disconnect();
      this.lowpassFilter = null;
    }
    if (this.highpassFilter) {
      this.highpassFilter.disconnect();
      this.highpassFilter = null;
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
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.preSpeechBuffer = [];
    this.speechHoldFrames = 0;
    
    if (this.accumulatedUserText.trim() && this.accumulatedModelText.trim()) {
      this.onMessage("user", this.accumulatedUserText.trim());
      this.onMessage("zoya", this.accumulatedModelText.trim());
    } else if (this.accumulatedModelText.trim()) {
      this.onMessage("zoya", this.accumulatedModelText.trim());
    }
    this.accumulatedUserText = "";
    this.accumulatedModelText = "";

    this.stopPlayback();
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onActiveChange(false);
    this.setState("idle");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}
