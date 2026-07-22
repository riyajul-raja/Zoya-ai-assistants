import { defineConfig, loadEnv } from 'vite';

const env = loadEnv('production', '.', '');
console.log("env.VITE_GROQ_API_KEY:", env.VITE_GROQ_API_KEY);
console.log("process.env.VITE_GROQ_API_KEY:", process.env.VITE_GROQ_API_KEY);
