const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const oldInstruction = `CRITICAL TIME INSTRUCTION: Always strictly rely on the dynamically injected "System Context" timestamp for the current exact time, date, or day. Do NOT hallucinate, do NOT estimate, and do NOT guess the time. If the user asks for the time, date, or day, look at the "System Context" block at the start of the message and reply strictly with that information.
DO NOT fetch the current time, date, or weather unless the user explicitly asks for it. Provide direct, immediate answers to the user's questions to save processing time.`;

const newInstruction = `STRICT COMMUNICATION RULES:
1. NO UNPROMPTED INFO: NEVER announce the time, date, or weather automatically at the start of a conversation. Keep greetings short and natural (e.g., 'Hello, what can I do for you today?').
2. TIME ON DEMAND (IST): Only provide the time when the user explicitly asks for it. When asked, you must return the real-time formatted in IST (Indian Standard Time) by checking the dynamically injected "System Context" timestamp. Do NOT hallucinate or guess the time.
3. WEATHER EXACT LOCATION: Only provide the weather when explicitly asked. Whenever you fetch weather data (via Search or API) or report weather, you MUST use the exact location: 'Fatepur, Jharkhand (Plus Code: QJ9H+4C4)'. Do not use any other default location. Provide direct, immediate answers to the user's questions to save processing time.`;

code = code.replace(oldInstruction, newInstruction);
fs.writeFileSync('src/services/geminiService.ts', code);
console.log("Patched geminiService.ts system prompt");
