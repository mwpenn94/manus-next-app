# PROMPT_DEFECTS.md — Observed Prompt Issues

*Log of prompt engineering issues discovered during development and testing.*

## Defect #1: System Prompt Length in Max Mode

**Severity:** Low
**Description:** The Max mode system prompt includes additional instructions for deeper research and multi-step planning, adding ~200 tokens to the prefix. This slightly reduces the available context window for conversation history.
**Mitigation:** The additional tokens are within acceptable bounds (<1% of context window). Could be optimized by moving Max-specific instructions to a conditional section loaded only when Max mode is active.

## Defect #2: Tool Schema Verbosity

**Severity:** Low
**Description:** The 8-tool schema definitions consume ~1,500 tokens of the system prompt. Tools like `wide_research` have detailed parameter descriptions that could be compressed.
**Mitigation:** Tool descriptions follow the "precise and unambiguous" principle from Manus. Compression would risk ambiguity. Acceptable trade-off.

## Defect #3: Memory Injection Ordering

**Severity:** Medium
**Description:** When memories are injected into the system prompt, they appear in recency order rather than relevance order. For tasks with many accumulated memories, the most relevant context may be pushed further from the attention boundary.
**Mitigation:** Future improvement: add embedding-based relevance scoring to memory injection. Current recency-based ordering is a reasonable default.

## Defect #4: Error Recovery Instructions

**Severity:** Low
**Description:** The system prompt tells the agent to "try alternative approaches" on error but doesn't provide specific recovery strategies for common failure modes (e.g., "if web_search fails, try rephrasing the query").
**Mitigation:** The agent's general reasoning ability handles most recovery cases. Specific recovery instructions could improve reliability for edge cases.

## Defect #5: No Explicit Cache Breakpoint Markers

**Severity:** Low
**Description:** Per Manus's KV-cache design principle, cache breakpoints should be explicitly marked. Our system prompt doesn't include explicit breakpoint markers between sections.
**Mitigation:** The natural structure of the prompt (system → tools → conversation) provides implicit breakpoints. Explicit markers would be a minor optimization.
