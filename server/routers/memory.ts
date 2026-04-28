import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { addMemoryEntry, deleteMemoryEntry, getUserMemories, searchMemories, createMemoryEmbedding, getMemoryEmbeddings } from "../db";
import { generateEmbedding, cosineSimilarity, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "../services/embedding";
import { memoryEntries } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/** Generate and store embedding for a memory entry (fire-and-forget) */
async function generateEmbeddingForMemory(userId: number, key: string, value: string) {
  try {
    const text = `${key}: ${value}`;
    const embedding = await generateEmbedding(text);
    if (!embedding) return;
    // Find the memory entry ID
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    const [entry] = await db.select({ id: memoryEntries.id })
      .from(memoryEntries)
      .where(and(eq(memoryEntries.userId, userId), eq(memoryEntries.key, key)))
      .limit(1);
    if (!entry) return;
    await createMemoryEmbedding({
      memoryEntryId: entry.id,
      userId,
      embeddedText: text,
      embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  } catch (err) {
    console.warn("[Memory] Embedding generation failed:", err);
  }
}

export const memoryRouter = router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50);
      }),

    add: protectedProcedure
      .input(z.object({
        key: z.string().min(1).max(500),
        value: z.string().min(1).max(5000),
        source: z.enum(["auto", "user"]).optional(),
        taskExternalId: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addMemoryEntry({
          userId: ctx.user.id,
          key: input.key,
          value: input.value,
          source: input.source ?? "user",
          taskExternalId: input.taskExternalId ?? null,
        });
        // Fire-and-forget embedding generation (non-blocking)
        generateEmbeddingForMemory(ctx.user.id, input.key, input.value).catch(() => {});
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMemoryEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        // Try vector similarity search first, fall back to keyword search
        try {
          const queryEmbedding = await generateEmbedding(input.query);
          if (queryEmbedding) {
            const allEmbeddings = await getMemoryEmbeddings(ctx.user.id);
            if (allEmbeddings.length > 0) {
              // Compute similarity scores
              const scored = allEmbeddings.map((emb) => ({
                memoryEntryId: emb.memoryEntryId,
                similarity: cosineSimilarity(queryEmbedding, emb.embedding as number[]),
              }));
              scored.sort((a, b) => b.similarity - a.similarity);
              const topIds = scored.slice(0, input.limit ?? 10).filter(s => s.similarity > 0.3).map(s => s.memoryEntryId);
              if (topIds.length > 0) {
                // Fetch the actual memory entries
                const { getDb } = await import("../db");
                const db = await getDb();
                if (db) {
                  const { inArray } = await import("drizzle-orm");
                  const results = await db.select().from(memoryEntries)
                    .where(and(eq(memoryEntries.userId, ctx.user.id), inArray(memoryEntries.id, topIds)));
                  // Sort by similarity order
                  const idOrder = new Map(topIds.map((id, i) => [id, i]));
                  results.sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
                  return results;
                }
              }
            }
          }
        } catch (err) {
          // Fall through to keyword search on any error
          console.warn("[Memory] Vector search failed, falling back to keyword:", err);
        }
        return searchMemories(ctx.user.id, input.query, input.limit ?? 10);
      }),

    /** Unarchive a memory that was auto-archived by the decay sweep */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { unarchiveMemory } = await import("../db");
        await unarchiveMemory(input.id, ctx.user.id);
        return { success: true };
      }),

    /** List archived memories */
    listArchived: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50, true);
      }),

    /** Bulk add memory entries (for file import) */
    bulkAdd: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          key: z.string().min(1).max(500),
          value: z.string().min(1).max(5000),
          source: z.enum(["auto", "user"]).optional(),
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        let added = 0;
        for (const entry of input.entries) {
          await addMemoryEntry({
            userId: ctx.user.id,
            key: entry.key,
            value: entry.value,
            source: entry.source ?? "user",
            taskExternalId: null,
          });
          added++;
        }
        return { success: true, added };
      }),
  });
