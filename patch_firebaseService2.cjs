const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseService.ts', 'utf8');

code = code.replace(
  "export const googleSignIn = async (customScopes?: string[]): Promise<{ user: User; accessToken: string } | null> => {",
  "export const googleSignIn = async (customScopes?: string[], tokenKey: string = 'zoya_google_token_v2'): Promise<{ user: User; accessToken: string } | null> => {"
);

code = code.replace(
  "localStorage.setItem('zoya_google_token_v2', tokenResponse.access_token);",
  "localStorage.setItem(tokenKey, tokenResponse.access_token);"
);

fs.writeFileSync('src/services/firebaseService.ts', code);
console.log("Patched firebaseService2");
