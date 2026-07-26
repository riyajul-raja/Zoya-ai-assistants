import handler from './api/tts.ts';

const req = {
  method: 'POST',
  body: {
    text: 'Hello'
  }
};

const res = {
  status: (s) => ({ json: (d) => console.log('STATUS', s, d) })
};

handler(req, res).catch(console.error);
