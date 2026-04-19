/**
 * @mwpenn94/manus-next-memory
 * Cross-session memory system for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Memory types
export interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  source: string;
  taskId: string;
  createdAt: Date;
  relevanceScore?: number;
}

export interface MemorySearchOptions {
  query: string;
  limit?: number;
  category?: string;
  minRelevance?: number;
}

export interface MemoryStore {
  search(options: MemorySearchOptions): Promise<MemoryEntry[]>;
  add(entry: Omit<MemoryEntry, "id" | "createdAt">): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-memory";
export const PACKAGE_VERSION = "0.1.0";
