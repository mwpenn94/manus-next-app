# Prompt Engineering Audit

**Date:** 2026-04-18
**Auditor:** Autonomous (AFK mode)
**Scope:** System prompt in `server/agentStream.ts` vs Manus Pro prompt sophistication

---

## 1. Current System Prompt Analysis

### Structure
The system prompt in `agentStream.ts` follows a role-definition → capabilities → tool-use → constraints pattern:

```
You are Manus Next, an AI assistant...
Available tools: [7 tools]
Mode-specific behavior: speed/quality/max
Memory context: [injected from DB]
System prompt override: [user-configurable]
```

### Strengths
1. **Tool definitions are typed** — Each tool has a JSON Schema for parameters, enabling structured extraction
2. **Mode-aware behavior** — Different turn limits and instructions per mode (speed=4, quality=8, max=12)
3. **Memory injection** — Relevant memories are prepended to provide persistent context
4. **User-configurable system prompt** — Users can override/extend the default prompt
5. **Project context** — When a task belongs to a project, project knowledge is injected

### Weaknesses vs Manus Pro

| Dimension | Manus Next | Manus Pro | Gap |
|-----------|-----------|-----------|-----|
| Context engineering | Basic memory injection | Full KV-cache aware context management | HIGH |
| Tool selection | LLM decides freely | Likely has tool-selection heuristics | MEDIUM |
| Error recovery | Single retry on tool failure | Multi-strategy recovery with fallbacks | HIGH |
| Chain-of-thought | Implicit (LLM decides) | Likely explicit CoT prompting | MEDIUM |
| Output formatting | Basic markdown | Rich structured output with artifacts | LOW |
| Safety rails | Basic input validation | Likely multi-layer safety checks | MEDIUM |
| Prompt compression | None | KV-cache reuse, context compression | HIGH |

---

## 2. Specific Prompt Defects Found

### PD-1: No explicit chain-of-thought instruction
The system prompt does not instruct the model to think step-by-step before acting. Manus Pro likely uses explicit CoT prompting to improve tool selection accuracy.

**Fix:** Add `"Before using any tool, briefly reason about which tool is most appropriate and why."` to the system prompt.

### PD-2: No error recovery strategy in prompt
When a tool call fails, the prompt doesn't instruct the agent on how to recover. The code handles retries, but the LLM doesn't know it should try alternative approaches.

**Fix:** Add `"If a tool call fails, analyze the error and try an alternative approach. Do not repeat the same failing call."` to the system prompt.

### PD-3: No output structure guidance
The prompt doesn't specify how to format final responses. Manus Pro likely has structured output templates for different task types.

**Fix:** Add formatting guidelines: `"For research tasks, structure your response with sections and citations. For code tasks, include the code in fenced blocks with language tags."`

### PD-4: No context window awareness
The prompt doesn't instruct the agent about context window limits or when to summarize. With long conversations, this leads to degraded performance.

**Fix:** Add `"If the conversation is getting long, summarize previous findings before continuing to preserve context quality."`

### PD-5: Wide research underutilized
The wide_research tool is defined but the prompt doesn't clearly guide when to use it vs sequential web_search calls.

**Fix:** Add explicit guidance: `"For broad research topics, prefer wide_research to search multiple queries in parallel. For specific lookups, use web_search."`

---

## 3. Manus Pro Prompt Patterns (Inferred from Blog)

Based on the Manus blog post on Context Engineering:

1. **Reservation of KV-cache prefix** — Manus keeps a stable prefix to avoid recomputation
2. **Tool definitions in system prompt** — Same pattern we use, but likely more refined
3. **State machine transitions** — Manus likely uses explicit state management in the prompt
4. **File-system as extended memory** — Manus uses the sandbox filesystem as overflow memory
5. **Todo-driven planning** — Manus maintains a todo list in the filesystem for complex tasks

### Patterns We Should Adopt
- **Explicit planning phase** — Before executing, create a brief plan
- **State checkpointing** — Periodically save progress to handle interruptions
- **Structured tool output parsing** — Parse tool results more carefully before responding

---

## 4. Recommendations (Priority Order)

1. **HIGH:** Add CoT instruction to system prompt (PD-1)
2. **HIGH:** Add error recovery guidance (PD-2)
3. **MEDIUM:** Add output formatting templates (PD-3)
4. **MEDIUM:** Add context window awareness (PD-4)
5. **LOW:** Add wide_research usage guidance (PD-5)

---

## 5. Implementation Status

- [x] Audit completed
- [x] PD-1 fix applied — REASONING PROTOCOL section added to system prompt
- [x] PD-2 fix applied — ERROR RECOVERY section added to system prompt
- [x] PD-3 fix applied — OUTPUT FORMATTING section added to system prompt
- [x] PD-4 fix applied — CONTEXT MANAGEMENT section added to system prompt
- [x] PD-5 fix applied — wide_research preference guidance added to WIDE RESEARCH MODE section
