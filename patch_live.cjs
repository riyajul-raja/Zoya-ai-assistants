const fs = require('fs');
let code = fs.readFileSync('src/services/liveService.ts', 'utf8');

// Add chunk counter to LiveSessionManager class
code = code.replace(
  `private playbackContext: AudioContext | null = null;`,
  `private playbackContext: AudioContext | null = null;\n  private chunksSentCount: number = 0;`
);

// Add audio context resume and replace logs
code = code.replace(
  `this.audioContext = new AudioContextClass({ sampleRate: 16000 });`,
  `this.audioContext = new AudioContextClass({ sampleRate: 16000 });\n        if (this.audioContext.state === 'suspended') {\n          await this.audioContext.resume();\n        }`
);

// Add counting to onaudioprocess
code = code.replace(
  `this.processor.onaudioprocess = (e) => { console.log("onaudioprocess fired");`,
  `this.processor.onaudioprocess = (e) => {`
);

code = code.replace(
  `          this.sessionPromise.then(session => {`,
  `          this.chunksSentCount++;\n          if (this.chunksSentCount <= 5) { console.log("Sent audio chunk " + this.chunksSentCount); }\n          this.sessionPromise.then(session => {`
);

code = code.replace(
  `this.onStateChange("processing"); console.log("Initializing audio, state:", this.audioContext ? this.audioContext.state : "none");`,
  `this.onStateChange("processing");`
);

code = code.replace(
  `console.log("Audio context state:", this.audioContext.state); this.mediaStream = await navigator.mediaDevices.getUserMedia({`,
  `this.mediaStream = await navigator.mediaDevices.getUserMedia({`
);

fs.writeFileSync('src/services/liveService.ts', code);
