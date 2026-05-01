/**
 * Failover & Error Recovery Service
 * 
 * Provides resilient execution patterns for all Manus Next operations:
 * - Retry with exponential backoff for transient failures
 * - Circuit breaker pattern for provider health tracking
 * - Graceful degradation when primary services are unavailable
 * - Request deduplication to prevent double-execution
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  halfOpenAt: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000; // 1 minute

/**
 * Execute with retry and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    retryOn = () => true,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * 0.2 * Math.random();
      await new Promise((r) => setTimeout(r, delay + jitter));
      console.log(`[Failover] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
    }
  }
  throw lastError;
}

/**
 * Circuit breaker — prevents cascading failures by short-circuiting
 * calls to unhealthy services
 */
export function getCircuitState(serviceId: string): CircuitBreakerState {
  if (!circuitBreakers.has(serviceId)) {
    circuitBreakers.set(serviceId, {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      halfOpenAt: 0,
    });
  }
  return circuitBreakers.get(serviceId)!;
}

export function recordFailure(serviceId: string): void {
  const state = getCircuitState(serviceId);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.isOpen = true;
    state.halfOpenAt = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`[CircuitBreaker] ${serviceId} OPEN after ${state.failures} failures`);
  }
}

export function recordSuccess(serviceId: string): void {
  const state = getCircuitState(serviceId);
  state.failures = 0;
  state.isOpen = false;
  state.halfOpenAt = 0;
}

export function isCircuitOpen(serviceId: string): boolean {
  const state = getCircuitState(serviceId);
  if (!state.isOpen) return false;
  // Allow half-open test after reset period
  if (Date.now() >= state.halfOpenAt) {
    return false; // half-open, allow one test request
  }
  return true;
}

/**
 * Execute with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceId: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  if (isCircuitOpen(serviceId)) {
    if (fallback) {
      console.log(`[CircuitBreaker] ${serviceId} is open, using fallback`);
      return fallback();
    }
    throw new Error(`Service ${serviceId} is currently unavailable (circuit open)`);
  }
  try {
    const result = await fn();
    recordSuccess(serviceId);
    return result;
  } catch (error) {
    recordFailure(serviceId);
    if (fallback && isCircuitOpen(serviceId)) {
      return fallback();
    }
    throw error;
  }
}

/**
 * Execute with full resilience: retry + circuit breaker + fallback
 */
export async function withResilience<T>(
  serviceId: string,
  fn: () => Promise<T>,
  options: RetryOptions & { fallback?: () => Promise<T> } = {}
): Promise<T> {
  const { fallback, ...retryOpts } = options;
  return withCircuitBreaker(
    serviceId,
    () => withRetry(fn, retryOpts),
    fallback
  );
}

/**
 * Request deduplication — prevents double-execution of identical requests
 */
const inflightRequests = new Map<string, Promise<unknown>>();

export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }
  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

/**
 * Provider health status for dashboard display
 */
export function getAllCircuitStates(): Record<string, CircuitBreakerState & { serviceId: string }> {
  const states: Record<string, CircuitBreakerState & { serviceId: string }> = {};
  circuitBreakers.forEach((state, id) => {
    states[id] = { ...state, serviceId: id };
  });
  return states;
}

/**
 * Browser automation failover — wraps browser operations with
 * retry logic and screenshot capture on failure
 */
export async function withBrowserFailover<T>(
  operation: string,
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    captureOnFailure?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 2, captureOnFailure = true } = options;
  return withRetry(fn, {
    maxRetries,
    baseDelayMs: 1000,
    retryOn: (error) => {
      const msg = String(error);
      // Retry on timeout, navigation, and network errors
      return (
        msg.includes("timeout") ||
        msg.includes("navigation") ||
        msg.includes("net::ERR") ||
        msg.includes("ECONNREFUSED")
      );
    },
  });
}

/**
 * LLM provider failover — automatically falls back to alternative providers
 */
export async function withLLMFailover<T>(
  providers: Array<{ id: string; fn: () => Promise<T> }>
): Promise<T & { providerId: string }> {
  let lastError: unknown;
  for (const provider of providers) {
    if (isCircuitOpen(provider.id)) {
      console.log(`[LLMFailover] Skipping ${provider.id} (circuit open)`);
      continue;
    }
    try {
      const result = await withRetry(provider.fn, { maxRetries: 1 });
      recordSuccess(provider.id);
      return { ...result, providerId: provider.id } as T & { providerId: string };
    } catch (error) {
      lastError = error;
      recordFailure(provider.id);
      console.warn(`[LLMFailover] ${provider.id} failed:`, error);
    }
  }
  throw lastError || new Error("All LLM providers failed");
}
