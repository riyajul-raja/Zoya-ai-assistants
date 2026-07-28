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
