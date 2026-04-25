/**
 * Scheduled Health Check Endpoint — /api/scheduled/health (G-009)
 *
 * Accepts POST from scheduled tasks to record periodic health check results.
 * Auth is handled via the platform's auto-injected session cookie.
 * Must allow user.role == "user" (scheduled tasks get "user" role).
 *
 * The scheduled task agent should:
 * 1. GET /api/health to retrieve the current health report
 * 2. POST /api/scheduled/health with the results for audit logging
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getRoutingMetrics, getErrorSummary, log } from "./services/observability";

interface HealthCheckPayload {
  source: string; // "scheduled-task" | "manual"
  healthReport: {
    overall: string;
    services?: Record<string, string>;
    features?: Record<string, string>;
  };
  observability?: {
    routingMetrics: ReturnType<typeof getRoutingMetrics>;
    errorSummary: ReturnType<typeof getErrorSummary>;
  };
  timestamp: string;
  notes?: string;
}

// In-memory audit log (last 100 checks)
const healthCheckLog: Array<{
  timestamp: string;
  source: string;
  overall: string;
  routingSuccessRate: number;
  errorCount: number;
}> = [];

export async function handleHealthCheck(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || !["user", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const payload = req.body as HealthCheckPayload;

    if (!payload.source || !payload.healthReport || !payload.timestamp) {
      return res.status(400).json({
        error: "Missing required fields: source, healthReport, timestamp",
      });
    }

    // Enrich with server-side observability data
    const routingMetrics = getRoutingMetrics();
    const errorSummary = getErrorSummary();

    // Store in audit log
    const entry = {
      timestamp: payload.timestamp,
      source: payload.source,
      overall: payload.healthReport.overall,
      routingSuccessRate: routingMetrics.successRate,
      errorCount: errorSummary.totalErrors,
    };
    if (healthCheckLog.length >= 100) healthCheckLog.shift();
    healthCheckLog.push(entry);

    // Log the health check
    log("info", "HealthCheck", `Scheduled health check received: ${payload.healthReport.overall}`, {
      source: payload.source,
      overall: payload.healthReport.overall,
      routingSuccessRate: routingMetrics.successRate,
      totalErrors: errorSummary.totalErrors,
    });

    return res.json({
      received: true,
      serverObservability: {
        routingMetrics,
        errorSummary: {
          totalErrors: errorSummary.totalErrors,
          byService: errorSummary.byService,
        },
      },
      auditLogSize: healthCheckLog.length,
    });
  } catch (err: any) {
    console.error("[ScheduledHealthCheck] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get the health check audit log (for admin dashboard).
 */
export function getHealthCheckLog() {
  return healthCheckLog;
}
