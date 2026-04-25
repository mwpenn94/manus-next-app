import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { 
  createTaskShare,
  deleteTaskShare,
  getTaskByExternalId,
  getTaskMessages,
  getTaskShareByToken,
  getTaskShares,
  incrementShareViewCount,
 } from "../db";

export const shareRouter = router({
    create: protectedProcedure
      .input(z.object({
        taskExternalId: z.string().max(50),
        password: z.string().max(200).optional(),
        expiresInHours: z.number().min(1).max(720).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const shareToken = nanoid(24);
        let passwordHash: string | null = null;

        if (input.password) {
          // Simple hash using built-in crypto (not bcrypt to avoid dep)
          const crypto = await import("crypto");
          passwordHash = crypto.createHash("sha256").update(input.password).digest("hex");
        }

        const expiresAt = input.expiresInHours
          ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
          : null;

        const share = await createTaskShare({
          taskExternalId: input.taskExternalId,
          userId: ctx.user.id,
          shareToken,
          passwordHash,
          expiresAt,
        });

        return {
          shareToken,
          shareUrl: `/share/${shareToken}`,
          expiresAt,
          hasPassword: !!passwordHash,
        };
      }),

    list: protectedProcedure
      .input(z.object({ taskExternalId: z.string().max(50) }))
      .query(async ({ ctx, input }) => {
        return getTaskShares(input.taskExternalId, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTaskShare(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Public: view a shared task (no auth required) */
    view: publicProcedure
      .input(z.object({
        shareToken: z.string().min(1).max(50),
        password: z.string().max(200).optional(),
      }))
      .query(async ({ input }) => {
        try {
          const share = await getTaskShareByToken(input.shareToken);
          if (!share) return { error: "Share not found", code: "NOT_FOUND" };

          // Check expiration with tolerance for clock skew (30s)
          if (share.expiresAt) {
            const expiryTime = new Date(share.expiresAt).getTime();
            const now = Date.now() - 30_000; // 30s tolerance
            if (expiryTime < now) {
              return { error: "This share link has expired", code: "EXPIRED" };
            }
          }

          // Check password
          if (share.passwordHash) {
            if (!input.password) {
              return { error: "password_required", code: "PASSWORD_REQUIRED" };
            }
            const crypto = await import("crypto");
            const hash = crypto.createHash("sha256").update(input.password).digest("hex");
            if (hash !== share.passwordHash) {
              return { error: "Incorrect password", code: "WRONG_PASSWORD" };
            }
          }

          // Increment view count (non-blocking — don't fail the view if count update fails)
          incrementShareViewCount(input.shareToken).catch(err => {
            console.error("[Share] Failed to increment view count:", err);
          });

          // Get task and messages
          const task = await getTaskByExternalId(share.taskExternalId);
          if (!task) return { error: "Task not found", code: "TASK_DELETED" };

          const messages = await getTaskMessages(task.id);

          return {
            task: { title: task.title, status: task.status, createdAt: task.createdAt },
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
              // Include actions and card data for rich rendering in shared view
              actions: m.actions ?? undefined,
              cardType: m.cardType ?? undefined,
              cardData: m.cardData ?? undefined,
            })),
            viewCount: (share as any).viewCount ?? 0,
            expiresAt: share.expiresAt ?? null,
          };
        } catch (err) {
          console.error("[Share] Error viewing shared task:", err);
          return { error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
        }
      }),
  });
