const fs = require('fs');
const path = './src/services/liveService.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove import
code = code.replace(/import \{ GoogleGenAI, LiveServerMessage, Modality, Type \} from "@google\/genai";/, 
`// Removed GoogleGenAI import
type LiveServerMessage = any;`);

// 2. Remove private ai: GoogleGenAI;
code = code.replace(/  private ai: GoogleGenAI;\n/, '');

// 3. Remove constructor instantiation
code = code.replace(/  constructor\(\) \{\n    this\.ai = new GoogleGenAI\(\{ apiKey: process\.env\.GEMINI_API_KEY \}\);\n  \}/, 
`  constructor() {
    // No direct GoogleGenAI instantiation
  }`);

// 4. Replace the connect logic
const connectRegex = /      \/\/ Connect to Live API[\s\S]*?this\.sessionPromise = this\.ai\.live\.connect\(\{[\s\S]*?model: "gemini-3\.1-flash-live-preview",[\s\S]*?config: \{[\s\S]*?responseModalities: \[Modality\.AUDIO\],[\s\S]*?callbacks: \{[\s\S]*?onopen: \(\) => \{[\s\S]*?onmessage: async \(message: LiveServerMessage\) => \{([\s\S]*?)\},[\s\S]*?onclose: \(\) => \{[\s\S]*?onerror: \(err\) => \{[\s\S]*?\}[\s\S]*?\}\);/m;

const match = code.match(connectRegex);
if (!match) {
  console.log("Could not find connect logic!");
  process.exit(1);
}

const onMessageBody = match[1];

const newConnectLogic = `      // Connect to Live API
      this.sessionPromise = new Promise((resolve, reject) => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = \`\${wsProtocol}//\${window.location.host}/api/chat/stream\`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Live API Connected via backend proxy");
          this.onStateChange("listening");
          
          ws.send(JSON.stringify({
            setup: {
              model: "models/gemini-3.1-flash-live-preview",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
                },
              },
              systemInstruction: {
                parts: [{ text: activeSystemInstruction }]
              },
              tools: [{
                functionDeclarations: [
                  {
                    name: "executeBrowserAction",
                    description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site, play a song, or send a message.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        actionType: { type: "STRING", description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                        query: { type: "STRING", description: "The search query, website name, or message content." },
                        target: { type: "STRING", description: "The target phone number for WhatsApp, if applicable." }
                      },
                      required: ["actionType", "query"]
                    }
                  },
                  {
                    name: "openPanel",
                    description: "Open a specific workspace integration panel or tool (like Gmail, Calendar, Tasks, Keep, Contacts, Drive Explorer, Memories). Call this whenever the user wants to see, write, search, or read notes, emails, calendar entries, tasks, contacts, files, documents, slides, classroom or chat.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        panelName: {
                          type: "STRING",
                          description: "The name of the workspace panel to open. Allowed values: 'gmail', 'calendar', 'tasks', 'keep', 'contacts', 'drive', 'chat', 'docs', 'forms', 'meet', 'classroom', 'slides', 'memories'."
                        }
                      },
                      required: ["panelName"]
                    }
                  }
                ]
              }]
            }
          }));

          resolve({
            sendRealtimeInput: (input: any) => {
              if (input.audio) {
                ws.send(JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [{
                      mimeType: input.audio.mimeType,
                      data: input.audio.data
                    }]
                  }
                }));
              } else if (input.text) {
                ws.send(JSON.stringify({
                  clientContent: {
                    turns: [{
                      role: "user",
                      parts: [{ text: input.text }]
                    }],
                    turnComplete: true
                  }
                }));
              } else if (input.video) {
                ws.send(JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [{
                      mimeType: input.video.mimeType,
                      data: input.video.data
                    }]
                  }
                }));
              }
            },
            sendToolResponse: (response: any) => {
              ws.send(JSON.stringify({
                toolResponse: {
                  functionResponses: response.functionResponses
                }
              }));
            },
            close: () => {
              ws.close();
            }
          });
        };

        ws.onmessage = async (event) => {
          try {
            let message: LiveServerMessage;
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              message = JSON.parse(text);
            } else {
              message = JSON.parse(event.data);
            }
            
${onMessageBody}
          } catch(err) {
            console.error("Error in onmessage:", err);
          }
        };

        ws.onclose = () => {
          console.log("Live API Closed");
          this.stop();
        };

        ws.onerror = (err) => {
          console.error("Live API Error:", err);
          this.stop();
        };
      });`;

code = code.replace(connectRegex, newConnectLogic);

// Finally, make sure all sendRealtimeInput in the file uses standard structure or keep as-is if our wrapper handles it!
// In the original file, it calls:
// session.sendRealtimeInput({ text });
// session.sendRealtimeInput({ audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
// session.sendRealtimeInput({ video: { data: base64Data, mimeType: "image/jpeg" } });
// Our wrapper handles exactly this input format!

fs.writeFileSync(path, code);
console.log("Patched successfully!");
