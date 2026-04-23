/**
 * Prompt Cache — In-memory LRU cache for LLM call optimization
 *
 * Two layers:
 * 1. Prefix Cache: Hashes the static system prompt + tool definitions.
 *    When the same prefix is reused across turns, the LLM provider can
 *    skip re-processing those tokens (provider-level KV cache). We track
 *    the hash to enable cache-control headers and metrics.
 *
 * 2. Response Cache: For deterministic operations like memory extraction,
 *    caches the full LLM response keyed on a hash of the input content.
 *    Only used for completed/immutable inputs.
 *
 * Both caches use LRU eviction with configurable max size and TTL.
 */

import { createHash } from "crypto";

// ── Types ──

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  hits: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

// ── LRU Cache Implementation ──

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttlMs: number;
  private metrics: CacheMetrics;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.metrics = { hits: 0, misses: 0, evictions: 0, size: 0, maxSize };
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.metrics.size = this.cache.size;
      this.metrics.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    this.metrics.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    // Delete existing to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.metrics.evictions++;
      }
    }

    this.cache.set(key, { value, createdAt: Date.now(), hits: 0 });
    this.metrics.size = this.cache.size;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.metrics.size = this.cache.size;
      return false;
    }
    return true;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics, size: this.cache.size };
  }

  clear(): void {
    this.cache.clear();
    this.metrics.size = 0;
  }

  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.metrics.size = this.cache.size;
    }
    return existed;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Invalidate all entries matching a predicate */
  invalidateWhere(predicate: (key: string, entry: CacheEntry<T>) => boolean): number {
    let count = 0;
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (predicate(key, entry)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.metrics.size = this.cache.size;
    return count;
  }

  /** Export all entries for persistence */
  exportEntries(): Array<{ key: string; value: T; createdAt: number }> {
    const result: Array<{ key: string; value: T; createdAt: number }> = [];
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (Date.now() - entry.createdAt <= this.ttlMs) {
        result.push({ key, value: entry.value, createdAt: entry.createdAt });
      }
    }
    return result;
  }

  /** Import entries from persistence (skips expired) */
  importEntries(entries: Array<{ key: string; value: T; createdAt: number }>): number {
    let imported = 0;
    for (const entry of entries) {
      if (Date.now() - entry.createdAt <= this.ttlMs) {
        this.set(entry.key, entry.value);
        imported++;
      }
    }
    return imported;
  }
}

// ── Hash Helpers ──

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ── Prefix Cache ──
// Tracks system prompt + tool definition hashes for provider-level prefix caching.
// Max 50 entries, 1 hour TTL (system prompts rarely change within a session).

interface PrefixCacheEntry {
  hash: string;
  tokenEstimate: number;
  firstSeen: number;
  reuseCount: number;
}

const prefixCache = new LRUCache<PrefixCacheEntry>(50, 60 * 60 * 1000);

/**
 * Register a prefix (system prompt + tools) and get its hash.
 * The hash can be sent as a cache-control hint to the LLM provider.
 */
export function registerPrefix(systemPrompt: string, toolsJson: string): {
  hash: string;
  cached: boolean;
  tokenEstimate: number;
} {
  const combined = systemPrompt + "||" + toolsJson;
  const hash = hashContent(combined);
  const existing = prefixCache.get(hash);

  if (existing) {
    existing.reuseCount++;
    prefixCache.set(hash, existing);
    return { hash, cached: true, tokenEstimate: existing.tokenEstimate };
  }

  // Rough token estimate: ~4 chars per token
  const tokenEstimate = Math.ceil(combined.length / 4);
  const entry: PrefixCacheEntry = {
    hash,
    tokenEstimate,
    firstSeen: Date.now(),
    reuseCount: 0,
  };
  prefixCache.set(hash, entry);
  return { hash, cached: false, tokenEstimate };
}

// ── Memory Extraction Response Cache ──
// Caches LLM responses for memory extraction on completed conversations.
// Max 200 entries, 24 hour TTL (completed conversations don't change).

interface MemoryCacheEntry {
  memories: Array<{ key: string; value: string }>;
  extractedAt: number;
}

const memoryCache = new LRUCache<MemoryCacheEntry>(200, 24 * 60 * 60 * 1000);

/**
 * Get cached memory extraction result for a conversation transcript.
 * Returns undefined if not cached.
 */
export function getCachedMemoryExtraction(
  transcript: string
): Array<{ key: string; value: string }> | undefined {
  const hash = hashContent(transcript);
  const entry = memoryCache.get(hash);
  return entry?.memories;
}

/**
 * Cache a memory extraction result for a conversation transcript.
 */
export function cacheMemoryExtraction(
  transcript: string,
  memories: Array<{ key: string; value: string }>
): void {
  const hash = hashContent(transcript);
  memoryCache.set(hash, { memories, extractedAt: Date.now() });
}

// ── Metrics ──

export function getCacheMetrics(): {
  prefix: CacheMetrics;
  memory: CacheMetrics;
} {
  return {
    prefix: prefixCache.getMetrics(),
    memory: memoryCache.getMetrics(),
  };
}

/**
 * Clear all caches (useful for testing or memory pressure).
 */
export function clearAllCaches(): void {
  prefixCache.clear();
  memoryCache.clear();
}

/**
 * Invalidate a specific prefix cache entry by hash.
 */
export function invalidatePrefix(hash: string): boolean {
  return prefixCache.delete(hash);
}

/**
 * Invalidate a specific memory cache entry by transcript hash.
 */
export function invalidateMemoryCache(transcript: string): boolean {
  const hash = hashContent(transcript);
  return memoryCache.delete(hash);
}

/**
 * Invalidate all memory cache entries older than a given age (ms).
 */
export function invalidateStaleMemoryEntries(maxAgeMs: number): number {
  const cutoff = Date.now() - maxAgeMs;
  return memoryCache.invalidateWhere((_key, entry) => entry.createdAt < cutoff);
}

/**
 * Export cache state for persistence (e.g., to disk or database).
 */
export function exportCacheState(): {
  prefix: Array<{ key: string; value: PrefixCacheEntry; createdAt: number }>;
  memory: Array<{ key: string; value: MemoryCacheEntry; createdAt: number }>;
} {
  return {
    prefix: prefixCache.exportEntries(),
    memory: memoryCache.exportEntries(),
  };
}

/**
 * Import cache state from persistence.
 */
export function importCacheState(state: {
  prefix?: Array<{ key: string; value: PrefixCacheEntry; createdAt: number }>;
  memory?: Array<{ key: string; value: MemoryCacheEntry; createdAt: number }>;
}): { prefixImported: number; memoryImported: number } {
  return {
    prefixImported: state.prefix ? prefixCache.importEntries(state.prefix) : 0,
    memoryImported: state.memory ? memoryCache.importEntries(state.memory) : 0,
  };
}
