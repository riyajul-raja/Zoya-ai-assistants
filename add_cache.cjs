const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const cacheBlock = `
interface CacheEntry {
  response: string;
  timestamp: number;
}
const responseCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function getCacheKey(prompt: string, history: any[], imageFrames: any): string {
  if (imageFrames && imageFrames.length > 0) return ""; // don't cache images for now
  // We can just use the prompt as a simple cache key for exact match
  return prompt.trim().toLowerCase();
}
`;

content = content.replace('let requestCount = 0;', cacheBlock + '\nlet requestCount = 0;');

// Update getZoyaResponseStream
const checkCacheStream = `
    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(\`[Cache Hit] Serving cached response for prompt: "\${prompt.substring(0, 30)}..."\`);
        if (onChunk) {
          // Simulate streaming
          setTimeout(() => onChunk(cached.response), 10);
        }
        return cached.response;
      }
    }
`;

content = content.replace(
  '    requestCount++;',
  checkCacheStream + '\n    requestCount++;'
);

// Save to cache after responseStream
const saveCacheStream = `
    if (cacheKey && accumulatedText) {
      responseCache.set(cacheKey, { response: accumulatedText, timestamp: Date.now() });
    }
    return accumulatedText || "Ugh, fine. I have nothing to say.";
`;

content = content.replace(
  '    return accumulatedText || "Ugh, fine. I have nothing to say.";',
  saveCacheStream
);

// Update getZoyaResponse
const checkCacheRest = `
    const cacheKey = getCacheKey(prompt, history, imageFrames);
    if (cacheKey) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(\`[Cache Hit] Serving cached response for prompt: "\${prompt.substring(0, 30)}..."\`);
        return cached.response;
      }
    }
`;

content = content.replace(
  '    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });',
  checkCacheRest + '\n    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });'
);

const saveCacheRest = `
    const text = response.text || "Ugh, fine. I have nothing to say.";
    if (cacheKey && text) {
      responseCache.set(cacheKey, { response: text, timestamp: Date.now() });
    }
    return text;
`;

content = content.replace(
  '    return response.text || "Ugh, fine. I have nothing to say.";',
  saveCacheRest
);


fs.writeFileSync('src/services/geminiService.ts', content);
