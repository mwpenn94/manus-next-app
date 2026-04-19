# Cap 2 — Per-Capability Note

## Cap 2: Agent Mode Long-Running — GREEN
- **Implementation:** `agentStream.ts` with `MAX_TOOL_TURNS=8`, multi-turn tool loop, 8 tools available
- **Quality:** Tools chain correctly, results fed back to LLM, conversation context maintained
- **Evidence:** web_search → analyze → generate_document chains work end-to-end
- **Action:** None — fully implemented
