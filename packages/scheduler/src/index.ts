/**
 * @mwpenn94/manus-next-scheduler
 * Scheduled task execution for Manus Next
 *
 * This package is a workspace stub that re-exports types and
 * utilities from the monolith. When published to npm, these
 * will be standalone imports.
 */

// Scheduler types
export interface ScheduledTask {
  id: string;
  taskId: string;
  cronExpression?: string;
  intervalMs?: number;
  nextRunAt: Date;
  enabled: boolean;
}

export interface ScheduleOptions {
  taskId: string;
  cron?: string;
  interval?: number;
  prompt: string;
  repeat?: boolean;
}

export const PACKAGE_NAME = "@mwpenn94/manus-next-scheduler";
export const PACKAGE_VERSION = "0.1.0";
