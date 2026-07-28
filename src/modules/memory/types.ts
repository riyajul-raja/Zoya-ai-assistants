export type MemorySource = "chat" | "voice";

export interface Memory {
  id: string;
  userId: string;
  text: string;
  category: string;
  importance: number;
  createdAt: number;
  updatedAt: number;
  source: MemorySource;
  tags: string[];
}

export interface CreateMemoryDTO {
  text: string;
  category: string;
  importance: number;
  source: MemorySource;
  tags: string[];
}

export interface UpdateMemoryDTO {
  text?: string;
  category?: string;
  importance?: number;
  tags?: string[];
}

export interface SaveMemoryResult {
  success: boolean;
  memory?: Memory;
  error?: string;
}

export interface SearchMemoryOptions {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface ClassificationResult {
  shouldSave: boolean;
  category: string;
  importance: number;
  reason: string;
}

export interface MemoryUpdateDecision {
  action: "create" | "update" | "ignore";
  reason: string;
  memoryId?: string;
  updateData?: UpdateMemoryDTO;
}

export interface ProcessMemoryResult {
  action: "create" | "update" | "ignore";
  success: boolean;
  reason: string;
  memory?: Memory;
}
