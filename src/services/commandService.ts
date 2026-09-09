export interface RealTimeInfo {
  timestamp: number;
  timeZone: string;
  time12: string;      // e.g. "3:45 PM"
  time24: string;      // e.g. "15:45"
  dateStr: string;     // e.g. "Wednesday, September 9, 2026"
  formattedSpokenText: string;
}

/**
 * Resolves the user's local timezone automatically.
 * Defaults to Asia/Kolkata (IST, UTC+5:30) for India / UTC fallback.
 */
export function getUserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== "UTC") {
      return tz;
    }
    const offsetMinutes = -new Date().getTimezoneOffset();
    if (offsetMinutes === 330) {
      return "Asia/Kolkata";
    }
  } catch {
    // fallback
  }
  return "Asia/Kolkata";
}

/**
 * Reads the device clock timestamp at the exact moment of invocation.
 * Never uses cached or startup-time values.
 */
export function getCurrentRealTimeInfo(): RealTimeInfo {
  const now = new Date();
  const timeZone = getUserTimeZone();

  const time12 = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const time24 = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return {
    timestamp: now.getTime(),
    timeZone,
    time12,
    time24,
    dateStr,
    formattedSpokenText: `${time12} (${timeZone})`,
  };
}

/**
 * Detects if a user input is a direct request for the current time.
 */
export function isDirectTimeQuery(raw: string): boolean {
  if (!raw) return false;
  const clean = raw.toLowerCase().replace(/[?.,!]/g, "").trim();
  const stripped = clean
    .replace(/^(zoya|hey zoya|hi zoya|zoya ji|suno zoya)\s+/, "")
    .replace(/\s+(zoya|zoya ji)$/, "")
    .trim();

  // English direct time patterns
  if (
    /^(what(\x27s| is)? (the )?time( now)?|what time is it( now)?|tell me (the )?time|what is the current time|current time( please)?|time please|the time)$/i.test(
      stripped
    )
  ) {
    return true;
  }

  // Hindi / Hinglish direct time patterns
  if (
    /^(abhi )?(kitne baj(e|a)(\s+hain|\s+hai)?|kitna baj(a|e)(\s+hai)?|kya time(\s+hua|\s+ho raha)?(\s+hai)?|time kya(\s+hua|\s+ho raha)?(\s+hai)?|time bata(o|iye| na)?|samay kya(\s+hua|\s+ho raha)?(\s+hai)?|kya samay(\s+hua|\s+ho raha)?(\s+hai)?|waqt kya(\s+hua|\s+ho raha)?(\s+hai)?|kya waqt(\s+hua|\s+ho raha)?(\s+hai)?)$/i.test(
      stripped
    )
  ) {
    return true;
  }

  if (/(ghadi|watch|clock).*(kya time|kitne baj)/i.test(stripped)) {
    return true;
  }

  if (/^abhi (ka )?time(\s+kya\s+hai|\s+batao)?$/i.test(stripped)) {
    return true;
  }

  return false;
}

/**
 * Returns a natural, conversational response for the current time
 * respecting Zoya's girlfriend mode or standard persona.
 */
export function getDirectTimeResponse(girlfriendMode: boolean = false, userName: string = ""): string {
  const timeInfo = getCurrentRealTimeInfo();
  const trimmedUser = userName.trim();

  if (girlfriendMode) {
    const endearments = ["jaan", "babu", "baby", "dear"];
    const pet = trimmedUser || endearments[Math.floor(Math.random() * endearments.length)];
    return `Abhi theek ${timeInfo.time12} ho rahe hain, ${pet}.`;
  }

  return `Abhi theek ${timeInfo.time12} ho rahe hain.`;
}

export function processCommand(command: string): {
  action: string;
  url?: string;
  isBrowserAction: boolean;
} {
  const lowerCmd = command.toLowerCase().trim();

  // General Browsing: "Open [website name]"
  const openMatch = lowerCmd.match(/^open\s+(.+)$/);
  if (
    openMatch &&
    !lowerCmd.includes("youtube") &&
    !lowerCmd.includes("spotify")
  ) {
    let website = openMatch[1].trim().replace(/\s+/g, "");
    if (!website.includes(".")) {
      website += ".com";
    }
    return {
      action: `Opening ${openMatch[1]} for you, ugh.`,
      url: `https://www.${website}`,
      isBrowserAction: true,
    };
  }

  // Media Search: "Play [song/video] on YouTube"
  const ytMatch = lowerCmd.match(/^play\s+(.+?)\s+on\s+youtube$/);
  if (ytMatch) {
    const query = encodeURIComponent(ytMatch[1].trim());
    return {
      action: `Playing ${ytMatch[1]} on YouTube. Don't judge my music taste.`,
      url: `https://www.youtube.com/results?search_query=${query}`,
      isBrowserAction: true,
    };
  }

  // Media Search: "Search [query] on Spotify"
  const spotifyMatch = lowerCmd.match(/^search\s+(.+?)\s+on\s+spotify$/);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    return {
      action: `Searching ${spotifyMatch[1]} on Spotify. Hope it's a banger.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // WhatsApp Web: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `Sending your message. Let's hope they reply.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}
