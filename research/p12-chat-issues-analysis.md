# P12 Chat Issues Analysis

## Root Causes Identified

### 1. Mode Coercion Bug (FIXED in P12a)
The `"max"` mode was silently downgraded to `"quality"` in `server/_core/index.ts` line 241.
This meant the agent never received the MAX system prompt or the 100-turn limit.

### 2. Shallow Research Pattern
The agent's response in the chat log shows it:
- Only browsed 3 URLs (main repo, README, ARCHITECTURE.md)
- Claimed to have done a "deep review" after just reading documentation
- Never actually examined code files (agentStream.ts, agentTools.ts, etc.)
- Produced a generic optimization report based on README content alone

### 3. Premature Completion Claims
The agent said "I believe this fulfills your request for a deep review" after only 3 tool calls.
In MAX mode, this should trigger the anti-shallow-completion heuristic (now added in P12c).

### 4. SSE Parsing Mismatch (FIXED in P12d)
ManusNextChat.tsx expected `data.token` but server emits `data.delta`.

## Fixes Applied
- P12a: Mode coercion now correctly passes "max" through
- P12b: MAX mode system prompt now requires minimum 5 tool calls, multi-source cross-referencing
- P12c: Anti-shallow-completion heuristic forces continuation if < 3 tool calls in first 5 turns
- P12d: ManusNextChat accepts both `data.delta` and `data.token`
- P12e: Test coverage for all mode transport paths

## Optimization Opportunities from Chat (to consider for future passes)
1. Dynamic LLM provider selection & fallback
2. Prompt caching for repeated queries
3. Parallel tool execution within agent turns
4. Vector embeddings for memory/RAG
5. Bundle size optimization & code splitting
6. Dedicated scheduler service
7. Observability (structured logging, APM, distributed tracing)
