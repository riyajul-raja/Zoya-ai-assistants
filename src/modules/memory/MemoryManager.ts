import { MemoryService } from "./MemoryService";
import { CreateMemoryDTO, UpdateMemoryDTO, Memory } from "./types";

export class MemoryManager {
  private service: MemoryService;

  constructor() {
    this.service = new MemoryService();
  }

  async saveMemory(data: CreateMemoryDTO): Promise<Memory> {
    return this.service.saveMemory(data);
  }

  async updateMemory(id: string, data: UpdateMemoryDTO): Promise<void> {
    return this.service.updateMemory(id, data);
  }

  async deleteMemory(id: string): Promise<void> {
    return this.service.deleteMemory(id);
  }

  async searchMemories(searchTerm: string): Promise<Memory[]> {
    return this.service.searchMemories(searchTerm);
  }

  async getAllMemories(): Promise<Memory[]> {
    return this.service.getAllMemories();
  }
}

export const memoryManager = new MemoryManager();
