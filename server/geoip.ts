/**
 * IP-Based Geolocation with LRU Cache
 *
 * Provides country detection from IP addresses using the free ip-api.com service.
 * Used as a fallback when CDN headers (CF-IPCountry, X-Country) are not available.
 *
 * Features:
 *   - In-memory LRU cache with configurable TTL (default 24h) and max size (10,000)
 *   - Batch lookup support (ip-api.com supports batch queries)
 *   - Graceful error handling — returns null on failure, never throws
 *   - Rate-limit aware: ip-api.com free tier allows 45 req/min
 */

// ── Types ──

export interface GeoLookupResult {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE") */
  countryCode: string | null;
  /** Full country name */
  countryName: string | null;
  /** Region/state code */
  region: string | null;
  /** City name */
  city: string | null;
  /** Whether the result came from cache */
  cached: boolean;
}

interface CacheEntry {
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  timestamp: number;
}

// ── Configuration ──

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MAX_CACHE_SIZE = 10_000;
const API_TIMEOUT_MS = 3_000; // 3 seconds max for geo lookup
const API_BASE_URL = "http://ip-api.com/json";
const BATCH_API_URL = "http://ip-api.com/batch";

// ── LRU Cache Implementation ──

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ── Singleton Cache ──

const geoCache = new LRUCache<string, CacheEntry>(DEFAULT_MAX_CACHE_SIZE);

// Rate limiting: track requests per minute
let requestsThisMinute = 0;
let minuteResetTimer: NodeJS.Timeout | null = null;
const MAX_REQUESTS_PER_MINUTE = 40; // Stay under ip-api.com's 45/min limit

function startRateLimitTimer() {
  if (!minuteResetTimer) {
    minuteResetTimer = setInterval(() => {
      requestsThisMinute = 0;
    }, 60_000);
    // Don't prevent process exit
    if (minuteResetTimer.unref) minuteResetTimer.unref();
  }
}

// ── Private Helpers ──

function isPrivateIP(ip: string): boolean {
  // Check for common private/reserved IP ranges
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA
  if (ip.startsWith("fe80")) return true; // IPv6 link-local
  return false;
}

function normalizeIP(ip: string): string {
  // Strip IPv6 prefix from IPv4-mapped addresses
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip.trim();
}

// ── Public API ──

/**
 * Look up the country for a given IP address.
 * Returns cached result if available and not expired.
 * Falls back to ip-api.com free tier.
 * Never throws — returns null fields on any error.
 */
export async function lookupCountry(
  rawIp: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<GeoLookupResult> {
  const ip = normalizeIP(rawIp);

  // Skip private IPs
  if (isPrivateIP(ip)) {
    return { countryCode: null, countryName: null, region: null, city: null, cached: false };
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
    return {
      countryCode: cached.countryCode,
      countryName: cached.countryName,
      region: cached.region,
      city: cached.city,
      cached: true,
    };
  }

  // Rate limit check
  startRateLimitTimer();
  if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    console.warn("[GeoIP] Rate limit reached, returning null");
    return { countryCode: null, countryName: null, region: null, city: null, cached: false };
  }

  try {
    requestsThisMinute++;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(ip)}?fields=status,countryCode,country,regionName,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[GeoIP] API returned ${response.status} for IP ${ip}`);
      return { countryCode: null, countryName: null, region: null, city: null, cached: false };
    }

    const data = await response.json() as {
      status: string;
      countryCode?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };

    if (data.status !== "success") {
      // Cache the failure too to avoid repeated lookups
      geoCache.set(ip, {
        countryCode: null,
        countryName: null,
        region: null,
        city: null,
        timestamp: Date.now(),
      });
      return { countryCode: null, countryName: null, region: null, city: null, cached: false };
    }

    const result: CacheEntry = {
      countryCode: data.countryCode || null,
      countryName: data.country || null,
      region: data.regionName || null,
      city: data.city || null,
      timestamp: Date.now(),
    };

    geoCache.set(ip, result);

    return {
      countryCode: result.countryCode,
      countryName: result.countryName,
      region: result.region,
      city: result.city,
      cached: false,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`[GeoIP] Timeout looking up IP ${ip}`);
    } else {
      console.warn(`[GeoIP] Error looking up IP ${ip}:`, err.message);
    }
    return { countryCode: null, countryName: null, region: null, city: null, cached: false };
  }
}

/**
 * Batch lookup countries for multiple IPs.
 * Uses ip-api.com batch endpoint (max 100 per request).
 */
export async function batchLookupCountries(
  ips: string[],
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<Map<string, GeoLookupResult>> {
  const results = new Map<string, GeoLookupResult>();
  const uncachedIps: string[] = [];

  // Check cache first
  for (const rawIp of ips) {
    const ip = normalizeIP(rawIp);
    if (isPrivateIP(ip)) {
      results.set(rawIp, { countryCode: null, countryName: null, region: null, city: null, cached: false });
      continue;
    }
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      results.set(rawIp, {
        countryCode: cached.countryCode,
        countryName: cached.countryName,
        region: cached.region,
        city: cached.city,
        cached: true,
      });
    } else {
      uncachedIps.push(ip);
    }
  }

  if (uncachedIps.length === 0) return results;

  // Rate limit check
  startRateLimitTimer();
  if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    for (const ip of uncachedIps) {
      results.set(ip, { countryCode: null, countryName: null, region: null, city: null, cached: false });
    }
    return results;
  }

  // Batch in chunks of 100 (ip-api.com limit)
  const chunks = [];
  for (let i = 0; i < uncachedIps.length; i += 100) {
    chunks.push(uncachedIps.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      requestsThisMinute++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(BATCH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map(ip => ({ query: ip, fields: "status,countryCode,country,regionName,city,query" }))),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json() as Array<{
        status: string;
        query: string;
        countryCode?: string;
        country?: string;
        regionName?: string;
        city?: string;
      }>;

      for (const entry of data) {
        const ip = entry.query;
        const cacheEntry: CacheEntry = {
          countryCode: entry.status === "success" ? (entry.countryCode || null) : null,
          countryName: entry.status === "success" ? (entry.country || null) : null,
          region: entry.status === "success" ? (entry.regionName || null) : null,
          city: entry.status === "success" ? (entry.city || null) : null,
          timestamp: Date.now(),
        };
        geoCache.set(ip, cacheEntry);
        results.set(ip, { ...cacheEntry, cached: false });
      }
    } catch (err: any) {
      console.warn("[GeoIP] Batch lookup error:", err.message);
    }
  }

  // Fill in any missing results
  for (const ip of uncachedIps) {
    if (!results.has(ip)) {
      results.set(ip, { countryCode: null, countryName: null, region: null, city: null, cached: false });
    }
  }

  return results;
}

/**
 * Get current cache statistics for monitoring.
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  requestsThisMinute: number;
  maxRequestsPerMinute: number;
} {
  return {
    size: geoCache.size,
    maxSize: DEFAULT_MAX_CACHE_SIZE,
    requestsThisMinute,
    maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
  };
}

/**
 * Clear the geo cache (for testing or maintenance).
 */
export function clearGeoCache(): void {
  geoCache.clear();
}
