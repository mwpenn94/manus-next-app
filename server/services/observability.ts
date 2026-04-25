/**
 * Observability Service — Structured Logging & Span Tracking (G-007)
 *
 * Provides lightweight OpenTelemetry-compatible span tracking for Sovereign
 * routing decisions without requiring a full OTel SDK dependency.
 *
 * Features:
 * - Structured JSON logging with consistent fields
 * - Span creation/completion with timing and metadata
 * - Routing decision audit trail
 * - Error classification and aggregation
 * - Exportable span data for future OTel collector integration
 */

// ── Types ──

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  service: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: "ok" | "error" | "timeout";
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface StructuredLog {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, string | number | boolean>;
}

// ── ID Generation ──

function generateId(length: number = 16): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ── Span Storage (in-memory ring buffer) ──

const MAX_SPANS = 1000;
const spans: Span[] = [];
const logs: StructuredLog[] = [];
const MAX_LOGS = 5000;

// ── Structured Logging ──

export function log(
  level: StructuredLog["level"],
  service: string,
  message: string,
  attributes?: Record<string, string | number | boolean>,
  traceId?: string,
  spanId?: string
): void {
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    traceId,
    spanId,
    attributes,
  };

  // Store in ring buffer
  if (logs.length >= MAX_LOGS) logs.shift();
  logs.push(entry);

  // Also emit to console with structured format
  const prefix = `[${entry.timestamp}] [${service}]`;
  const traceStr = traceId ? ` trace=${traceId}` : "";
  const attrStr = attributes ? ` ${JSON.stringify(attributes)}` : "";

  switch (level) {
    case "error":
      console.error(`${prefix} ERROR: ${message}${traceStr}${attrStr}`);
      break;
    case "warn":
      console.warn(`${prefix} WARN: ${message}${traceStr}${attrStr}`);
      break;
    case "debug":
      // Only log debug in development
      if (process.env.NODE_ENV === "development") {
        console.log(`${prefix} DEBUG: ${message}${traceStr}${attrStr}`);
      }
      break;
    default:
      console.log(`${prefix} INFO: ${message}${traceStr}${attrStr}`);
  }
}

// ── Span Management ──

export function startSpan(
  operationName: string,
  service: string,
  attributes: Record<string, string | number | boolean> = {},
  parentSpanId?: string
): Span {
  const span: Span = {
    traceId: generateId(32),
    spanId: generateId(16),
    parentSpanId,
    operationName,
    service,
    startTime: Date.now(),
    status: "ok",
    attributes,
    events: [],
  };
  return span;
}

export function addSpanEvent(
  span: Span,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  span.events.push({
    name,
    timestamp: Date.now(),
    attributes,
  });
}

export function endSpan(span: Span, status?: "ok" | "error" | "timeout"): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  if (status) span.status = status;

  // Store in ring buffer
  if (spans.length >= MAX_SPANS) spans.shift();
  spans.push(span);

  // Log the completed span
  log(
    span.status === "error" ? "warn" : "info",
    span.service,
    `${span.operationName} completed in ${span.durationMs}ms [${span.status}]`,
    {
      ...span.attributes,
      durationMs: span.durationMs,
      eventCount: span.events.length,
    },
    span.traceId,
    span.spanId
  );
}

// ── Sovereign-Specific Helpers ──

export function startRoutingSpan(
  taskType: string,
  userId: number,
  providerCount: number
): Span {
  return startSpan("sovereign.route_request", "Sovereign", {
    taskType,
    userId,
    providerCount,
  });
}

export function recordProviderAttempt(
  span: Span,
  providerName: string,
  success: boolean,
  latencyMs?: number,
  errorMessage?: string
): void {
  addSpanEvent(span, success ? "provider.success" : "provider.failure", {
    provider: providerName,
    success,
    ...(latencyMs !== undefined ? { latencyMs } : {}),
    ...(errorMessage ? { error: errorMessage.slice(0, 200) } : {}),
  });
}

export function recordCacheHit(span: Span, costSaved: number): void {
  addSpanEvent(span, "aegis.cache_hit", { costSaved });
}

export function recordCacheMiss(span: Span): void {
  addSpanEvent(span, "aegis.cache_miss");
}

// ── Query Functions ──

export function getRecentSpans(limit: number = 50): Span[] {
  return spans.slice(-limit);
}

export function getRecentLogs(
  level?: StructuredLog["level"],
  service?: string,
  limit: number = 100
): StructuredLog[] {
  let filtered = logs;
  if (level) filtered = filtered.filter((l) => l.level === level);
  if (service) filtered = filtered.filter((l) => l.service === service);
  return filtered.slice(-limit);
}

export function getSpansByTrace(traceId: string): Span[] {
  return spans.filter((s) => s.traceId === traceId);
}

export function getErrorSummary(): {
  totalErrors: number;
  byService: Record<string, number>;
  recentErrors: StructuredLog[];
} {
  const errorLogs = logs.filter((l) => l.level === "error");
  const byService: Record<string, number> = {};
  for (const err of errorLogs) {
    byService[err.service] = (byService[err.service] || 0) + 1;
  }
  return {
    totalErrors: errorLogs.length,
    byService,
    recentErrors: errorLogs.slice(-10),
  };
}

export function getRoutingMetrics(): {
  totalRoutes: number;
  successRate: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  providerDistribution: Record<string, number>;
} {
  const routingSpans = spans.filter((s) => s.operationName === "sovereign.route_request");
  if (routingSpans.length === 0) {
    return { totalRoutes: 0, successRate: 1, avgLatencyMs: 0, cacheHitRate: 0, providerDistribution: {} };
  }

  const successCount = routingSpans.filter((s) => s.status === "ok").length;
  const totalLatency = routingSpans.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  const cacheHits = routingSpans.filter((s) => s.events.some((e) => e.name === "aegis.cache_hit")).length;

  const providerDistribution: Record<string, number> = {};
  for (const span of routingSpans) {
    const successEvent = span.events.find((e) => e.name === "provider.success");
    if (successEvent?.attributes?.provider) {
      const provider = String(successEvent.attributes.provider);
      providerDistribution[provider] = (providerDistribution[provider] || 0) + 1;
    }
  }

  return {
    totalRoutes: routingSpans.length,
    successRate: successCount / routingSpans.length,
    avgLatencyMs: Math.round(totalLatency / routingSpans.length),
    cacheHitRate: cacheHits / routingSpans.length,
    providerDistribution,
  };
}
