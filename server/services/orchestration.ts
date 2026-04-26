/**
 * Orchestration Service — Task Queue, Concurrency Control, and Timeout Management
 *
 * Provides:
 * - Priority-based task queue ordering (high=1, normal=2, low=3)
 * - Concurrent task limit enforcement (configurable per user, default 3)
 * - Per-task timeout with automatic error marking
 * - Retry logic with exponential backoff (delegates to agentStream's existing retry)
 * - Queue position reporting for UI feedback
 */

import { getDb } from "../db";
import { tasks } from "../../drizzle/schema";
import { eq, and, sql, asc, desc, inArray } from "drizzle-orm";

// ── Configuration ──
const DEFAULT_MAX_CONCURRENT = 3;
const DEFAULT_TIMEOUT_SECONDS = 300; // 5 minutes
const DEFAULT_MAX_RETRIES = 3;
const TIMEOUT_CHECK_INTERVAL_MS = 30_000; // Check every 30s

export interface OrchestrationConfig {
  maxConcurrent?: number;
  defaultTimeoutSeconds?: number;
  defaultMaxRetries?: number;
}

export interface QueuePosition {
  taskId: number;
  position: number;
  estimatedWaitSeconds: number;
  priority: number;
}

export interface TaskOrchestrationStatus {
  runningCount: number;
  queuedCount: number;
  maxConcurrent: number;
  canStartNew: boolean;
}

// ── Core Functions ──

/**
 * Check if a user can start a new task (hasn't hit concurrent limit)
 */
export async function canStartTask(
  userId: number,
  config: OrchestrationConfig = {}
): Promise<{ allowed: boolean; runningCount: number; maxConcurrent: number }> {
  const db = await getDb();
  if (!db) return { allowed: false, runningCount: 0, maxConcurrent: 0 };

  const maxConcurrent = config.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "running")));

  const runningCount = result[0]?.count ?? 0;

  return {
    allowed: runningCount < maxConcurrent,
    runningCount,
    maxConcurrent,
  };
}

/**
 * Get the user's task queue ordered by priority then creation time
 */
export async function getTaskQueue(userId: number): Promise<QueuePosition[]> {
  const db = await getDb();
  if (!db) return [];

  const queuedTasks = await db
    .select({
      id: tasks.id,
      priority: tasks.priority,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, "idle")))
    .orderBy(asc(tasks.priority), asc(tasks.createdAt));

  const AVG_TASK_DURATION_SECONDS = 120; // Rough estimate for wait time

  return queuedTasks.map((task, index) => ({
    taskId: task.id,
    position: index + 1,
    estimatedWaitSeconds: index * AVG_TASK_DURATION_SECONDS,
    priority: task.priority,
  }));
}

/**
 * Get orchestration status for a user
 */
export async function getOrchestrationStatus(
  userId: number,
  config: OrchestrationConfig = {}
): Promise<TaskOrchestrationStatus> {
  const db = await getDb();
  if (!db)
    return { runningCount: 0, queuedCount: 0, maxConcurrent: 0, canStartNew: false };

  const maxConcurrent = config.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;

  const [runningResult, queuedResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, "running"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, "idle"))),
  ]);

  const runningCount = runningResult[0]?.count ?? 0;
  const queuedCount = queuedResult[0]?.count ?? 0;

  return {
    runningCount,
    queuedCount,
    maxConcurrent,
    canStartNew: runningCount < maxConcurrent,
  };
}

/**
 * Update task priority
 */
export async function setTaskPriority(
  taskId: number,
  userId: number,
  priority: 1 | 2 | 3
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(tasks)
    .set({ priority })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return true;
}

/**
 * Set per-task timeout
 */
export async function setTaskTimeout(
  taskId: number,
  userId: number,
  timeoutSeconds: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(tasks)
    .set({ timeoutSeconds })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  return true;
}

/**
 * Check for timed-out tasks and mark them as error
 * Should be called periodically (e.g., every 30s)
 */
export async function checkTimeouts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  // Find running tasks that have exceeded their timeout
  const runningTasks = await db
    .select({
      id: tasks.id,
      timeoutSeconds: tasks.timeoutSeconds,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.status, "running"));

  let timedOutCount = 0;

  for (const task of runningTasks) {
    const timeout = task.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const elapsed = (now.getTime() - task.updatedAt.getTime()) / 1000;

    if (elapsed > timeout) {
      await db
        .update(tasks)
        .set({
          status: "error",
          currentStep: `Timed out after ${Math.round(elapsed)}s (limit: ${timeout}s)`,
        })
        .where(eq(tasks.id, task.id));
      timedOutCount++;
      console.log(
        `[Orchestration] Task ${task.id} timed out after ${Math.round(elapsed)}s`
      );
    }
  }

  return timedOutCount;
}

/**
 * Increment retry count for a task and check if retries are exhausted
 */
