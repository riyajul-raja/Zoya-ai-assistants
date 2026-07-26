import handler from './api/tts.ts';

const req = {
  method: 'POST',
  body: {
    text: 'Hello there!'
  }
};

const res = {
  status: (s) => ({
    json: (d) => {
      console.log('STATUS', s, d.audio ? 'AUDIO_RECEIVED' : d);
    }
  })
};

handler(req, res).catch(console.error);
