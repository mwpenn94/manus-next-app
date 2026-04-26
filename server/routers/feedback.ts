import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { appFeedback } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const feedbackRouter = router({
  /** Submit feedback (any authenticated user) */
  submit: protectedProcedure
    .input(
      z.object({
        category: z.enum(["general", "feature_request", "bug_report", "praise"]).default("general"),
        title: z.string().min(1).max(500),
        content: z.string().max(5000).optional(),
        pageContext: z.string().max(500).optional(),
        userAgent: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(appFeedback).values({
        userId: ctx.user.id,
        category: input.category,
        title: input.title,
        content: input.content ?? null,
        pageContext: input.pageContext ?? null,
        userAgent: input.userAgent ?? null,
      });
      return { success: true, id: result.insertId };
    }),

  /** List user's own feedback */
  myFeedback: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(appFeedback)
      .where(eq(appFeedback.userId, ctx.user.id))
      .orderBy(desc(appFeedback.createdAt))
      .limit(50);
  }),

  /** Admin: list all feedback */
  listAll: adminProcedure
    .input(
      z.object({
        status: z.enum(["new", "acknowledged", "in_progress", "resolved", "wont_fix"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input?.status) {
        conditions.push(eq(appFeedback.status, input.status));
      }
      return db
        .select()
        .from(appFeedback)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(appFeedback.createdAt))
        .limit(input?.limit ?? 50);
    }),

  /** Admin: update feedback status and respond */
  respond: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["new", "acknowledged", "in_progress", "resolved", "wont_fix"]),
        adminResponse: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(appFeedback)
        .set({
          status: input.status,
          adminResponse: input.adminResponse ?? null,
        })
        .where(eq(appFeedback.id, input.id));
      return { success: true };
    }),
});
