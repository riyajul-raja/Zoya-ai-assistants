const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// 1. Export DebugInfo
const debugInfoType = `
export interface DebugInfo {
  intent: "LOCAL" | "GEMINI";
  apiUsed: boolean;
  modelName: string;
  isCached: boolean;
  responseTimeMs: number;
  status: "Success" | "Error";
  httpStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}
`;

content = content.replace('import { GoogleGenAI } from "@google/genai";', 'import { GoogleGenAI } from "@google/genai";\n' + debugInfoType);

// 2. Change formatGeminiError to return an object
const formatErrorMatch = content.match(/function formatGeminiError[\s\S]*?return \`❌ \$\{status\}[\s\S]*?\};\n\}/);
if (formatErrorMatch) {
  let formatErrorReplacement = formatErrorMatch[0].replace(
    /return \`❌ \$\{status\}[\s\S]*?\};\n\}/,
    `const formatted = \`❌ \${status} \${errorCode}\\n\${errorMessage}\\n\\nModel:\\n\${modelName}\\n\\nStatus:\\n\${status}\\n\\nError:\\n\${errorCode}\\n\\nMessage:\\n\${errorMessage}\\n\\nOriginal Error:\\n\${error.message || String(error)}\`;
  return { formatted, status, errorCode, errorMessage };
}`
  );
  formatErrorReplacement = formatErrorReplacement.replace(
    'function formatGeminiError(error: any, modelName: string): string {',
    'function formatGeminiError(error: any, modelName: string): { formatted: string, status: string, errorCode: string, errorMessage: string } {'
  );
  content = content.replace(formatErrorMatch[0], formatErrorReplacement);
}

// 3. Change getZoyaResponseStream to return { text, debugInfo }
content = content.replace(
  'onChunk?: (text: string) => void\n): Promise<string> {',
  'onChunk?: (text: string) => void\n): Promise<{text: string, debugInfo: Partial<DebugInfo>}> {'
);

const streamBodyStart = 'try {\n    const cacheKey = getCacheKey(prompt, history, imageFrames);';
const streamCacheReturn = `
    const startTime = Date.now();
    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(\`[Cache Hit] Serving cached response for prompt: "\${prompt.substring(0, 30)}..."\`);
        if (onChunk) {
          setTimeout(() => onChunk(cached.response), 10);
        }
        return { 
          text: cached.response, 
          debugInfo: { intent: "GEMINI", apiUsed: false, modelName: "gemini-3.5-flash", isCached: true, responseTimeMs: Date.now() - startTime, status: "Success" } 
        };
      }
    }
`;
content = content.replace(
  /try \{\n    const cacheKey = getCacheKey\(prompt, history, imageFrames\);[\s\S]*?return cached\.response;\n      \}\n    \}/,
  'try {' + streamCacheReturn
);

// We need to fix the return of getZoyaResponseStream success
const streamReturnSuccess = `
    if (cacheKey && accumulatedText) {
      responseCache.set(cacheKey, { response: accumulatedText, timestamp: Date.now() });
    }
    const finalText = accumulatedText || "Ugh, fine. I have nothing to say.";
    return {
      text: finalText,
      debugInfo: { intent: "GEMINI", apiUsed: true, modelName: "gemini-3.5-flash", isCached: false, responseTimeMs: Date.now() - startTime, status: "Success" }
    };
`;
content = content.replace(
  /if \(cacheKey && accumulatedText\) \{\n      responseCache\.set\(cacheKey, \{ response: accumulatedText, timestamp: Date\.now\(\) \}\);\n    \}\n    return accumulatedText \|\| "Ugh, fine\. I have nothing to say\.";/,
  streamReturnSuccess
);

// We need to fix the catch block
const streamCatch = `
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    const parsed = formatGeminiError(error, "gemini-3.5-flash");
    if (onChunk) onChunk(parsed.formatted);
    return {
      text: parsed.formatted,
      debugInfo: { 
        intent: "GEMINI", apiUsed: true, modelName: "gemini-3.5-flash", isCached: false, 
        responseTimeMs: Date.now() - startTime, status: "Error", 
        httpStatus: parsed.status, errorCode: parsed.errorCode, errorMessage: parsed.errorMessage 
      }
    };
  }
`;
content = content.replace(
  /\} catch \(error: any\) \{[\s\S]*?return fallback;\n  \}/,
  streamCatch
);

fs.writeFileSync('src/services/geminiService.ts', content);
