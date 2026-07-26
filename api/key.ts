export const config = {
  runtime: 'edge',
};

export default function handler(req: Request) {
  const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5
    ].filter(Boolean);
    const apiKey = keys[Math.floor(Math.random() * keys.length)] || keys[0];
  return new Response(JSON.stringify({ apiKey }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
