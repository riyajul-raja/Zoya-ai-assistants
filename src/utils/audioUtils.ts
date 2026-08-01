export async function playPCM(base64Data: string): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("AudioContext not supported");
        resolve();
        return;
      }
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        try {
          audioCtx.close();
        } catch (e) {}
        resolve();
      };
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      resolve();
    }
  });
}
