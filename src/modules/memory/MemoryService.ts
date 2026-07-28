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
import { Memory, CreateMemoryDTO, UpdateMemoryDTO } from "./types";

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

  async searchMemories(searchTerm: string): Promise<Memory[]> {
    try {
      // Fetch all memories and filter locally since standard Firestore
      // doesn't support full-text search directly without third-party integration.
      const q = query(this.getCollectionRef());
      const snapshot = await getDocs(q);
      const memories = snapshot.docs.map(doc => doc.data() as Memory);
      
      const lowerTerm = searchTerm.toLowerCase();
      return memories.filter(
        m => m.text.toLowerCase().includes(lowerTerm) || 
             m.category.toLowerCase().includes(lowerTerm) || 
             m.tags.some(t => t.toLowerCase().includes(lowerTerm))
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${this.userId}/memories`);
      throw error;
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
