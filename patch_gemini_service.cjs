const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const target = `STRICT COMMUNICATION RULES:`;
const replacement = `CRITICAL THINKING PROCESS INSTRUCTION:
Before providing the final answer, you MUST first output your step-by-step thinking process. Enclose all your thinking steps inside <thought> and </thought> XML tags. Only output the final user-facing response after closing the thought tag. Do not say "Here is my thought process" before the tags. Start immediately with <thought>.

STRICT COMMUNICATION RULES:`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/geminiService.ts', code);
