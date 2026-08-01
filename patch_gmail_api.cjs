const fs = require('fs');
let code = fs.readFileSync('src/components/GmailManager.tsx', 'utf8');

// 1. Add 401/403 handling
const oldFetch = `      if (!response.ok) {
        throw new Error("Failed to list messages");
      }`;
const newFetch = `      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onToast("Gmail access expired or missing permissions. Please sign out and sign in again.");
        }
        throw new Error("Failed to list messages: " + response.status);
      }`;
code = code.replace(oldFetch, newFetch);

// 2. Fix the empty emails issue by ensuring it clearly says "Inbox is empty"
// This is already handled by the UI, but we can make sure it looks good.

fs.writeFileSync('src/components/GmailManager.tsx', code);
console.log('Patched Gmail API error handling');
