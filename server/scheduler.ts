/**
 * Server-Side Task Scheduler
 *
 * Polls the scheduled_tasks table every 60 seconds for due tasks.
 * When a task is due:
 * 1. Creates a new task record in the tasks table
 * 2. Adds the scheduled prompt as the first user message
 * 3. Triggers the agent stream (fire-and-forget) to execute the task
 * 4. Updates lastRunAt, nextRunAt, runCount, and lastStatus
 * 5. Creates a notification for the user
 *
 * Cron expressions are parsed using cron-parser (6-field format).
 * Interval schedules simply add intervalSeconds to the current time.
 *
 * @module scheduler
 */
import { nanoid } from "nanoid";

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Calculate the next run time for a scheduled task.
 * Returns null if the task should not run again (non-repeating after execution).
 */
function calculateNextRunAt(
  scheduleType: "cron" | "interval",
  cronExpression: string | null,
  intervalSeconds: number | null,
  repeat: number
): Date | null {
  if (!repeat) return null;

  if (scheduleType === "interval" && intervalSeconds) {
    return new Date(Date.now() + intervalSeconds * 1000);
  }

  if (scheduleType === "cron" && cronExpression) {
    try {
      // cron-parser v5 uses ESM — dynamic import
      // Use a simple next-interval approach for cron: parse and get next occurrence
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length === 6) {
        // 6-field cron: sec min hr dom mon dow
        // Convert to 5-field for basic parsing (drop seconds)
        const fiveField = parts.slice(1).join(" ");
        return getNextCronTime(fiveField);
      } else if (parts.length === 5) {
        return getNextCronTime(cronExpression);
      }
    } catch (err) {
      console.error("[Scheduler] Failed to parse cron expression:", cronExpression, err);
    }
    // Fallback: 1 hour from now
    return new Date(Date.now() + 3600_000);
  }

  return null;
}

/**
 * Simple cron next-time calculator for 5-field expressions.
 * Uses cron-parser library.
 */
function getNextCronTime(expression: string): Date {
  try {
    // cron-parser v5 is ESM, but we can use require for v4 compat
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cronParser = require("cron-parser");
    const interval = cronParser.parseExpression(expression);
    return interval.next().toDate();
  } catch {
    // Fallback: 1 hour from now
    return new Date(Date.now() + 3600_000);
  }
}

/**
 * Execute a single scheduled task:
 * 1. Mark as running
 * 2. Create a new task in the DB
 * 3. Add the prompt as a user message
 * 4. Trigger the agent stream
 * 5. Update status and schedule next run
 */
async function executeScheduledTask(schedule: {
  id: number;
  userId: number;
  name: string;
  prompt: string;
  scheduleType: "cron" | "interval";
  cronExpression: string | null;
  intervalSeconds: number | null;
  repeat: number;
}): Promise<void> {
  const {
    createTask,
    addTaskMessage,
    updateTaskStatus,
    markScheduledTaskRun,
    createNotification,
  } = await import("./db");

  const taskExternalId = nanoid(12);
  const taskTitle = `[Scheduled] ${schedule.name}`;

  try {
    // Mark schedule as running
    await markScheduledTaskRun(schedule.id, "running", null);

    // Create the task
    const task = await createTask({
      externalId: taskExternalId,
      userId: schedule.userId,
      title: taskTitle,
    });

    if (!task) {
      throw new Error("Failed to create task for scheduled execution");
    }

    // Add the prompt as the first user message
    await addTaskMessage({
      taskId: task.id,
      externalId: nanoid(12),
      role: "user",
      content: schedule.prompt,
      actions: null,
    });

    // Execute the agent stream (fire-and-forget)
    const { runAgentStream } = await import("./agentStream");

    // Collect the full response for notification
    let fullContent = "";

    await runAgentStream({
      messages: [{ role: "user", content: schedule.prompt }],
      taskExternalId,
      safeWrite: (data: string) => {
        // Parse SSE data to capture content
        try {
          const match = data.match(/^data: (.+)$/m);
          if (match) {
            const parsed = JSON.parse(match[1]);
            if (parsed.delta) fullContent += parsed.delta;
          }
        } catch { /* ignore parse errors */ }
        return true; // Always "write" successfully (no actual HTTP response)
      },
      safeEnd: () => { /* no-op */ },
      mode: "quality",
    });

    // Save assistant response
    if (fullContent) {
      await addTaskMessage({
        taskId: task.id,
        externalId: nanoid(12),
        role: "assistant",
        content: fullContent,
        actions: null,
      });
    }

    // Mark task as completed
    await updateTaskStatus(taskExternalId, "completed");

    // Calculate next run
    const nextRunAt = calculateNextRunAt(
      schedule.scheduleType,
      schedule.cronExpression,
      schedule.intervalSeconds,
      schedule.repeat
    );

    // Update schedule
    await markScheduledTaskRun(schedule.id, "success", nextRunAt);

    // Notify user
    await createNotification({
      userId: schedule.userId,
      type: "task_completed",
      title: `Scheduled task completed: ${schedule.name}`,
      content: fullContent
        ? `Result preview: ${fullContent.slice(0, 200)}${fullContent.length > 200 ? "..." : ""}`
        : "Task executed successfully.",
      taskExternalId,
    });

    console.log(`[Scheduler] Task "${schedule.name}" completed successfully. Next run: ${nextRunAt?.toISOString() ?? "none"}`);
  } catch (err: any) {
    console.error(`[Scheduler] Task "${schedule.name}" failed:`, err.message);

    // Mark as error
    const nextRunAt = calculateNextRunAt(
      schedule.scheduleType,
      schedule.cronExpression,
      schedule.intervalSeconds,
      schedule.repeat
    );
    await markScheduledTaskRun(schedule.id, "error", nextRunAt);

    // Notify user of failure
    try {
      await createNotification({
        userId: schedule.userId,
        type: "task_error",
        title: `Scheduled task failed: ${schedule.name}`,
        content: `Error: ${err.message || "Unknown error"}`,
        taskExternalId,
      });
    } catch { /* ignore notification failure */ }
  }
}

/**
 * Poll for due scheduled tasks and execute them.
 * Runs sequentially to avoid overwhelming the system.
 */
async function pollDueTasks(): Promise<void> {
  if (isRunning) {
    console.log("[Scheduler] Previous poll still running, skipping");
    return;
  }

  isRunning = true;
  try {
    const { getDueScheduledTasks } = await import("./db");
    const dueTasks = await getDueScheduledTasks();

    if (dueTasks.length === 0) return;

    console.log(`[Scheduler] Found ${dueTasks.length} due task(s)`);

    // Execute tasks sequentially to avoid resource contention
    for (const schedule of dueTasks) {
      try {
        await executeScheduledTask(schedule as any);
      } catch (err: any) {
        console.error(`[Scheduler] Unhandled error executing schedule ${schedule.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[Scheduler] Poll error:", err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduler polling loop.
 * Call this once during server startup.
 */
export function startScheduler(): void {
  if (schedulerTimer) {
    console.log("[Scheduler] Already running");
    return;
  }

  console.log(`[Scheduler] Starting — polling every ${POLL_INTERVAL_MS / 1000}s`);

  // Run immediately on startup, then at intervals
  setTimeout(() => {
    pollDueTasks().catch(console.error);
  }, 5000); // 5s delay after server start

  schedulerTimer = setInterval(() => {
    pollDueTasks().catch(console.error);
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the scheduler polling loop.
 */
export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[Scheduler] Stopped");
  }
}
