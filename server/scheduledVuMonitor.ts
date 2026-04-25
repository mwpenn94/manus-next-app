/**
 * Scheduled Task API Endpoint — /api/scheduled/vu-monitor
 *
 * Accepts POST from Class F VU scheduled tasks with health check results.
 * Auth is handled via the platform's auto-injected session cookie.
 * Must allow user.role == "user" (scheduled tasks get "user" role).
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

interface VuCheckPayload {
  vu_id: string;
  check_type: "health" | "drift" | "regression" | "convergence";
  status: "pass" | "warn" | "fail";
  score: number;
  findings: string[];
  gaps: string[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function handleVuMonitor(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || !["user", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const payload = req.body as VuCheckPayload;

    if (!payload.vu_id || !payload.check_type || !payload.status || typeof payload.score !== "number") {
      return res.status(400).json({
        error: "Missing required fields: vu_id, check_type, status, score",
      });
    }

    if (payload.score < 0 || payload.score > 10) {
      return res.status(400).json({ error: "Score must be between 0 and 10" });
    }

    console.log(`[VU Monitor] ${payload.vu_id} | ${payload.check_type} | ${payload.status} | score=${payload.score}`);
    if (payload.findings?.length > 0) {
      console.log(`[VU Monitor] Findings: ${payload.findings.join("; ")}`);
    }
    if (payload.gaps?.length > 0) {
      console.log(`[VU Monitor] Gaps: ${payload.gaps.join("; ")}`);
    }

    return res.json({
      received: true,
      vu_id: payload.vu_id,
      check_type: payload.check_type,
      status: payload.status,
      score: payload.score,
      processed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[VU Monitor] Error:", err.message);
    if (err.message?.includes("session") || err.message?.includes("cookie")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
