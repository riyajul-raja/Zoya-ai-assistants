# Security Specification for Zoya Memory persistence

## 1. Data Invariants
1. A memory cannot be read or written by anyone except the authenticated owner (`userId`).
2. The `userId` property of any memory document must strictly equal the sender's authenticated Firebase UID (`request.auth.uid`).
3. Memory payload field sizes and characters must be strictly constrained:
   - ID must be alphanumeric and under 128 characters.
   - Text size must be between 1 and 1000 characters.
   - Category must belong to the enumerated list: `['note', 'reminder', 'preference', 'todo']`.
4. Creation timestamp (`createdAt`) and update timestamp (`updatedAt`) must rely strictly on server time (`request.time`).
5. Immutable fields (`userId`, `createdAt`) cannot be altered during any update operation.

## 2. The Dirty Dozen Payloads
Below are 12 malicious payloads designed to bypass security constraints, which will be strictly blocked by our Firestore rules:
1. **Unauthenticated Read/Write**: Attempting to create/read a memory without logging in.
2. **Identity Hijacking**: Saving a memory where `userId` is spoofed to another user's UID.
3. **Blanket Query Scraping**: Requesting to read memories belonging to other users.
4. **Altering Creation Time**: Attempting to set `createdAt` to a client-controlled past or future date.
5. **Updating Immutable createdAt**: Trying to change the `createdAt` value of an existing memory.
6. **Bypassing Text Length constraint**: Attempting to upload a massive string (>1000 chars) as `text` to trigger Denial of Wallet.
7. **Empty Memory Injection**: Creating a memory with an empty text body (`size < 1`).
8. **Invalid Category Type**: Assigning an unapproved string like `"malicious"` to `category`.
9. **Tampering with Owner ID on Update**: Attempting to shift document ownership during update.
10. **ID Poisoning Attack**: Attempting to use a massive, non-standard document ID filled with junk characters.
11. **Shadow Field Injection**: Inserting a field not specified in our schema, such as `isAdmin: true` or `role: "admin"`.
12. **Status Shortcut/Lockout**: Attempting to update the `createdAt` timestamp during an update.

## 3. Test Invariant Declarations
Every client-side request must be authorized via our security rules gate. The rules are written to prevent all forms of identity theft and data tampering, ensuring complete privacy.
