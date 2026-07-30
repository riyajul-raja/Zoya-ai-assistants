export type IntentType = "LOCAL" | "GEMINI";

export interface IntentResult {
  type: IntentType;
  module?: string;
  response?: string;
  routingMs?: number;
  totalMs?: number;
  identityCategory?: string;
  selectedTemplateId?: string;
  // Brain V4 Confidence & Decision fields
  intentConfidence: number;
  contextConfidence: number;
  memoryConfidence: number;
  toolConfidence: number;
  overallConfidence: number;
  decision: "Local Engine" | "Calculator" | "Time" | "Memory" | "Device Tool" | "Research Mode" | "Gemini";
  toolSelected: string;
  reasoningTimeMs: number;
}

// Salutation / Address lookup
export function getUserAddress(): string {
  try {
    const directName = localStorage.getItem("zoya_user_name") || localStorage.getItem("user_name");
    if (directName && directName.trim().length > 0) {
      return directName.trim();
    }
  } catch (e) {
    // Ignore error
  }
  return "";
}

// Greeting Template Collections
const MORNING_TEMPLATES = [
  "Good morning, {ADDRESS}! ☀️ Main ready hoon. Aaj kis cheez me help karun?",
  "Good morning, {ADDRESS}! ☀️ Kaise hain aap? Aaj kya plan hai?",
  "Good morning, {ADDRESS}! ☀️ Hope you have a productive and great day ahead!",
  "Good morning, {ADDRESS}! ☀️ Ready whenever you are!",
  "Good morning, {ADDRESS}! ☀️ Chai-coffee peeli? Bataiye aaj kis par kaam karna hai?"
];

const AFTERNOON_TEMPLATES = [
  "Good afternoon, {ADDRESS}! 🌤️ Main ready hoon. Aaj kis cheez me help karun?",
  "Good afternoon, {ADDRESS}! 🌤️ Lunch ho gaya? How can I assist you right now?",
  "Good afternoon, {ADDRESS}! 🌤️ Ready for the afternoon push! What are we working on?",
  "Good afternoon, {ADDRESS}! 🌤️ Hope your day is going great. Kya help chahiye?"
];

const EVENING_TEMPLATES = [
  "Good evening, {ADDRESS}! 🌇 Main ready hoon. Aaj kis cheez me help karun?",
  "Good evening, {ADDRESS}! 🌇 Winding down or starting something new? Main ready hoon!",
  "Good evening, {ADDRESS}! 🌇 Hope you had a great day today. Batao kya plan hai!"
];

const NIGHT_TEMPLATES = [
  "Good night, {ADDRESS}! 🌙 Late night coding ya review? Main ready hoon!",
  "Good night, {ADDRESS}! 🌙 Rest well or let me know if you need any quick help!",
  "Good night, {ADDRESS}! 🌙 Late night session? I am right here for you!"
];

const GENERAL_GREETING_TEMPLATES = [
  "Hello, {ADDRESS}! 😊 Main ready hoon. Aaj kis cheez me help karun?",
  "Hey, {ADDRESS}! 👋 Main ready hoon, ready whenever you are. Bataiye kya karna hai?",
  "Hi, {ADDRESS}! ✨ Welcome back. Aaj kis topic par baat karni hai?",
  "Namaste, {ADDRESS}! 🙏 Main ready hoon, boliyega kya help chahiye?"
];

const THANKS_TEMPLATES = [
  "You're most welcome, {ADDRESS}! 😊 Happy to help anytime.",
  "Anytime, {ADDRESS}! It's always my pleasure to assist you.",
  "Welcome, {ADDRESS}! 🌟 Let me know if you need anything else.",
  "Koi baat nahi, {ADDRESS}! 😊 Always here for you."
];

