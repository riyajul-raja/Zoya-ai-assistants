import { memoryManager } from "./MemoryManager";

export const saveMemory = memoryManager.saveMemory.bind(memoryManager);
export const updateMemory = memoryManager.updateMemory.bind(memoryManager);
export const deleteMemory = memoryManager.deleteMemory.bind(memoryManager);
export const searchMemories = memoryManager.searchMemories.bind(memoryManager);
export const getAllMemories = memoryManager.getAllMemories.bind(memoryManager);

export * from "./types";
export { MemoryService } from "./MemoryService";
export { MemoryManager } from "./MemoryManager";
export { MemoryClassifier, memoryClassifier } from "./MemoryClassifier";
