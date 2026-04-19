# Cap #4: Memory System (Cross-Task Learning)
**Status:** GREEN
**Implementation:** `server/agentTools.ts` knowledge_query tool + `drizzle/schema.ts` memories table + auto-extraction on task completion.
**Manus Alignment:** Implements "File System as Context" principle — memories are externalized knowledge that gets injected into future tasks as relevant context.
**Quality Note:** Extraction is fire-and-forget on task completion. Memory injection uses recency + relevance scoring.