const BYE_TEMPLATES = [
  "Goodbye, {ADDRESS}! 👋 Take care and see you soon.",
  "Bye bye, {ADDRESS}! 👋 Have a wonderful time ahead!",
  "See you later, {ADDRESS}! 👋 Call me whenever you need help."
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
  const identityRegex = /^(who\s*are\s*you|what\s*is\s*your\s*name|whats\s*your\s*name|your\s*name|tell\s*me\s*about\s*yourself|introduce\s*yourself|who\s*is\s*zoya|tum\s*kaun\s*ho|tumhara\s*naam\s*kya\s*hai|who\s*are\s*u|what\s*are\s*you|apne\s*bare\s*me\s*batao|apne\s*baare\s*mein\s*batao|apne\s*bare\s*me\s*bataiye|apne\s*baare\s*mein\s*bataiye)(\s+(zoya))?$/i;

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
    const address = getUserAddress();
    if (address) {
      selectedResponse = selectedResponse.replace(/{ADDRESS}/g, address);
      selectedResponse = selectedResponse.replace(/\bBoss\b/gi, address);
    } else {
      selectedResponse = selectedResponse.replace(/,?\s*{ADDRESS}/g, "");
      selectedResponse = selectedResponse.replace(/,?\s*\bBoss\b/gi, "");
      selectedResponse = selectedResponse.replace(/\s+/g, " ").replace(/\s+([!?,.])/g, "$1").trim();
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
      selectedTemplateId,
      intentConfidence: 98,
      contextConfidence: 95,
      memoryConfidence: 92,
      toolConfidence: 97,
      overallConfidence: 96,
      decision: "Local Engine",
      toolSelected: matchedModule === "Identity" ? "Identity Engine" : "Greetings / Local",
      reasoningTimeMs: routingMs
    };
  }

  // 2. Date & Time
  if (cleaned.includes("current time") || cleaned === "time" || cleaned === "what time is it") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Date & Time",
      response: `The current time is ${new Date().toLocaleTimeString()}.`,
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 99,
      contextConfidence: 95,
      memoryConfidence: 90,
      toolConfidence: 99,
      overallConfidence: 96,
      decision: "Time",
      toolSelected: "Clock / Time",
      reasoningTimeMs: routingMs
    };
  }
  if (cleaned.includes("current date") || cleaned === "date" || cleaned === "what is the date") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Date & Time",
      response: `Today's date is ${new Date().toLocaleDateString()}.`,
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 99,
      contextConfidence: 95,
      memoryConfidence: 90,
      toolConfidence: 99,
      overallConfidence: 96,
      decision: "Time",
      toolSelected: "Clock / Time",
      reasoningTimeMs: routingMs
    };
  }
  if (cleaned === "day" || cleaned === "what day is it") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Date & Time",
      response: `Today is ${days[new Date().getDay()]}.`,
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 99,
      contextConfidence: 95,
      memoryConfidence: 90,
      toolConfidence: 99,
      overallConfidence: 96,
      decision: "Time",
      toolSelected: "Clock / Time",
      reasoningTimeMs: routingMs
    };
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
          return {
            type: "LOCAL",
            module: "Calculator",
            response: `The answer is ${result}.`,
            routingMs,
            totalMs: routingMs + 2,
            intentConfidence: 98,
            contextConfidence: 92,
            memoryConfidence: 88,
            toolConfidence: 99,
            overallConfidence: 94,
            decision: "Calculator",
            toolSelected: "Math Evaluator",
            reasoningTimeMs: routingMs
          };
        }
      } catch (e) {
        // Fallback to Gemini
      }
    }
  }

  // 4. Memory Commands
  if (cleaned.startsWith("remember this") || cleaned.startsWith("forget this") || cleaned.startsWith("show memory") || cleaned.startsWith("delete memory")) {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Memory",
      response: "I have updated your memory.",
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 97,
      contextConfidence: 94,
      memoryConfidence: 96,
      toolConfidence: 98,
      overallConfidence: 96,
      decision: "Memory",
      toolSelected: "Memory Storage",
      reasoningTimeMs: routingMs
    };
  }

  // 5. Device Info
  if (cleaned.includes("battery level") || cleaned === "battery" || cleaned === "charging") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Device",
      response: "I cannot access physical battery data from this browser environment, but I am fully charged and ready!",
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 96,
      contextConfidence: 90,
      memoryConfidence: 85,
      toolConfidence: 95,
      overallConfidence: 92,
      decision: "Device Tool",
      toolSelected: "Device State",
      reasoningTimeMs: routingMs
    };
  }
  if (cleaned === "network" || cleaned === "internet") {
    const routingMs = Math.max(1, Math.round(performance.now() - startTime));
    return {
      type: "LOCAL",
      module: "Device",
      response: navigator.onLine ? "You are currently online and connected to the network." : "You appear to be offline.",
      routingMs,
      totalMs: routingMs + 2,
      intentConfidence: 96,
      contextConfidence: 90,
      memoryConfidence: 85,
      toolConfidence: 95,
      overallConfidence: 92,
      decision: "Device Tool",
      toolSelected: "Device State",
      reasoningTimeMs: routingMs
    };
  }

  // Default to Gemini with Decision & Confidence Analysis
  const reasoningMs = Math.max(1, Math.round(performance.now() - startTime));

  const isResearch = /^(compare|versus|vs|research|deep\s*analysis|pros\s*and\s*cons|difference\s*between|explain\s*in\s*detail|latest\s*trends)/i.test(cleaned);
  if (isResearch) {
    return {
      type: "GEMINI",
      intentConfidence: 94,
      contextConfidence: 92,
      memoryConfidence: 90,
      toolConfidence: 95,
      overallConfidence: 93,
      decision: "Research Mode",
      toolSelected: "Deep Research Engine",
      reasoningTimeMs: reasoningMs,
      routingMs: reasoningMs,
      totalMs: reasoningMs + 2
    };
  }

  const isAmbiguous = /^(phone|mobile|laptop|car|bike)\s*(suggest|chahiye|recommend|batao)|^(ai|app|website|bot)\s*(banana|banani|build|create|make)|^(app|website)\s*(slow|lag|hang|fail)|^business\s*(shuru|start)/i.test(cleaned) || (cleaned.split(" ").length <= 3 && !/(\d|how|what|why|where|when|code|fix|write|is|are)/i.test(cleaned));
  if (isAmbiguous) {
    return {
      type: "GEMINI",
      intentConfidence: 76,
      contextConfidence: 72,
      memoryConfidence: 68,
      toolConfidence: 80,
      overallConfidence: 74,
      decision: "Gemini",
      toolSelected: "Gemini AI Engine",
      reasoningTimeMs: reasoningMs,
      routingMs: reasoningMs,
      totalMs: reasoningMs + 2
    };
  }

  return {
    type: "GEMINI",
    intentConfidence: 95,
    contextConfidence: 93,
    memoryConfidence: 91,
    toolConfidence: 96,
    overallConfidence: 94,
    decision: "Gemini",
    toolSelected: "Gemini AI Engine",
    reasoningTimeMs: reasoningMs,
    routingMs: reasoningMs,
    totalMs: reasoningMs + 2
  };
}

