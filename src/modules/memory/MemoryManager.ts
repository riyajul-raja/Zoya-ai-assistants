import { MemoryService } from "./MemoryService";
import { CreateMemoryDTO, UpdateMemoryDTO, Memory, SaveMemoryResult, SearchMemoryOptions } from "./types";

export class MemoryManager {
  private service: MemoryService;

  constructor() {
    this.service = new MemoryService();
  }

  async saveMemory(data: CreateMemoryDTO): Promise<SaveMemoryResult> {
    try {
      // 1. Validate data
      if (!data.text || data.text.trim().length === 0) {
        if (import.meta.env.DEV) console.warn("[MemoryManager] Save rejected: empty text");
        return { success: false, error: "Memory text cannot be empty" };
      }

      if (!data.category || data.category.trim().length === 0) {
        if (import.meta.env.DEV) console.warn("[MemoryManager] Save rejected: invalid category");
        return { success: false, error: "Memory category is invalid" };
      }

      if (typeof data.importance !== "number" || data.importance < 1 || data.importance > 5) {
        if (import.meta.env.DEV) console.warn("[MemoryManager] Save rejected: invalid importance");
        return { success: false, error: "Importance must be between 1 and 5" };
      }

      // 2. Prevent duplicate memories
      const existingMemories = await this.service.getAllMemories();
      const isDuplicate = existingMemories.some(
        (m) => m.text.trim().toLowerCase() === data.text.trim().toLowerCase()
      );

      if (isDuplicate) {
        if (import.meta.env.DEV) {
          console.log(`[MemoryManager] Duplicate memory prevented: "${data.text.substring(0, 20)}..."`);
        }
        return { success: false, error: "Duplicate memory" };
      }

      // 3. Save memory
      const memory = await this.service.saveMemory(data);
      if (import.meta.env.DEV) {
        console.log(`[MemoryManager] Memory saved successfully: ${memory.id}`);
      }
      return { success: true, memory };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("[MemoryManager] Failed to save memory:", error);
      }
      return { success: false, error: error.message || "Failed to save memory" };
    }
  }

  async updateMemory(id: string, data: UpdateMemoryDTO): Promise<void> {
    return this.service.updateMemory(id, data);
  }

  async deleteMemory(id: string): Promise<void> {
    return this.service.deleteMemory(id);
  }

  async searchMemories(options: SearchMemoryOptions | string): Promise<Memory[]> {
    try {
      if (typeof options === "string" && (!options || options.trim().length === 0)) {
         return [];
      }
      
      if (typeof options !== "string" && (!options.query || options.query.trim().length === 0)) {
         // Maybe just filtering by category/tags, that's fine. 
         // If they provide completely empty string with no category/tags, we can just return all or empty.
         // Let's pass it down and let the service handle it.
      }

      const results = await this.service.searchMemories(options);
      
      if (import.meta.env.DEV) {
        console.log(`[MemoryManager] Search returned ${results.length} results.`);
      }
      
      return results;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[MemoryManager] Search failed:", error);
      }
      return []; // Never crash, return empty array
    }
  }

  async getAllMemories(): Promise<Memory[]> {
    return this.service.getAllMemories();
  }
}

export const memoryManager = new MemoryManager();
