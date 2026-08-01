import { Memory, UpdateMemoryDTO, MemoryUpdateDecision } from "./types";

export class MemoryUpdater {
  /**
   * Finds an existing memory that conflicts with or duplicates the new text,
   * based on category and subject prefix matching.
   */
  findExistingMemory(text: string, category: string, existingMemories: Memory[]): Memory | undefined {
    const lowerText = text.toLowerCase().trim();

    // Subject extraction regexes based on Classification rules
    const subjectRegexes = [
      /^(my name is |i am called |i'm called )/i,
      /^(my birthday is |i was born on )/i,
      /^(i live in |my address is |i am from |i'm from )/i,
      /^(my wife is |my husband is |my son is |my daughter is )/i,
      /^(my wife |my husband |my son |my daughter |my family )/i,
      /^(i work as |my job is )/i,
      /^(i am building |i'm building |i am working on |i'm working on |my project is )/i,
      /^(my favourite [a-z]+ is |my favorite [a-z]+ is )/i,
      /^(my favourite [a-z]+ |my favorite [a-z]+ )/i
    ];

    let extractedSubject = "";
    for (const regex of subjectRegexes) {
      const match = lowerText.match(regex);
      if (match && match[0]) {
        extractedSubject = match[0]; // The entire matched prefix
        break;
      }
    }

    if (extractedSubject) {
      return existingMemories.find(m => {
        const mLower = m.text.toLowerCase().trim();
        return mLower.startsWith(extractedSubject) && m.category === category;
      });
    }

    // Exact match fallback
    return existingMemories.find(m => m.text.toLowerCase().trim() === lowerText);
  }

  /**
   * Determines if we should update an existing memory or if it's a duplicate.
   */
  shouldUpdate(newText: string, existingMemory: Memory): MemoryUpdateDecision {
    const newLower = newText.toLowerCase().trim();
    const existingLower = existingMemory.text.toLowerCase().trim();
    
    if (newLower === existingLower) {
      return {
        action: "ignore",
        reason: "Exact duplicate of existing memory."
      };
    }
    
    return {
      action: "update",
      reason: "Conflicting memory found, updating existing memory.",
      memoryId: existingMemory.id
    };
  }

  /**
   * Returns the update decision and payload for updating an existing memory.
   * Does NOT connect to Firestore.
   */
  updateExistingMemory(existingMemory: Memory, newText: string): MemoryUpdateDecision {
    const decision = this.shouldUpdate(newText, existingMemory);
    
    if (decision.action === "update") {
      if (import.meta.env.DEV) {
        console.log(`[MemoryUpdater] Updating memory ${existingMemory.id}: "${existingMemory.text}" -> "${newText}"`);
      }
      
      decision.updateData = {
        text: newText
      };
    } else {
      if (import.meta.env.DEV) {
        console.log(`[MemoryUpdater] Ignoring duplicate memory: "${newText}"`);
      }
    }
    
    return decision;
  }
}

export const memoryUpdater = new MemoryUpdater();
