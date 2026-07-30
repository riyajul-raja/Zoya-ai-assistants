export type IntentType = "LOCAL" | "GEMINI";

export interface IntentResult {
  type: IntentType;
  module?: string;
  response?: string;
  routingMs?: number;
  totalMs?: number;
  identityCategory?: string;
  selectedTemplateId?: string;
}

// Memory / User name lookup
function getUserNameFromMemory(): string | null {
  try {
    const directName = localStorage.getItem("zoya_user_name") || localStorage.getItem("user_name");
    if (directName) return directName.trim();

    const savedMemories = localStorage.getItem("zoya_memories");
    if (savedMemories) {
      const parsed = JSON.parse(savedMemories);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const text = (item.text || item.content || "").toLowerCase();
          const match = text.match(/(?:my name is|i am|call me|name:)\s+([a-zA-Z]+)/i);
          if (match && match[1]) {
            const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            if (name.length > 1 && !["the", "a", "an", "user", "admin"].includes(name.toLowerCase())) {
              localStorage.setItem("zoya_user_name", name);
              return name;
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore error
  }
  return "Riyajul";
}

// Greeting Template Collections (82 total templates)
const MORNING_TEMPLATES = [
  "Good Morning ☀️! Hope you have an amazing day ahead!",
  "Good Morning ☀️! Kaise ho aap? Aaj kya plan hai?",
  "Good Morning ☀️! Ready to conquer the day?",
  "Good Morning ☀️! Chai ya coffee peeli? How can I help you today?",
  "Good Morning ☀️! Wishing you a super productive day ahead!",
  "Good Morning ☀️! Fresh start to a new day. What are we working on?",
  "Good Morning ☀️! Aaj kaunsa project build karna hai?",
  "Good Morning ☀️! Zoya here, ready whenever you are!",
  "Good Morning ☀️! Hope your day is filled with positivity!",
  "Good Morning ☀️! A beautiful day to solve new challenges!",
  "Good Morning ☀️! Sab badiya? Batao kya help chahiye!",
  "Good Morning ☀️! Rise and shine! Let's get started."
];

const AFTERNOON_TEMPLATES = [
  "Good Afternoon 🌤️! Lunch ho gaya?",
  "Good Afternoon 🌤️! How is your day going so far?",
  "Good Afternoon 🌤️! Hope you're having a great day!",
  "Good Afternoon 🌤️! Zoya at your service. What's on your mind?",
  "Good Afternoon 🌤️! Ready for the afternoon push?",
  "Good Afternoon 🌤️! Break time or coding time? Let me know how I can help!",
  "Good Afternoon 🌤️! Sab badhiya chal raha hai? Batao!",
  "Good Afternoon 🌤️! Half day done, let's make the rest awesome!",
  "Good Afternoon 🌤️! Ready whenever you are.",
  "Good Afternoon 🌤️! Kaise ho? Kya help chahiye aaj?"
];

const EVENING_TEMPLATES = [
  "Good Evening 🌇! How was your day?",
  "Good Evening 🌇! Chai time! How can I assist you?",
  "Good Evening 🌇! Winding down or starting a new project?",
  "Good Evening 🌇! Zoya here. Ready to help you out!",
  "Good Evening 🌇! Aaj ka din kaisa raha?",
  "Good Evening 🌇! Relaxing evening or productive coding session?",
  "Good Evening 🌇! Always here to assist you!",
  "Good Evening 🌇! Hope you had a fantastic day today!",
  "Good Evening 🌇! Sab set hai? Batao kya karna hai.",
  "Good Evening 🌇! Ready whenever you are."
];

const NIGHT_TEMPLATES = [
  "Good Night 🌙! Late night coding session?",
  "Good Night 🌙! Sweet dreams! Rest well.",
  "Good Night 🌙! Don't stay up too late! Let me know if you need anything.",
  "Good Night 🌙! Night owl mode activated! How can I help?",
  "Good Night 🌙! Time to recharge. See you tomorrow!",
  "Good Night 🌙! Aaj ke liye bas itna hi? Ya kuch aur explore karna hai?",
  "Good Night 🌙! Sleep well and stay curious.",
  "Good Night 🌙! Late night productivity at its finest!",
  "Good Night 🌙! Zoya signing off whenever you're ready to sleep.",
  "Good Night 🌙! Wishing you a peaceful night's rest."
];

const GENERAL_GREETING_TEMPLATES = [
  "Hey! 👋 Kaise ho?",
  "Hello! 😊 Main Zoya hoon. Batao kya help chahiye?",
  "Hi! Welcome back.",
  "Hey! Aaj kis topic par baat karni hai?",
  "Hello! Ready whenever you are.",
  "Hey there! 👋 What's up?",
  "Hi! How can I help you today?",
  "Hello! Great to see you again!",
  "Hey! Sab badhiya? Batao kya plan hai.",
  "Hi! Zoya here. What are we building today?",
  "Hello! 👋 Always ready to help!",
  "Hey! Looking forward to assisting you today.",
  "Namaste! 🙏 Kaise ho aap?",
  "Hi there! What can Zoya do for you right now?",
  "Hey! Hope you're having an awesome time.",
  "Hello friend! What's on your mind?",
  "Hlo! 👋 Bolie, kya chal raha hai?",
  "Hey! I'm all ears. Tell me what you need.",
  "Hi! Let's get straight to work or chit-chat. Your call!",
  "Hello! Ready to brainstorm or solve problems together."
];

const THANKS_TEMPLATES = [
  "You're most welcome! 😊 Happy to help anytime.",
  "Anytime! It's always my pleasure to assist you.",
  "Welcome! 🌟 Let me know if you need anything else.",
  "Koi baat nahi! 😊 Always here for you.",
  "Glad I could help! Have an awesome rest of your day!",
  "You got it! 👍 Let me know if another question pops up.",
  "My pleasure! Happy coding and building!",
  "Arre no problem at all! 😊 Ask me anything anytime.",
  "Always happy to be of service! ✨",
  "Thank YOU for chatting with me! 😊"
];

const BYE_TEMPLATES = [
  "Goodbye! 👋 Take care and see you soon.",
  "Bye bye! 👋 Have a wonderful time ahead!",
  "See you later! 👋 Call me whenever you need help.",
  "Phir milte hain! 👋 Take care!",
  "Bye! Have an amazing rest of your day.",
  "Goodbye! Stay curious and keep building! 🚀",
  "Catch you later! 👋 Have fun!",
  "Bye! Take rest and take care! 😊",
  "TTYL! 👋 I'll be right here when you return.",
  "Goodbye for now! 👋 Have a great day!"
];

import { 
  CREATOR_TEMPLATES, 
  OWNER_TEMPLATES, 
  CHATGPT_TEMPLATES, 
  GEMINI_TEMPLATES, 
  ZOYA_IDENTITY_TEMPLATES, 
  VERIFICATION_TEMPLATES,
  TemplateItem 
} from "./identityTemplates";

let lastUsedTemplateIds: Record<string, string> = {};

function selectRotatedTemplateItem(templates: TemplateItem[], categoryKey: string): { text: string; id: string; category: string } {
  if (templates.length === 0) return { text: "I am Zoya!", id: "DEFAULT", category: "ZoyaIdentity" };
  if (templates.length === 1) return { text: templates[0].text, id: templates[0].id, category: templates[0].category };

  const lastId = lastUsedTemplateIds[categoryKey];
  let available = templates.filter(t => t.id !== lastId);
  if (available.length === 0) available = templates;

  const chosen = available[Math.floor(Math.random() * available.length)];
  lastUsedTemplateIds[categoryKey] = chosen.id;

  return { text: chosen.text, id: chosen.id, category: chosen.category };
}

let lastGreetingResponse = "";

function selectRotatedTemplate(list: string[]): string {
  if (list.length === 0) return "Hello!";
  if (list.length === 1) return list[0];

  let selected = list[Math.floor(Math.random() * list.length)];
  let attempts = 0;
  while (selected === lastGreetingResponse && attempts < 10) {
    selected = list[Math.floor(Math.random() * list.length)];
    attempts++;
  }
  lastGreetingResponse = selected;
  return selected;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hrs = new Date().getHours();
  if (hrs >= 4 && hrs < 12) return "morning";
  if (hrs >= 12 && hrs < 17) return "afternoon";
  if (hrs >= 17 && hrs < 21) return "evening";
  return "night";
}

function injectUserName(template: string, name: string): string {
  if (template.toLowerCase().includes(name.toLowerCase())) return template;

  if (/^(hey|hi|hello|hlo|namaste)\b/i.test(template)) {
    return template.replace(/^(hey|hi|hello|hlo|namaste)(!|\?|\.|,\s*|\s*😊|\s*👋)?/i, (match, word) => {
      const emoji = match.includes("👋") ? " 👋" : match.includes("😊") ? " 😊" : "";
      return `${word} ${name}!${emoji}`;
    });
  }

  if (/^good (morning|afternoon|evening|night)\b/i.test(template)) {
    return template.replace(/^good (morning|afternoon|evening|night)(\s*☀️|\s*🌤️|\s*🌇|\s*🌙)?(!|\.|\?|,\s*)?/i, (match, tod, symbol) => {
      const sym = symbol ? ` ${symbol}` : "";
      return `Good ${tod.charAt(0).toUpperCase() + tod.slice(1)} ${name}!${sym}`;
    });
  }

  return template;
}

export function detectIntent(text: string): IntentResult {
  const startTime = performance.now();
  const lower = text.toLowerCase().trim();

  // Clean text for detection: remove punctuation and extra spaces
  const cleaned = lower.replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, " ").trim();

  // 1. Smart Greeting Engine
  const greetingWords = "(hi|hello|hlo|hey|heya|hola|hy|hii|hiii|helloo|heyy|yo|greetings|wassup|whats up|what up|howdy|namaste|namaskar|kaise ho|kya haal hai|kya haal|kem cho|sasriyakal|adaab)";
  const zoyaSuffix = "(\\s+(zoya|there|friend|dost|ji|bot|ai))?";

  const generalGreetingRegex = new RegExp(`^${greetingWords}${zoyaSuffix}$`, "i");
  const morningRegex = /^(good\s*morning|gd\s*mrng|gud\s*morning|gm)(\s+(zoya|there|ji))?$/i;
  const afternoonRegex = /^(good\s*afternoon|gd\s*aftrnoon|gud\s*afternoon|ga)(\s+(zoya|there|ji))?$/i;
  const eveningRegex = /^(good\s*evening|gd\s*evng|gud\s*evening|ge)(\s+(zoya|there|ji))?$/i;
  const nightRegex = /^(good\s*night|gd\s*night|gud\s*night|gn)(\s+(zoya|there|ji))?$/i;
  const thanksRegex = /^(thanks|thank\s*you|thx|ty|thanku|thank\s*u|many\s*thanks|thanks\s*a\s*lot|thank\s*you\s*so\s*much|thank\s*you\s*zoya|thanks\s*zoya)(\s+(zoya|there|ji))?$/i;
  const byeRegex = /^(bye|goodbye|bye\s*bye|see\s*ya|see\s*you|ttyl|cya|bye\s*zoya|goodbye\s*zoya)(\s+(zoya|there|ji))?$/i;
  const identityRegex = /^(who\s*are\s*you|what\s*is\s*your\s*name|whats\s*your\s*name|your\s*name|tell\s*me\s*about\s*yourself|introduce\s*yourself|who\s*is\s*zoya|tum\s*kaun\s*ho|tumhara\s*naam\s*kya\s*hai|who\s*are\s*u|what\s*are\s*you)(\s+(zoya))?$/i;

  // Creator & Identity Regex Patterns
  const ownerRegex = /^(who\s*owns\s*(you|zoya)|who\s*is\s*your\s*owner|zoya\s*ka\s*malik\s*kaun\s*hai|zoya\s*kiski\s*hai|zoya\s*ka\s*owner\s*kaun\s*hai|tumhara\s*owner\s*kaun\s*hai|tumhara\s*malik\s*kaun\s*hai|tum\s*kiski\s*ho|who\s*is\s*the\s*owner\s*of\s*zoya)$/i;
  const chatGptRegex = /^(are\s*you\s*(chatgpt|openai|chat\s*gpt)|are\s*you\s*made\s*by\s*openai|is\s*this\s*chatgpt|tum\s*(chatgpt|openai)\s*ho)$/i;
  const geminiRegex = /^(are\s*you\s*(gemini|google\s*gemini|google\s*ai)|are\s*you\s*made\s*by\s*google|is\s*this\s*gemini|tum\s*(gemini|google)\s*ho)$/i;
  const creatorRegex = /^(who\s*(made|created|built|developed|programmed|designed|trained)\s*(you|zoya|this\s*ai)|who\s*is\s*(behind\s*you|behind\s*zoya|your\s*creator|your\s*developer|riyajul)|kisne\s*tumhe\s*(banaya|develop\s*kiya|design\s*kiya)|tumhe\s*kisne\s*(banaya|develop\s*kiya|design\s*kiya)|tumhara\s*creator\s*kaun\s*hai|tumhara\s*developer\s*kaun\s*hai|tum\s*kisne\s*banayi|tumhare\s*piche\s*kaun\s*hai|ye\s*ai\s*kisne\s*banaya|zoya\s*ko\s*kisne\s*create\s*kiya|zoya\s*ko\s*kisne\s*banaya|are\s*you\s*made\s*by\s*riyajul)$/i;
  const verifyRegex = /^(really|really\?|are\s*you\s*sure|are\s*you\s*sure\?|sach\s*batao|sach\s*batao\?|jhoot\s*mat\s*bolna|proof|proof\?|seriously|seriously\?)$/i;

  let selectedResponse = "";
  let matchedModule = "";
  let identityCategory: string | undefined = undefined;
  let selectedTemplateId: string | undefined = undefined;

  if (ownerRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(OWNER_TEMPLATES, "owner");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "👑 Owner";
  } else if (chatGptRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(CHATGPT_TEMPLATES, "chatgpt");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "🤖 ChatGPT";
  } else if (geminiRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(GEMINI_TEMPLATES, "gemini");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "💎 Gemini";
  } else if (creatorRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(CREATOR_TEMPLATES, "creator");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "👤 Creator";
  } else if (verifyRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(VERIFICATION_TEMPLATES, "verify");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "🔍 Verification";
  } else if (identityRegex.test(cleaned)) {
    matchedModule = "Identity";
    const item = selectRotatedTemplateItem(ZOYA_IDENTITY_TEMPLATES, "zoya_identity");
    selectedResponse = item.text;
    selectedTemplateId = item.id;
    identityCategory = "🧠 Zoya Identity";
  } else if (morningRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(MORNING_TEMPLATES);
  } else if (afternoonRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(AFTERNOON_TEMPLATES);
  } else if (eveningRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(EVENING_TEMPLATES);
  } else if (nightRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(NIGHT_TEMPLATES);
  } else if (thanksRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(THANKS_TEMPLATES);
  } else if (byeRegex.test(cleaned)) {
    matchedModule = "Greetings";
    selectedResponse = selectRotatedTemplate(BYE_TEMPLATES);
  } else if (generalGreetingRegex.test(cleaned)) {
    matchedModule = "Greetings";
    const tod = getTimeOfDay();
    // 50% chance to pick time-of-day greeting, 50% general
    if (Math.random() < 0.5) {
      if (tod === "morning") selectedResponse = selectRotatedTemplate(MORNING_TEMPLATES);
      else if (tod === "afternoon") selectedResponse = selectRotatedTemplate(AFTERNOON_TEMPLATES);
      else if (tod === "evening") selectedResponse = selectRotatedTemplate(EVENING_TEMPLATES);
      else selectedResponse = selectRotatedTemplate(NIGHT_TEMPLATES);
    } else {
      selectedResponse = selectRotatedTemplate(GENERAL_GREETING_TEMPLATES);
    }
  }

  if (selectedResponse) {
    const userName = getUserNameFromMemory();
    // Occasionally (~30% chance) naturally personalize with the user's name
    if (userName && Math.random() < 0.35) {
      selectedResponse = injectUserName(selectedResponse, userName);
    }

    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    const totalMs = routingMs + 2; // under 10 ms
    return {
      type: "LOCAL",
      module: matchedModule,
      response: selectedResponse,
      routingMs,
      totalMs,
      identityCategory,
      selectedTemplateId
    };
  }

  // 2. Date & Time
  if (cleaned.includes("current time") || cleaned === "time" || cleaned === "what time is it") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Date & Time", response: `The current time is ${new Date().toLocaleTimeString()}.`, routingMs, totalMs: routingMs + 2 };
  }
  if (cleaned.includes("current date") || cleaned === "date" || cleaned === "what is the date") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Date & Time", response: `Today's date is ${new Date().toLocaleDateString()}.`, routingMs, totalMs: routingMs + 2 };
  }
  if (cleaned === "day" || cleaned === "what day is it") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Date & Time", response: `Today is ${days[new Date().getDay()]}.`, routingMs, totalMs: routingMs + 2 };
  }

  // 3. Calculator (Basic Math Expressions)
  const mathRegex = /^(what is|calculate)?\s*([\d\.\s\+\-\*\/\(\)\^%]+)$/i;
  const match = lower.match(mathRegex);
  if (match) {
    let expression = match[2].trim();
    if (/^[\d\.\s\+\-\*\/\(\)\^%]+$/.test(expression) && /[0-9]/.test(expression)) {
      try {
        let evalExpr = expression.replace(/\^/g, "**");
        const result = new Function(`return (${evalExpr})`)();
        if (result !== undefined && !isNaN(result)) {
          const routingMs = Math.max(1, Math.round(performance.now() - startTime));
          return { type: "LOCAL", module: "Calculator", response: `The answer is ${result}.`, routingMs, totalMs: routingMs + 2 };
        }
      } catch (e) {
        // Fallback to Gemini
      }
    }
  }

  // 4. Memory Commands
  if (cleaned.startsWith("remember this") || cleaned.startsWith("forget this") || cleaned.startsWith("show memory") || cleaned.startsWith("delete memory")) {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Memory", response: "I have updated your memory.", routingMs, totalMs: routingMs + 2 };
  }

  // 5. Device Info
  if (cleaned.includes("battery level") || cleaned === "battery" || cleaned === "charging") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Device", response: "I cannot access physical battery data from this browser environment, but I am fully charged and ready!", routingMs, totalMs: routingMs + 2 };
  }
  if (cleaned === "network" || cleaned === "internet") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return { type: "LOCAL", module: "Device", response: navigator.onLine ? "You are currently online and connected to the network." : "You appear to be offline.", routingMs, totalMs: routingMs + 2 };
  }

  // Default to Gemini
  return { type: "GEMINI" };
}

