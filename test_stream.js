import handler from './api/chat/stream.ts';

const req = {
  method: 'POST',
  body: {
    prompt: 'Hello',
    selectedModel: 'gemini-2.5-flash',
    history: []
  }
};

const res = {
  setHeader: (k, v) => console.log('SetHeader', k, v),
  write: (data) => process.stdout.write(data),
  end: () => console.log('END'),
  status: (s) => ({ json: (d) => console.log('STATUS', s, d) })
};

handler(req, res).catch(console.error);
