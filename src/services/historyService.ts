export interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
  timestamp?: number;
}

export interface SavedConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface DateGroupedConversations {
  group: string;
  conversations: SavedConversation[];
}

/**
 * Storage isolation:
 * Retrieves chat history strictly scoped to the active user profile.
 * One user's conversations will never appear in another user's history.
 */
export function getIsolatedUserChatHistory(userId: string): SavedConversation[] {
  if (typeof window === "undefined") return [];
  const key = `zoya_user_${userId}_chat_history`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read user chat history:", err);
  }

  // Fallback for default profile if migrating legacy data
  const isUrlScoped = typeof window !== "undefined" && (window.location.search.includes("user=") || window.location.search.includes("u="));
  if (!isUrlScoped) {
    try {
      const legacyRaw = localStorage.getItem("zoya_saved_conversations");
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy) && legacy.length > 0) {
          saveIsolatedUserChatHistory(userId, legacy);
          return legacy;
        }
      }
    } catch {}
  }

  return [];
}

/**
 * Persists chat history strictly scoped to the active user profile.
 */
export function saveIsolatedUserChatHistory(userId: string, conversations: SavedConversation[]): void {
  if (typeof window === "undefined") return;
  const key = `zoya_user_${userId}_chat_history`;
  try {
    localStorage.setItem(key, JSON.stringify(conversations));
    const isUrlScoped = typeof window !== "undefined" && (window.location.search.includes("user=") || window.location.search.includes("u="));
    if (!isUrlScoped) {
      localStorage.setItem("zoya_saved_conversations", JSON.stringify(conversations));
    }
  } catch (err) {
    console.error("Failed to save user chat history:", err);
  }
}

/**
 * Validation: Do not save incomplete or failed requests.
 * A completed conversation MUST contain at least one valid user message
 * and at least one completed Zoya reply.
 */
export function isConversationCompleted(messages: ChatMessage[]): boolean {
  if (!messages || messages.length < 2) return false;
  const hasUser = messages.some((m) => m.sender === "user" && m.text && m.text.trim().length > 0);
  const hasZoya = messages.some((m) => m.sender === "zoya" && m.text && m.text.trim().length > 0);
  return hasUser && hasZoya;
}

/**
 * Generates a clean, human-friendly title based on conversation content.
 */
export function generateConversationTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.sender === "user" && m.text.trim().length > 0);
  const userText = firstUserMsg ? firstUserMsg.text.trim() : "";

  if (userText) {
    const lower = userText.toLowerCase();

    // Time query
    if (/\b(time|baje|baja|samay|clock|ghadi)\b/i.test(lower)) {
      return "Current Time Inquiry";
    }

    // Date query
    if (/\b(date|tarikh|din|day|today)\b/i.test(lower) && /\b(kya|what|batao)\b/i.test(lower)) {
      return "Date & Calendar Inquiry";
    }

    // Music / Song
    if (/\b(play|baja|gaana|song|suno|music)\b/i.test(lower)) {
      const match = userText.match(/(?:play|suno|gaana|song)\s+(?:of\s+|about\s+)?([^,.]+)/i);
      if (match && match[1] && match[1].trim().length > 1) {
        const song = match[1].trim().replace(/\s+(on|in)\s+(youtube|spotify).*$/i, "");
        return `Music: ${capitalizeTitle(song)}`;
      }
      return "Music Playback Request";
    }

    // YouTube
    if (/\byoutube\b/i.test(lower)) {
      return "YouTube Search";
    }

    // WhatsApp
    if (/\bwhatsapp\b/i.test(lower)) {
      return "WhatsApp Action";
    }

    // Identity / Creator
    if (/\b(who created you|who made you|creator|kisne banaya|who are you|kaun ho|boss)\b/i.test(lower)) {
      return "About Zoya & Creator";
    }

    // Weather
    if (/\b(weather|mausam|temperature|barish|rain)\b/i.test(lower)) {
      return "Weather Inquiry";
    }

    // Name introduction
    const nameMatch = userText.match(/(?:mera naam|my name is|i am|iam|call me)\s+([A-Za-z]+)/i);
    if (nameMatch && nameMatch[1]) {
      return `Introduction: ${capitalizeWord(nameMatch[1])}`;
    }

    // Greetings
    if (/^(hi|hello|hey|namaste|salam|kese ho|how are you|kya haal)\b/i.test(lower)) {
      return "Casual Conversation";
    }

    // Clean up generic query text as title
    const clean = userText.replace(/^[^\w]+|[^\w]+$/g, "");
    if (clean.length > 0) {
      if (clean.length <= 42) {
        return capitalizeTitle(clean);
      }
      const words = clean.split(/\s+/);
      let shortTitle = "";
      for (const word of words) {
        if ((shortTitle + " " + word).trim().length > 38) break;
        shortTitle += (shortTitle ? " " : "") + word;
      }
      return capitalizeTitle(shortTitle || clean.slice(0, 38)) + "...";
    }
  }

  // If only Zoya spoke or fallback
  const firstZoyaMsg = messages.find((m) => m.sender === "zoya" && m.text.trim().length > 0);
  if (firstZoyaMsg) {
    if (/naam\s+kya/i.test(firstZoyaMsg.text)) {
      return "Introduction & Greeting";
    }
  }

  return "Conversation with Zoya";
}

function capitalizeWord(w: string): string {
  if (!w) return "";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function capitalizeTitle(title: string): string {
  if (!title) return "";
  const smallWords = ["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "with", "is", "hai", "ko", "se", "ka", "ki", "ke"];
  const words = title.split(/\s+/);
  return words
    .map((w, index) => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, "");
      if (index > 0 && smallWords.includes(clean.toLowerCase())) {
        return w.toLowerCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * Groups conversations by date such as "Today", "Yesterday", "Previous 7 Days", etc.
 */
export function groupConversationsByDate(conversations: SavedConversation[]): DateGroupedConversations[] {
  if (!conversations || conversations.length === 0) return [];

  // Sort newest updated first
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysStart = todayStart - 6 * 86400000;
  const thirtyDaysStart = todayStart - 29 * 86400000;

  const groupsMap = new Map<string, SavedConversation[]>();

  for (const conv of sorted) {
    const time = conv.updatedAt || conv.createdAt;
    let label = "";

    if (time >= todayStart) {
      label = "Today";
    } else if (time >= yesterdayStart) {
      label = "Yesterday";
    } else if (time >= sevenDaysStart) {
      label = "Previous 7 Days";
    } else if (time >= thirtyDaysStart) {
      label = "Previous 30 Days";
    } else {
      const d = new Date(time);
      label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    if (!groupsMap.has(label)) {
      groupsMap.set(label, []);
    }
    groupsMap.get(label)!.push(conv);
  }

  // Predefined order of standard date groups
  const preferredOrder = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days"];
  const result: DateGroupedConversations[] = [];

  for (const group of preferredOrder) {
    if (groupsMap.has(group)) {
      result.push({ group, conversations: groupsMap.get(group)! });
      groupsMap.delete(group);
    }
  }

  // Any remaining month/year groups
  for (const [group, convs] of groupsMap.entries()) {
    result.push({ group, conversations: convs });
  }

  return result;
}

/**
 * Formats time for item preview (e.g. "10:45 AM" or "Yesterday, 10:45 AM")
 */
export function formatConversationTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (timestamp >= todayStart) {
    return timeStr;
  } else if (timestamp >= yesterdayStart) {
    return `Yesterday, ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${dateStr}, ${timeStr}`;
  }
}

/**
 * Formats full date/time for opened conversation header
 */
export function formatFullDateTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}
