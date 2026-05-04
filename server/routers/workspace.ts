import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  addWorkspaceArtifact,
  getLatestArtifactByType,
  getWorkspaceArtifacts,
  verifyTaskOwnershipById,
 } from "../db";

const ARTIFACT_TYPES = ["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document", "document_pdf", "document_docx", "document_xlsx", "document_csv", "slides", "webapp_preview", "webapp_deployed"] as const;

// --- Retry Queue for Artifact Persistence ---
// Handles transient DB failures with exponential backoff (3 attempts: 1s, 2s, 4s)

interface QueuedArtifact {
  taskId: number;
  artifactType: string;
  label: string | null;
  content: string | null;
  url: string | null;
  attempts: number;
  nextRetryAt: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay
const retryQueue: QueuedArtifact[] = [];
let retryTimerActive = false;

function getBackoffDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

async function processRetryQueue(): Promise<void> {
  if (retryQueue.length === 0) {
    retryTimerActive = false;
    return;
  }

  const now = Date.now();
  const readyItems: QueuedArtifact[] = [];
  const pendingItems: QueuedArtifact[] = [];

  for (const item of retryQueue) {
    if (item.nextRetryAt <= now) {
      readyItems.push(item);
    } else {
      pendingItems.push(item);
    }
  }

  // Clear and repopulate the queue with only pending items
  retryQueue.length = 0;
  retryQueue.push(...pendingItems);

  // Process ready items
  for (const item of readyItems) {
    try {
      await addWorkspaceArtifact({
        taskId: item.taskId,
        artifactType: item.artifactType as any,
        label: item.label,
        content: item.content,
        url: item.url,
      });
      console.log(`[ArtifactRetry] Success on attempt ${item.attempts + 1}: ${item.artifactType} for task ${item.taskId}`);
    } catch (err: any) {
      item.attempts += 1;
      if (item.attempts < MAX_RETRY_ATTEMPTS) {
        item.nextRetryAt = Date.now() + getBackoffDelay(item.attempts);
        retryQueue.push(item);
        console.warn(`[ArtifactRetry] Attempt ${item.attempts}/${MAX_RETRY_ATTEMPTS} failed for ${item.artifactType} task ${item.taskId}, retrying in ${getBackoffDelay(item.attempts)}ms: ${err.message}`);
      } else {
        console.error(`[ArtifactRetry] All ${MAX_RETRY_ATTEMPTS} attempts exhausted for ${item.artifactType} task ${item.taskId}: ${err.message}`);
      }
    }
  }

  // Schedule next processing if items remain
  if (retryQueue.length > 0) {
    const nextDelay = Math.min(...retryQueue.map(i => i.nextRetryAt - Date.now()), 5000);
    setTimeout(processRetryQueue, Math.max(nextDelay, 100));
  } else {
    retryTimerActive = false;
  }
}

function enqueueForRetry(artifact: Omit<QueuedArtifact, "attempts" | "nextRetryAt">): void {
  retryQueue.push({
    ...artifact,
    attempts: 1, // Already failed once (the initial attempt)
    nextRetryAt: Date.now() + getBackoffDelay(1),
  });

  if (!retryTimerActive) {
    retryTimerActive = true;
    setTimeout(processRetryQueue, BASE_DELAY_MS);
  }
}

// Export for testing
export { retryQueue, MAX_RETRY_ATTEMPTS, getBackoffDelay, enqueueForRetry, processRetryQueue };

export const workspaceRouter = router({
    addArtifact: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        artifactType: z.enum(ARTIFACT_TYPES),
        label: z.string().optional(),
        content: z.string().optional(),
        url: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        
        const artifactData = {
          taskId: input.taskId,
          artifactType: input.artifactType,
          label: input.label ?? null,
          content: input.content ?? null,
          url: input.url ?? null,
        };

        try {
          await addWorkspaceArtifact(artifactData);
          return { success: true, queued: false };
        } catch (err: any) {
          // On transient DB failure, enqueue for retry instead of failing the mutation
          console.warn(`[Artifact] Initial insert failed for ${input.artifactType} task ${input.taskId}, enqueueing for retry: ${err.message}`);
          enqueueForRetry(artifactData);
          // Return success to client — the artifact will be persisted asynchronously
          return { success: true, queued: true };
        }
      }),

    list: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getWorkspaceArtifacts(input.taskId, input.type);
      }),

    latest: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.enum(ARTIFACT_TYPES),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getLatestArtifactByType(input.taskId, input.type) ?? null;
      }),

    // Diagnostic endpoint: check retry queue status (admin only)
    retryQueueStatus: protectedProcedure
      .query(async ({ ctx }) => {
        return {
          queueLength: retryQueue.length,
          items: retryQueue.map(i => ({
            taskId: i.taskId,
            artifactType: i.artifactType,
            attempts: i.attempts,
            nextRetryAt: new Date(i.nextRetryAt).toISOString(),
          })),
        };
      }),
  });
