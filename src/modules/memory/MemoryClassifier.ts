import { ClassificationResult } from "./types";

export class MemoryClassifier {
  /**
   * Evaluates text to determine if it contains save-worthy personal information,
   * preferences, projects, or facts about the user.
   */
  classifyMemory(text: string): ClassificationResult {
    const lowerText = text.toLowerCase().trim();

    // 1. Filter out ignored patterns (greetings, short affirmations)
    const ignorePatterns = [
      /^hello\b/i,
      /^hi\b/i,
      /^thanks\b/i,
      /^thank you\b/i,
      /^ok\b/i,
      /^okay\b/i,
      /^nice\b/i,
      /^good morning\b/i,
      /^good evening\b/i,
      /^good afternoon\b/i,
      /^goodnight\b/i,
      /^good night\b/i,
      /^bye\b/i,
      /^yes\b/i,
      /^no\b/i,
      /^yeah\b/i,
      /^cool\b/i
    ];

    if (ignorePatterns.some(pattern => pattern.test(lowerText))) {
      if (import.meta.env.DEV) {
        console.log(`[MemoryClassifier] Ignoring trivial text: "${text}"`);
      }
      return {
        shouldSave: false,
        category: "ignored",
        importance: 0,
        reason: "Text matches ignored greeting or affirmation patterns."
      };
    }

    if (lowerText.length < 5) {
      if (import.meta.env.DEV) {
        console.log(`[MemoryClassifier] Ignoring too short text: "${text}"`);
      }
      return {
        shouldSave: false,
        category: "ignored",
        importance: 0,
        reason: "Text is too short to contain meaningful memory."
      };
    }

    // 2. Identify Save-Worthy Patterns

    // 5 = critical user information (name, birthday, location)
    if (lowerText.includes("my name is") || lowerText.includes("i am called") || lowerText.includes("i'm called")) {
      return this.createResult(true, "personal_info", 5, "User stated their name.");
    }
    if (lowerText.includes("my birthday is") || lowerText.includes("i was born on")) {
      return this.createResult(true, "personal_info", 5, "User stated their birthday.");
    }
    if (lowerText.includes("i live in") || lowerText.includes("my address is") || lowerText.includes("i am from") || lowerText.includes("i'm from")) {
      return this.createResult(true, "personal_info", 5, "User stated their location.");
    }

    // 4 = important personal fact (family, relationships, health, profession)
    if (lowerText.includes("my wife") || lowerText.includes("my husband") || lowerText.includes("my son") || lowerText.includes("my daughter") || lowerText.includes("my family")) {
      return this.createResult(true, "relationships", 4, "User stated a fact about their family or relationships.");
    }
    if (lowerText.includes("i work as") || lowerText.includes("my job is") || lowerText.includes("i am a") || lowerText.includes("i'm a")) {
      // Need a bit more specific match for 'i am a' to avoid trivial things, 
      // but for basic heuristic it's okay. Let's make it more generic fact for 'i am a' unless specific.
      if (lowerText.includes("i work as") || lowerText.includes("my job is")) {
        return this.createResult(true, "profession", 4, "User stated their profession or job.");
      }
    }

    // 3 = project (building, creating, working on)
    if (lowerText.includes("i am building") || lowerText.includes("i'm building") || lowerText.includes("i am working on") || lowerText.includes("i'm working on") || lowerText.includes("my project")) {
      return this.createResult(true, "project", 3, "User stated they are working on a project.");
    }

    // 2 = preference (likes, dislikes, favorites)
    if (lowerText.includes("my favourite") || lowerText.includes("my favorite") || lowerText.includes("i love") || lowerText.includes("i really like") || lowerText.includes("i enjoy")) {
      return this.createResult(true, "preference", 2, "User stated a preference or something they like.");
    }
    if (lowerText.includes("i hate") || lowerText.includes("i dislike") || lowerText.includes("i don't like")) {
      return this.createResult(true, "preference", 2, "User stated a dislike.");
    }

    // 1 = trivial (general statements that might be facts but low importance)
    if (lowerText.includes("i have a") || lowerText.includes("i own a") || lowerText.includes("i am a") || lowerText.includes("i'm a")) {
      return this.createResult(true, "fact", 1, "User stated a general fact about themselves.");
    }

    // Default fallback: if it doesn't match specific save-worthy patterns, do not save
    if (import.meta.env.DEV) {
      console.log(`[MemoryClassifier] Text did not match any specific save-worthy rules, but saving as uncategorized: "${text}"`);
    }
    return {
      shouldSave: true,
      category: "uncategorized",
      importance: 1,
      reason: "Saved as general context."
    };
  }

  private createResult(shouldSave: boolean, category: string, importance: number, reason: string): ClassificationResult {
    if (import.meta.env.DEV) {
      console.log(`[MemoryClassifier] Classifying as ${shouldSave ? 'SAVE' : 'IGNORE'} [Cat: ${category}, Imp: ${importance}] - ${reason}`);
    }
    return { shouldSave, category, importance, reason };
  }
}

export const memoryClassifier = new MemoryClassifier();
