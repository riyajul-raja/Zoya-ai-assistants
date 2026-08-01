import { MemorySource, ProcessMemoryResult } from "./types";
import { memoryClassifier } from "./MemoryClassifier";
import { memoryUpdater } from "./MemoryUpdater";
import { memoryManager } from "./MemoryManager";

export class MemoryOrchestrator {
  /**
   * Coordinates the flow of memory processing: 
   * Classify -> Search -> Update/Create.
   */
  async processMemory(text: string, source: MemorySource): Promise<ProcessMemoryResult> {
    try {
      if (!text || text.trim().length === 0) {
        return {
          action: "ignore",
          success: false,
          reason: "Empty text provided."
        };
      }

      // 1. Classification
      const classification = memoryClassifier.classifyMemory(text);
      if (!classification.shouldSave) {
        return {
          action: "ignore",
          success: true,
          reason: classification.reason
        };
      }

      // 2. Search for existing memories to see if we need to update or if it's duplicate
      // Using getAllMemories to check prefixes and exact matches across all existing memories
      const existingMemories = await memoryManager.getAllMemories();
      
      // 3. Find if it conflicts or duplicates
      const existingMemory = memoryUpdater.findExistingMemory(text, classification.category, existingMemories);

      if (existingMemory) {
        // 4. Update Engine decision
        const decision = memoryUpdater.updateExistingMemory(existingMemory, text);
        
        if (decision.action === "update" && decision.updateData && decision.memoryId) {
          await memoryManager.updateMemory(decision.memoryId, decision.updateData);
          
          // Construct the updated memory representation
          const updatedMemory = { 
            ...existingMemory, 
            ...decision.updateData, 
            updatedAt: Date.now() 
          };

          if (import.meta.env.DEV) {
            console.log(`[MemoryOrchestrator] Memory updated: ${decision.memoryId}`);
          }

          return {
            action: "update",
            success: true,
            reason: decision.reason,
            memory: updatedMemory
          };
        } else if (decision.action === "ignore") {
          return {
            action: "ignore",
            success: true,
            reason: decision.reason,
            memory: existingMemory
          };
        }
      }

      // 5. If no existing memory or it didn't match, Create new
      const saveResult = await memoryManager.saveMemory({
        text,
        category: classification.category,
        importance: classification.importance,
        source,
        tags: [classification.category]
      });

      if (saveResult.success && saveResult.memory) {
        if (import.meta.env.DEV) {
          console.log(`[MemoryOrchestrator] Memory created: ${saveResult.memory.id}`);
        }
        return {
          action: "create",
          success: true,
          reason: "Memory created successfully.",
          memory: saveResult.memory
        };
      }

      return {
        action: "ignore",
        success: false,
        reason: saveResult.error || "Failed to create memory."
      };

    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[MemoryOrchestrator] Error processing memory:", error);
      }
      return {
        action: "ignore",
        success: false,
        reason: error.message || "An unexpected error occurred during memory processing."
      };
    }
  }
}

export const memoryOrchestrator = new MemoryOrchestrator();
