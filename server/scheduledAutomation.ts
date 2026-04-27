/**
 * scheduledAutomation.ts — POST /api/scheduled/automation
 * 
 * Accepts workflow execution results from the Manus scheduled task agent.
 * The scheduled task agent runs automation_orchestrate workflows on a cron/interval
 * and POSTs results back here to update the automation_schedules table.
 * 
 * Auth: Uses the platform's scheduled-task-level cookie (user role).
 */
import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { automationSchedules } from "../drizzle/schema";
import { getDb } from "./db";

export interface ScheduledAutomationPayload {
  /** Which automation schedule to update */
  scheduleId?: number;
  /** Action: "execute" runs the workflow, "report" updates status */
  action: "execute" | "report" | "health_check";
  /** Workflow result data (for report action) */
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    duration_ms?: number;
    artifacts?: Array<{ type: string; url?: string; content?: string }>;
  };
}

export async function handleScheduledAutomation(req: Request, res: Response) {
  try {
    // Auth is handled by the platform's OAuth wrapper — req.user is injected
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body as ScheduledAutomationPayload;

    if (!payload.action) {
      return res.status(400).json({ error: "Missing required field: action" });
    }

    // Health check — used by the scheduled task agent to verify connectivity
    if (payload.action === "health_check") {
      return res.json({
        status: "ok",
        timestamp: Date.now(),
        userId: user.id,
      });
    }

    // Report — update an automation schedule with run results
    if (payload.action === "report" && payload.scheduleId) {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const now = Date.now();

      const [schedule] = await db
        .select()
        .from(automationSchedules)
        .where(
          and(
            eq(automationSchedules.id, payload.scheduleId),
            eq(automationSchedules.userId, user.id)
          )
        )
        .limit(1);

      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      await db
        .update(automationSchedules)
        .set({
          lastRunAt: now,
          runCount: schedule.runCount + 1,
          lastRunResult: payload.result as Record<string, unknown> ?? {},
          status: payload.result?.success ? "active" : "failed",
        })
        .where(eq(automationSchedules.id, payload.scheduleId));

      return res.json({
        success: true,
        scheduleId: payload.scheduleId,
        runCount: schedule.runCount + 1,
      });
    }

    // Execute — the scheduled task agent is requesting the workflow definition
    if (payload.action === "execute" && payload.scheduleId) {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });

      const [schedule] = await db
        .select()
        .from(automationSchedules)
        .where(
          and(
            eq(automationSchedules.id, payload.scheduleId),
            eq(automationSchedules.userId, user.id),
            eq(automationSchedules.status, "active")
          )
        )
        .limit(1);

      if (!schedule) {
        return res.status(404).json({ error: "Active schedule not found" });
      }

      return res.json({
        success: true,
        schedule: {
          id: schedule.id,
          name: schedule.name,
          mode: schedule.mode,
          triggerType: schedule.triggerType,
          workflowDefinition: schedule.workflowDefinition,
        },
      });
    }

    return res.status(400).json({ error: "Invalid action or missing scheduleId" });
  } catch (error: any) {
    console.error("[ScheduledAutomation] Error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
