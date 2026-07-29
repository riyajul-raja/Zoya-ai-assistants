export type IntentType = "LOCAL" | "GEMINI";

export interface IntentResult {
  type: IntentType;
  module?: string;
  response?: string;
}

export function detectIntent(text: string): IntentResult {
  const lower = text.toLowerCase().trim();

  // 1. Open Commands (Handled by processCommand in App.tsx)

  // 2. Greetings
  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "good night", "bye", "thanks", "thank you"];
  if (greetings.includes(lower)) {
    let response = "Hello! How can I help you today?";
    if (lower.includes("morning")) response = "Good morning! Hope you have a great day.";
    if (lower.includes("afternoon")) response = "Good afternoon!";
    if (lower.includes("evening")) response = "Good evening!";
    if (lower.includes("night")) response = "Good night! Sweet dreams.";
    if (lower.includes("bye")) response = "Goodbye! See you soon.";
    if (lower.includes("thank")) response = "You're welcome!";
    return { type: "LOCAL", module: "Greetings", response };
  }

  if (lower === "who are you?" || lower === "who are you" || lower === "what is your name?" || lower === "what is your name") {
    return { type: "LOCAL", module: "Greetings", response: "My name is Zoya. I am your AI assistant." };
  }

  // 3. Date & Time
  if (lower.includes("current time") || lower === "time" || lower === "what time is it") {
    return { type: "LOCAL", module: "Date & Time", response: `The current time is ${new Date().toLocaleTimeString()}.` };
  }
  if (lower.includes("current date") || lower === "date" || lower === "what is the date") {
    return { type: "LOCAL", module: "Date & Time", response: `Today's date is ${new Date().toLocaleDateString()}.` };
  }
  if (lower === "day" || lower === "what day is it") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return { type: "LOCAL", module: "Date & Time", response: `Today is ${days[new Date().getDay()]}.` };
  }
  if (lower === "month" || lower === "what month is it") {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return { type: "LOCAL", module: "Date & Time", response: `It is currently ${months[new Date().getMonth()]}.` };
  }
  if (lower === "year" || lower === "what year is it") {
    return { type: "LOCAL", module: "Date & Time", response: `We are in the year ${new Date().getFullYear()}.` };
  }

  // 4. Calculator (Basic Math Expressions)
  // Simple regex for math expressions like "what is 5 + 5", "calculate 10 * 20", "5+5"
  const mathRegex = /^(what is|calculate)?\s*([\d\.\s\+\-\*\/\(\)\^%]+)$/i;
  const match = lower.match(mathRegex);
  if (match) {
    let expression = match[2].trim();
    // basic sanitization
    if (/^[\d\.\s\+\-\*\/\(\)\^%]+$/.test(expression) && /[0-9]/.test(expression)) {
      try {
        // replace ^ with ** for eval
        let evalExpr = expression.replace(/\^/g, "**");
        // replace % with /100 if used as percentage, but standard js % is modulo.
        // Let's just use Function for safe basic math eval
        const result = new Function(`return (${evalExpr})`)();
        if (result !== undefined && !isNaN(result)) {
          return { type: "LOCAL", module: "Calculator", response: `The answer is ${result}.` };
        }
      } catch (e) {
        // ignore and fallback
      }
    }
  }

  // Also handle explicit square root
  const sqrtMatch = lower.match(/square root of ([\d\.]+)/);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    return { type: "LOCAL", module: "Calculator", response: `The square root of ${num} is ${Math.sqrt(num)}.` };
  }

  // 5. Memory Commands
  // Handled by memoryOrchestrator in App.tsx mostly, but we can intercept explicit ones
  if (lower.startsWith("remember this") || lower.startsWith("forget this") || lower.startsWith("show memory") || lower.startsWith("delete memory") || lower.startsWith("update memory")) {
    // Return a dummy local intent so App.tsx doesn't send to Gemini, and let the background process do it.
    return { type: "LOCAL", module: "Memory", response: "I have updated your memory." };
  }

  // 6. Device Info
  if (lower.includes("battery level") || lower === "battery" || lower === "charging") {
    return { type: "LOCAL", module: "Device", response: "I cannot access physical battery data from this browser environment, but I am fully charged and ready!" };
  }
  if (lower === "network" || lower === "internet") {
    return { type: "LOCAL", module: "Device", response: navigator.onLine ? "You are currently online and connected to the network." : "You appear to be offline." };
  }
  if (lower.includes("storage") || lower.includes("ram")) {
    return { type: "LOCAL", module: "Device", response: "Your device is running smoothly, though I don't have direct access to your RAM or storage details." };
  }
  
  // 7. Unit Conversions (basic ones)
  const convMatch = lower.match(/^convert ([\d\.]+) (celcius|celsius|c|fahrenheit|f) to (fahrenheit|f|celcius|celsius|c)$/i);
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    const from = convMatch[2].charAt(0).toLowerCase();
    const to = convMatch[3].charAt(0).toLowerCase();
    if (from === 'c' && to === 'f') {
      return { type: "LOCAL", module: "Conversions", response: `${val}°C is ${((val * 9/5) + 32).toFixed(2)}°F.` };
    } else if (from === 'f' && to === 'c') {
      return { type: "LOCAL", module: "Conversions", response: `${val}°F is ${((val - 32) * 5/9).toFixed(2)}°C.` };
    }
  }

  // Add more specific conversions if needed, e.g., km to miles
  const kmMatch = lower.match(/^convert ([\d\.]+) (km|kilometers) to (miles|mi)$/i);
  if (kmMatch) {
    const val = parseFloat(kmMatch[1]);
    return { type: "LOCAL", module: "Conversions", response: `${val} kilometers is ${(val * 0.621371).toFixed(2)} miles.` };
  }
  
  const miMatch = lower.match(/^convert ([\d\.]+) (miles|mi) to (km|kilometers)$/i);
  if (miMatch) {
    const val = parseFloat(miMatch[1]);
    return { type: "LOCAL", module: "Conversions", response: `${val} miles is ${(val / 0.621371).toFixed(2)} kilometers.` };
  }

  // Default to Gemini
  return { type: "GEMINI" };
}
