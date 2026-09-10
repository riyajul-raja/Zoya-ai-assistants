export interface ZoyaMemory {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Storage isolation:
 * Retrieves saved memories strictly scoped to the active user profile.
 * One user's memories will never appear in another user's list.
 */
export function getIsolatedUserMemories(userId: string): ZoyaMemory[] {
  if (typeof window === "undefined") return [];
  const key = `zoya_user_${userId}_memories`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read user memories:", err);
  }
  return [];
}

/**
 * Persists memories strictly scoped to the active user profile.
 */
export function saveIsolatedUserMemories(userId: string, memories: ZoyaMemory[]): void {
  if (typeof window === "undefined") return;
  const key = `zoya_user_${userId}_memories`;
  try {
    localStorage.setItem(key, JSON.stringify(memories));
  } catch (err) {
    console.error("Failed to save user memories:", err);
  }
}

/**
 * Prevents saving sensitive data such as API keys, passwords, tokens, or payment details as memories.
 */
export function isSensitiveMemory(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Gemini / Google AI API keys
  if (/AIza[0-9A-Za-z-_]{35}/.test(text)) return true;
  // Generic API keys or auth tokens
  if (/api[_\s-]?key|secret[_\s-]?key|private[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token/i.test(lower)) return true;
  if (/bearer\s+[a-z0-9_\-\.]{20,}/i.test(text)) return true;
  // Passwords, passcodes, PINs, OTPs
  if (/(?:my\s+)?password\s+(?:is|hai|=|:)/i.test(lower)) return true;
  if (/\b(?:password|passcode|pin\s*number|cvv|otp|auth\s*token)\b/i.test(lower)) return true;
  // Credit / debit card patterns
  if (/\b(?:\d[ -]*?){13,16}\b/.test(text) && /(?:card|debit|credit|mastercard|visa)/i.test(lower)) return true;

  return false;
}

/**
 * Adds a new memory for the user.
 */
export function addMemory(userId: string, text: string): ZoyaMemory | null {
  const clean = text.trim();
  if (!clean) return null;
  if (isSensitiveMemory(clean)) return null;

  const current = getIsolatedUserMemories(userId);
  // Avoid exact duplicates
  const existing = current.find(m => m.text.toLowerCase() === clean.toLowerCase());
  if (existing) {
    return existing;
  }

  const newMem: ZoyaMemory = {
    id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    text: clean,
    createdAt: Date.now(),
  };

  const updated = [newMem, ...current];
  saveIsolatedUserMemories(userId, updated);
  return newMem;
}

/**
 * Updates an existing memory.
 */
export function updateMemory(userId: string, id: string, newText: string): boolean {
  const clean = newText.trim();
  if (!clean) return false;
  if (isSensitiveMemory(clean)) return false;

  const current = getIsolatedUserMemories(userId);
  const index = current.findIndex(m => m.id === id);
  if (index === -1) return false;

  current[index] = {
    ...current[index],
    text: clean,
    updatedAt: Date.now(),
  };

  saveIsolatedUserMemories(userId, [...current]);
  return true;
}

/**
 * Deletes a memory permanently from user storage.
 */
export function deleteMemory(userId: string, id: string): boolean {
  const current = getIsolatedUserMemories(userId);
  const filtered = current.filter(m => m.id !== id);
  if (filtered.length !== current.length) {
    saveIsolatedUserMemories(userId, filtered);
    return true;
  }
  return false;
}

/**
 * Extracts explicit memory request from user input text (Hindi, Hinglish, English).
 */
export function extractExplicitMemory(text: string): string | null {
  const clean = text.trim();
  if (!clean) return null;

  const patterns = [
    /(?:zoya\s*,?\s*)?(?:ye\s+yaad\s+rakho|yaad\s+rakho|yaad\s+rakhna)\s*(?:ki\s+|:\s*|\s+)?(.+)/i,
    /(?:zoya\s*,?\s*)?(?:isko\s+)?memory\s+m(?:e|ei|en)\s+(?:save|daal|rakh)\s*(?:karo|do)\s*(?:ki\s+|:\s*|\s+)?(.+)/i,
    /(?:zoya\s*,?\s*)?(?:please\s+)?remember\s+(?:this\s*[:,-]?\s*|that\s+|to\s+)?(.+)/i,
    /(?:zoya\s*,?\s*)?(?:don'?t\s+forget\s+(?:that\s+|to\s+)?)(.+)/i,
    /(?:zoya\s*,?\s*)?(?:save\s+(?:this\s+)?(?:in|to)\s+memory\s*[:,-]?\s*)(.+)/i,
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      let extracted = match[1].trim();
      extracted = extracted.replace(/^[:\-\s]+/, "").replace(/[.?!]+$/, "");
      if (extracted.length >= 3 && !isSensitiveMemory(extracted)) {
        return extracted;
      }
    }
  }

  return null;
}

/**
 * Filters and formats relevant memories for AI context prompt.
 */
export function getRelevantMemories(memories: ZoyaMemory[], query?: string, max: number = 8): ZoyaMemory[] {
  if (!memories || memories.length === 0) return [];
  if (!query || !query.trim() || memories.length <= 4) {
    return memories.slice(0, max);
  }

  const queryTokens = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (queryTokens.length === 0) {
    return memories.slice(0, max);
  }

  const scored = memories.map(mem => {
    const textLower = mem.text.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (textLower.includes(token)) score += 2;
    }
    return { mem, score };
  });

  // Sort by highest match, then recency
  scored.sort((a, b) => b.score - a.score || b.mem.createdAt - a.mem.createdAt);
  return scored.slice(0, max).map(s => s.mem);
}

export function formatMemoriesForPrompt(memories: ZoyaMemory[]): string {
  if (!memories || memories.length === 0) return "";
  return memories.map(m => `- ${m.text}`).join("\n");
}
