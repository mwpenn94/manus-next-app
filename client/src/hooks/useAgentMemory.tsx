
import { useState, useEffect, useCallback, useMemo } from 'react';

export type MemoryType = 'fact' | 'preference' | 'context' | 'instruction';

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  createdAt: number;
  relevanceScore: number;
  accessCount: number;
  lastAccessed: number;
}

interface UseAgentMemoryOptions {
  taskId: string;
  maxMemories?: number;
}

const JACCARD_SIMILARITY_THRESHOLD = 0.8;

// Helper to calculate Jaccard similarity between two strings
const jaccardSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set(Array.from(set1).concat(Array.from(set2)));
  return intersection.size / union.size;
};

// Helper to format bytes into a human-readable string
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const useAgentMemory = ({
  taskId,
  maxMemories = 100,
}: UseAgentMemoryOptions) => {
  const storageKey = `agent-memory-${taskId}`;

  const [memories, setMemories] = useState<Memory[]>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading from localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(memories));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [memories, storageKey]);

  const calculateRelevance = useCallback((memory: Memory): number => {
    const now = Date.now();
    const recency = Math.exp(-((now - memory.lastAccessed) / (1000 * 3600 * 24))); // Decay over 24 hours
    const frequency = Math.log1p(memory.accessCount);
    return recency + frequency; // Simple weighted sum
  }, []);

  const updateAndSortMemories = useCallback((updatedMemories: Memory[]) => {
    const scoredMemories = updatedMemories.map(m => ({
      ...m,
      relevanceScore: calculateRelevance(m),
    }));
    scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    setMemories(scoredMemories);
  }, [calculateRelevance]);

  const addMemory = useCallback((content: string, type: MemoryType) => {
    // Deduplication check
    const isDuplicate = memories.some(
      m => jaccardSimilarity(m.content, content) > JACCARD_SIMILARITY_THRESHOLD
    );

    if (isDuplicate) {
      console.log('Skipping similar memory.');
      return;
    }

    const now = Date.now();
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      content,
      type,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
      relevanceScore: 0, // Will be calculated in updateAndSortMemories
    };

    let updatedMemories = [...memories, newMemory];

    // Auto-prune if over the limit
    if (updatedMemories.length > maxMemories) {
      updatedMemories.sort((a, b) => a.relevanceScore - b.relevanceScore); // Sort ascending to find least relevant
      updatedMemories.shift(); // Remove the least relevant
    }

    updateAndSortMemories(updatedMemories);

  }, [memories, maxMemories, updateAndSortMemories]);

  const removeMemory = useCallback((id: string) => {
    const updatedMemories = memories.filter(m => m.id !== id);
    setMemories(updatedMemories);
  }, [memories]);

  const clearAll = useCallback(() => {
    setMemories([]);
  }, []);

  const searchMemories = useCallback((query: string): Memory[] => {
    if (!query.trim()) {
      return [];
    }

    const lowerCaseQuery = query.toLowerCase();
    const searchResults = memories
      .map(memory => {
        const score = memory.content.toLowerCase().includes(lowerCaseQuery) ? 1 : 0;
        return { ...memory, searchScore: score };
      })
      .filter(m => m.searchScore > 0);

    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Update access stats for found memories
    const now = Date.now();
    const updatedMemories = memories.map(m => {
        if (searchResults.some(sr => sr.id === m.id)) {
            return {
                ...m,
                accessCount: m.accessCount + 1,
                lastAccessed: now,
            };
        }
        return m;
    });

    updateAndSortMemories(updatedMemories);

    return searchResults;
  }, [memories, updateAndSortMemories]);

  const memoryCount = useMemo(() => memories.length, [memories]);

  const storageUsed = useMemo(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return formatBytes(item?.length || 0);
    } catch {
      return '0 Bytes';
    }
  }, [memories, storageKey]); // Depends on memories to recalculate

  const sortedMemories = useMemo(() => {
      const newSorted = [...memories];
      newSorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return newSorted;
  }, [memories]);

  return {
    memories: sortedMemories,
    addMemory,
    removeMemory,
    searchMemories,
    clearAll,
    memoryCount,
    storageUsed,
  };
};
