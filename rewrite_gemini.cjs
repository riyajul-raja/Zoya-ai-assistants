const fs = require('fs');
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const formatErrorBlock = `function formatGeminiError(error: any, modelName: string): string {
  let status = "Unknown";
  let errorCode = "UNKNOWN_ERROR";
  let errorMessage = error.message || String(error);
  
  if (error.status) status = error.status;
  if (error.statusText) errorCode = error.statusText;
  
  const errStr = errorMessage.toLowerCase();
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("resource_exhausted")) {
    status = "429";
    errorCode = "RESOURCE_EXHAUSTED";
    errorMessage = "Quota exceeded.";
  } else if (errStr.includes("403") || errStr.includes("permission_denied") || errStr.includes("api_key_invalid")) {
    status = "403";
    errorCode = "PERMISSION_DENIED";
    errorMessage = "Invalid or restricted API key.";
  } else if (errStr.includes("401") || errStr.includes("unauthenticated")) {
    status = "401";
    errorCode = "UNAUTHENTICATED";
    errorMessage = "Authentication failed.";
  } else if (errStr.includes("400") || errStr.includes("invalid_argument")) {
    status = "400";
    errorCode = "INVALID_ARGUMENT";
    errorMessage = "Bad request.";
  } else if (errStr.includes("503") || errStr.includes("unavailable")) {
    status = "503";
    errorCode = "UNAVAILABLE";
    errorMessage = "Gemini service unavailable.";
  } else if (errStr.includes("network") || errStr.includes("fetch failed")) {
    status = "Network Error";
    errorCode = "NETWORK_ERROR";
    errorMessage = "Please check your internet connection.";
  } else if (errStr.includes("timeout")) {
    status = "Timeout";
    errorCode = "TIMEOUT";
    errorMessage = "Request timed out.";
  } else if (errStr.includes("block") || errStr.includes("safety")) {
    status = "Blocked";
    errorCode = "SAFETY_BLOCK";
    errorMessage = "Content blocked by safety settings.";
  }

  console.error("====== GEMINI API ERROR ======");
  console.error("Timestamp:", new Date().toISOString());
  console.error("Model:", modelName);
  console.error("Status:", status);
  console.error("Error Code:", errorCode);
  console.error("Message:", errorMessage);
  console.error("Full response body:", error.response || error.body || "N/A");
  console.error("Request URL:", error.url || error.config?.url || "N/A");
  console.error("Full stack trace:", error.stack || error);
  console.error("===============================");

  return \`❌ \${status} \${errorCode}\\n\${errorMessage}\\n\\nModel:\\n\${modelName}\\n\\nStatus:\\n\${status}\\n\\nError:\\n\${errorCode}\\n\\nMessage:\\n\${errorMessage}\\n\\nOriginal Error:\\n\${error.message || String(error)}\`;
}`;

content = content.replace(/function parseGeminiError[\s\S]*?\}\n/, formatErrorBlock + '\n');

// Then replace the error catches
content = content.replace(
  /const fallback = parseGeminiError\(error\);/,
  'const fallback = formatGeminiError(error, "gemini-3.5-flash");'
);

content = content.replace(
  /return parseGeminiError\(error\);/g,
  'return formatGeminiError(error, "gemini-3.5-flash");'
);

fs.writeFileSync('src/services/geminiService.ts', content);
