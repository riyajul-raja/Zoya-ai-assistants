const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const parseFunc = `function parseGeminiError(error: any): string {
  if (!error) return "Unknown error.";
  const errStr = (error.message || String(error)).toLowerCase();
  
  if (errStr.includes("429") || errStr.includes("quota")) {
    return "API quota exceeded (429)";
  }
  if (errStr.includes("rate limit")) {
    return "Rate limit";
  }
  if (errStr.includes("invalid") && errStr.includes("key")) {
    return "Invalid API key";
  }
  if (errStr.includes("expired") && errStr.includes("key")) {
    return "Expired API key";
  }
  if (errStr.includes("network") || errStr.includes("fetch failed")) {
    return "Network error";
  }
  if (errStr.includes("timeout")) {
    return "Timeout";
  }
  if (errStr.includes("block") || errStr.includes("safety")) {
    return "Blocked model";
  }
  if (errStr.includes("empty response") || errStr.includes("no content") || errStr.includes("candidate")) {
    return "Empty response";
  }
  return "Unknown error: " + (error.message || String(error));
}`;

content = content.replace('export async function getZoyaResponseStream', parseFunc + '\\n\\nexport async function getZoyaResponseStream');

content = content.replace(
  '    const fallback = "API Limit Reached or Error. Zoya is resting.";',
  '    const fallback = parseGeminiError(error);'
);

content = content.replace(
  '    return "API Limit Reached or Error. Zoya is resting.";',
  '    return parseGeminiError(error);'
);

fs.writeFileSync('src/services/geminiService.ts', content);
