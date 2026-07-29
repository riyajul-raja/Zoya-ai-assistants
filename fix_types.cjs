const fs = require('fs');

// Fix geminiService.ts
let gemini = fs.readFileSync('src/services/geminiService.ts', 'utf8');

// The error is because `formatGeminiError` still returns string somewhere or there's an early return.
// Let's rewrite `formatGeminiError` cleanly.
gemini = gemini.replace(
  /function formatGeminiError[\s\S]*?return \{ formatted, status, errorCode, errorMessage \};\n\}/,
  `function formatGeminiError(error: any, modelName: string): { formatted: string, status: string, errorCode: string, errorMessage: string } {
  let status = "Unknown";
  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = error.message || String(error);
  if (error.status) status = error.status;
  if (error.statusText) errorCode = error.statusText;
  const errStr = errorMessage.toLowerCase();
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("resource_exhausted")) { status = "429"; errorCode = "RESOURCE_EXHAUSTED"; errorMessage = "Quota exceeded."; }
  else if (errStr.includes("403") || errStr.includes("permission_denied") || errStr.includes("api_key_invalid")) { status = "403"; errorCode = "PERMISSION_DENIED"; errorMessage = "Invalid or restricted API key."; }
  else if (errStr.includes("401") || errStr.includes("unauthenticated")) { status = "401"; errorCode = "UNAUTHENTICATED"; errorMessage = "Authentication failed."; }
  else if (errStr.includes("400") || errStr.includes("invalid_argument")) { status = "400"; errorCode = "INVALID_ARGUMENT"; errorMessage = "Bad request."; }
  else if (errStr.includes("503") || errStr.includes("unavailable")) { status = "503"; errorCode = "UNAVAILABLE"; errorMessage = "Gemini service unavailable."; }
  else if (errStr.includes("network") || errStr.includes("fetch failed")) { status = "Network Error"; errorCode = "NETWORK_ERROR"; errorMessage = "Please check your internet connection."; }
  else if (errStr.includes("timeout")) { status = "Timeout"; errorCode = "TIMEOUT"; errorMessage = "Request timed out."; }
  else if (errStr.includes("block") || errStr.includes("safety")) { status = "Blocked"; errorCode = "SAFETY_BLOCK"; errorMessage = "Content blocked by safety settings."; }
  const formatted = \`❌ \${status} \${errorCode}\\n\${errorMessage}\\n\\nModel:\\n\${modelName}\\n\\nStatus:\\n\${status}\\n\\nError:\\n\${errorCode}\\n\\nMessage:\\n\${errorMessage}\\n\\nOriginal Error:\\n\${error.message || String(error)}\`;
  return { formatted, status, errorCode, errorMessage };
}`
);

// Add missing startTime
gemini = gemini.replace(
  'try {\n    const startTime = Date.now();',
  'const startTime = Date.now();\n  try {'
);

fs.writeFileSync('src/services/geminiService.ts', gemini);

// Fix App.tsx missing ref
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /isProcessingRequestRef\.current/g,
  'false'
);
fs.writeFileSync('src/App.tsx', app);

