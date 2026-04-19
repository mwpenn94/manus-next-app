# Cap #1: Agent Core (Streaming LLM Loop)
**Status:** GREEN
**Implementation:** `server/agentStream.ts` — SSE-based streaming agent loop with tool dispatch, multi-turn conversation, and mode-aware turn limits.
**Manus Alignment:** Follows the append-only context pattern from Manus's KV-cache design. System prompt is stable prefix; messages grow monotonically. Tool results stream as SSE events.
**Quality Note:** Max mode allows 12 tool turns vs Manus Pro's unlimited. This is intentional for cost control in self-hosted deployments.
