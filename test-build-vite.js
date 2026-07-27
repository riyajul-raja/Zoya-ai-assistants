import { build } from 'vite';

process.env.VITE_GROQ_API_KEY = "test_key_from_process";

async function run() {
  await build({
    root: '.',
    logLevel: 'info',
    build: {
      write: false,
    }
  });
}
run();
