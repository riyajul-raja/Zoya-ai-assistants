const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseService.ts', 'utf8');

// Update googleSignIn to accept tokenKey
const oldGoogleSignIn = `export const googleSignIn = async (customScopes?: string[]): Promise<{ user: User; accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    isSigningIn = true;
    
    const defaultScopes = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar.events';
    const scopes = customScopes && customScopes.length > 0 
       ? customScopes.join(' ') 
       : defaultScopes;`;

const newGoogleSignIn = `export const googleSignIn = async (customScopes?: string[], tokenKey: string = 'zoya_google_token_v2'): Promise<{ user: User; accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    isSigningIn = true;
    
    const defaultScopes = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar.events';
    const scopes = customScopes && customScopes.length > 0 
       ? customScopes.join(' ') 
       : defaultScopes;`;

code = code.replace(oldGoogleSignIn, newGoogleSignIn);

code = code.replace(/localStorage\.setItem\('zoya_google_token_v2', tokenResponse\.access_token\);/, "localStorage.setItem(tokenKey, tokenResponse.access_token);");

// Update initAuth to accept tokenKey
const oldInitAuth = `export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {`;
const newInitAuth = `export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
  tokenKey: string = 'zoya_google_token_v2'
) => {`;
code = code.replace(oldInitAuth, newInitAuth);

// Replace zoya_google_token_v2 in initAuth
code = code.replace(/cachedAccessToken = localStorage\.getItem\('zoya_google_token_v2'\);/g, "cachedAccessToken = localStorage.getItem(tokenKey);");
code = code.replace(/localStorage\.removeItem\('zoya_google_token_v2'\);/g, "localStorage.removeItem(tokenKey);");

// Update getAccessToken and setAccessToken and logout
code = code.replace(/export const getAccessToken = async \(\): Promise<string \| null> => \{/g, "export const getAccessToken = async (tokenKey: string = 'zoya_google_token_v2'): Promise<string | null> => {");
code = code.replace(/return cachedAccessToken \|\| localStorage\.getItem\('zoya_google_token_v2'\);/g, "return cachedAccessToken || localStorage.getItem(tokenKey);");

code = code.replace(/export const setAccessToken = \(token: string\) => \{/g, "export const setAccessToken = (token: string, tokenKey: string = 'zoya_google_token_v2') => {");
code = code.replace(/localStorage\.setItem\('zoya_google_token_v2', token\);/g, "localStorage.setItem(tokenKey, token);");

code = code.replace(/export const logout = async \(\) => \{/g, "export const logout = async (tokenKey: string = 'zoya_google_token_v2') => {");

fs.writeFileSync('src/services/firebaseService.ts', code);
console.log("Patched firebaseService.ts");