export async function incrementRetry(
  taskId: number
): Promise<{ canRetry: boolean; retryCount: number; maxRetries: number }> {
  const db = await getDb();
  if (!db) return { canRetry: false, retryCount: 0, maxRetries: 0 };

  const [task] = await db
    .select({
      retryCount: tasks.retryCount,
      maxRetries: tasks.maxRetries,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task) return { canRetry: false, retryCount: 0, maxRetries: 0 };

  const maxRetries = task.maxRetries ?? DEFAULT_MAX_RETRIES;
  const newRetryCount = task.retryCount + 1;

  await db
    .update(tasks)
    .set({ retryCount: newRetryCount })
    .where(eq(tasks.id, taskId));

  return {
    canRetry: newRetryCount < maxRetries,
    retryCount: newRetryCount,
    maxRetries,
  };
}

// ── Automatic Error Recovery ──

const AUTO_RETRY_CHECK_INTERVAL_MS = 60_000; // Check every 60s
const RETRY_BACKOFF_BASE_MS = 5_000; // 5s base
const RETRY_BACKOFF_MAX_MS = 300_000; // 5 min max

/**
 * Calculate exponential backoff delay for a given retry count.
 * Uses 2^retryCount * base with jitter, capped at max.
 */
export function calculateBackoffMs(retryCount: number): number {
  const exponentialMs = Math.min(
    RETRY_BACKOFF_BASE_MS * Math.pow(2, retryCount),
    RETRY_BACKOFF_MAX_MS
  );
  // Add 10% jitter to prevent thundering herd
  const jitter = exponentialMs * 0.1 * Math.random();
  return Math.round(exponentialMs + jitter);
}

/**
 * Find error tasks eligible for automatic retry and re-queue them.
 * A task is eligible if:
 * - status is 'error'
 * - retryCount < maxRetries
 * - updatedAt is old enough for the backoff delay to have elapsed
 */
export async function autoRetryFailedTasks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  // Find error tasks that haven't exhausted retries
  const errorTasks = await db
    .select({
      id: tasks.id,
      externalId: tasks.externalId,
      retryCount: tasks.retryCount,
      maxRetries: tasks.maxRetries,
      updatedAt: tasks.updatedAt,
      userId: tasks.userId,
    })
    .from(tasks)
    .where(eq(tasks.status, "error"));

  let retriedCount = 0;

  for (const task of errorTasks) {
    const maxRetries = task.maxRetries ?? DEFAULT_MAX_RETRIES;
    if (task.retryCount >= maxRetries) continue;

    // Check if enough time has passed for backoff
    const backoffMs = calculateBackoffMs(task.retryCount);
    const elapsed = now.getTime() - task.updatedAt.getTime();
    if (elapsed < backoffMs) continue;

    // Check concurrency limit before retrying
    const { allowed } = await canStartTask(task.userId);
    if (!allowed) continue;

    // Re-queue the task: set status back to 'idle', increment retryCount
    await db
      .update(tasks)
      .set({
        status: "idle",
        retryCount: task.retryCount + 1,
        currentStep: `Auto-retry #${task.retryCount + 1} (backoff: ${Math.round(backoffMs / 1000)}s)`,
      })
      .where(eq(tasks.id, task.id));

    retriedCount++;
    console.log(
      `[Orchestration] Auto-retrying task ${task.id} (attempt ${task.retryCount + 1}/${maxRetries}, backoff: ${Math.round(backoffMs / 1000)}s)`
    );
  }

  return retriedCount;
}

// ── Background Checkers ──
let timeoutInterval: ReturnType<typeof setInterval> | null = null;
let autoRetryInterval: ReturnType<typeof setInterval> | null = null;

export function startTimeoutChecker(): void {
  if (timeoutInterval) return;
  timeoutInterval = setInterval(async () => {
    try {
      const timedOut = await checkTimeouts();
      if (timedOut > 0) {
        console.log(`[Orchestration] ${timedOut} task(s) timed out`);
      }
    } catch (err) {
      console.error("[Orchestration] Timeout check error:", err);
    }
  }, TIMEOUT_CHECK_INTERVAL_MS);
  console.log("[Orchestration] Timeout checker started (30s interval)");

  // Start auto-retry checker alongside timeout checker
  if (!autoRetryInterval) {
    autoRetryInterval = setInterval(async () => {
      try {
        const retried = await autoRetryFailedTasks();
        if (retried > 0) {
          console.log(`[Orchestration] Auto-retried ${retried} failed task(s)`);
        }
      } catch (err) {
        console.error("[Orchestration] Auto-retry check error:", err);
      }
    }, AUTO_RETRY_CHECK_INTERVAL_MS);
    console.log("[Orchestration] Auto-retry checker started (60s interval)");
  }
}

export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
  }
  if (autoRetryInterval) {
    clearInterval(autoRetryInterval);
    autoRetryInterval = null;
  }
}
