# Quality Principles — Manus Next

*Derived from Manus AI's published design philosophy and applied to the Manus Next codebase.*

## Foundation: Context Engineering Over Model Training

Manus's core insight is that **context engineering** — the art of shaping what the model sees — matters more than model selection. As Yichao 'Peak' Ji wrote: "If model progress is the rising tide, we want Manus to be the boat, not the pillar stuck to the seabed." This means our quality principles center on how we structure, compress, and present information to the LLM, not on which LLM we call.

## Principle 1: KV-Cache Awareness

Every design decision should consider its impact on the KV-cache hit rate. In Manus, the input-to-output token ratio averages 100:1, making cache efficiency the dominant cost and latency factor.

| Practice | Implementation in Manus Next |
|---|---|
| Stable prompt prefix | System prompt is static; no per-request timestamps at the start |
| Append-only context | Messages array grows monotonically; no mid-stream edits |
| Deterministic serialization | Tool definitions use stable key ordering |
| Explicit breakpoints | System prompt ends with a clear delimiter before conversation |

## Principle 2: Mask, Don't Remove

When the action space grows complex, the solution is not to dynamically add or remove tools — that breaks the cache and confuses the model when prior actions reference removed tools. Instead, Manus uses a **context-aware state machine** that masks token logits during decoding.

In Manus Next, we implement this through the `AgentMode` system: Speed mode restricts to 5 tool turns, Quality allows 8, and Max allows 12. Tool availability is controlled by the mode, not by removing tool definitions from the prompt.

## Principle 3: File System as External Memory

Rather than stuffing everything into the context window, Manus treats the file system as externalized working memory. Large observations (web page content, search results, code output) are compressed into files that the agent can reference selectively.

In Manus Next, this manifests as the **memory system** — extracted insights from completed tasks are stored in the database and injected into future task contexts as relevant background knowledge, rather than replaying entire conversation histories.

## Principle 4: Progressive Disclosure

Borrowed from the Agent Skills architecture, information should be loaded in three tiers based on need:

| Tier | Content | When Loaded | Context Cost |
|---|---|---|---|
| Metadata | Tool names, capability descriptions | Always present | ~100 tokens each |
| Instructions | Full tool schemas, system prompt sections | When mode activates | <5K tokens |
| Resources | Knowledge base entries, project context | On demand per task | Variable |

## Principle 5: Errors as Learning Signals

Errors should remain visible in the agent's context rather than being hidden or sanitized. When a tool call fails, the error message stays in the conversation so the agent can self-correct. Manus Next implements this by streaming error events (`tool_error`) directly into the message history with user-friendly descriptions.

## Principle 6: Composability Over Specialization

Fewer general-purpose tools that compose well are preferable to many narrow tools. Manus Next's 8-tool action space (chat, web_search, wide_research, code_execute, file_write, schedule_task, create_artifact, knowledge_query) covers the same ground as Manus Pro's larger toolset by making each tool more flexible.

## Quality Dimensions (from §L of the v8.3 Spec)

Each capability in Manus Next is scored across five quality dimensions:

| Dimension | Definition | Target |
|---|---|---|
| Correctness | Does it produce the right output for valid inputs? | 100% |
| Resilience | Does it handle edge cases, errors, and adversarial inputs gracefully? | 95%+ |
| Performance | Is latency acceptable? Does it avoid unnecessary re-renders or API calls? | <2s for UI, <30s for agent turns |
| Accessibility | Can it be used with keyboard only, screen readers, and high-contrast modes? | WCAG 2.1 AA |
| Maintainability | Is the code well-structured, tested, and documented? | 80%+ test coverage for server code |

## How We Apply These Principles

Every code change is evaluated against these principles during recursive convergence passes. The convergence criteria require:

1. Zero TypeScript errors (correctness)
2. All tests passing with no flaky failures (resilience)
3. All persona checks passing (accessibility + usability)
4. No browser console errors (performance + correctness)
5. Three consecutive clean passes before declaring convergence (maintainability)

---

*Last updated: Phase 6 HRQ Failover Resolution*
*Sources: manus.im/blog/Context-Engineering-for-AI-Agents, manus.im/blog/manus-skills*
