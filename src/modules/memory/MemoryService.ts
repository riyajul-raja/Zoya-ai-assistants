import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../services/firebaseService";
import { Memory, CreateMemoryDTO, UpdateMemoryDTO, SearchMemoryOptions } from "./types";

// TODO: The user ID is temporarily hardcoded as "riyajul" for Phase 1 testing.
// In future phases, this will be automatically replaced by the Google Login UID
// once Firebase Authentication is integrated.
const TEMPORARY_USER_ID = "riyajul";

export class MemoryService {
  private get userId(): string {
    return TEMPORARY_USER_ID;
  }

  private getCollectionRef() {
    return collection(db, "users", this.userId, "memories");
  }

  private getDocRef(memoryId: string) {
    return doc(db, "users", this.userId, "memories", memoryId);
  }

  async saveMemory(data: CreateMemoryDTO): Promise<Memory> {
    try {
      const memoryRef = doc(this.getCollectionRef());
      const now = Date.now();
      const memory: Memory = {
        id: memoryRef.id,
        userId: this.userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(memoryRef, memory);
      return memory;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${this.userId}/memories`);
      throw error;
    }
  }

  async updateMemory(id: string, data: UpdateMemoryDTO): Promise<void> {
    try {
      const memoryRef = this.getDocRef(id);
      const updateData = {
        ...data,
        updatedAt: Date.now(),
      };
      await updateDoc(memoryRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${this.userId}/memories/${id}`);
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      const memoryRef = this.getDocRef(id);
      await deleteDoc(memoryRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${this.userId}/memories/${id}`);
      throw error;
    }
  }

  async searchMemories(options: SearchMemoryOptions | string): Promise<Memory[]> {
    try {
      const q = query(this.getCollectionRef());
      const snapshot = await getDocs(q);
      let memories = snapshot.docs.map(doc => doc.data() as Memory);

      if (!memories || memories.length === 0) {
        return [];
      }

      const searchOptions = typeof options === 'string' ? { query: options } : options;
      const { query: searchTerm, category, tags, limit } = searchOptions;
      
      const lowerTerm = searchTerm.toLowerCase();

      // Filter
      memories = memories.filter(m => {
        // Category filter
        if (category && m.category !== category) {
          return false;
        }

        // Tags filter (must contain all specified tags)
        if (tags && tags.length > 0) {
          const hasAllTags = tags.every(t => m.tags.includes(t));
          if (!hasAllTags) {
            return false;
          }
        }

        // Text match
        if (lowerTerm) {
          const isExactMatch = m.text.toLowerCase() === lowerTerm;
          const isPartialMatch = m.text.toLowerCase().includes(lowerTerm);
          const isTagMatch = m.tags.some(t => t.toLowerCase().includes(lowerTerm));
          const isCategoryMatch = m.category.toLowerCase().includes(lowerTerm);
          
          if (!isExactMatch && !isPartialMatch && !isTagMatch && !isCategoryMatch) {
            return false;
          }
        }

        return true;
      });

      // Sort by relevance, importance, newest first
      memories.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (lowerTerm) {
          // Exact match gets highest relevance
          if (a.text.toLowerCase() === lowerTerm) scoreA += 100;
          if (b.text.toLowerCase() === lowerTerm) scoreB += 100;
          
          // Partial match
          if (a.text.toLowerCase().includes(lowerTerm)) scoreA += 10;
          if (b.text.toLowerCase().includes(lowerTerm)) scoreB += 10;

          // Tag match
          if (a.tags.some(t => t.toLowerCase().includes(lowerTerm))) scoreA += 5;
          if (b.tags.some(t => t.toLowerCase().includes(lowerTerm))) scoreB += 5;
        }

        // Sort by Relevance (Descending)
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        // Sort by Importance (Descending)
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }

        // Sort by Newest first (Descending)
        return b.createdAt - a.createdAt;
      });

      if (limit && limit > 0) {
        memories = memories.slice(0, limit);
      }

      if (import.meta.env.DEV) {
        console.log(`[MemoryService] Found ${memories.length} memories matching query.`);
      }

      return memories;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[MemoryService] Failed to search memories:", error);
      }
      return [];
    }
  }

  async getAllMemories(): Promise<Memory[]> {
    try {
      const q = query(this.getCollectionRef());
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Memory);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${this.userId}/memories`);
      throw error;
    }
  }
}
