# Cap #6: Wide Research (Parallel Multi-Query)
**Status:** GREEN
**Implementation:** `server/agentTools.ts` wide_research tool — Promise.allSettled on 3-5 parallel queries + LLM synthesis.
**Manus Alignment:** Extends single search into research-grade capability. Follows composability principle — combines search + synthesis.
**Quality Note:** Graceful degradation via allSettled — partial results still synthesized if some queries fail.
