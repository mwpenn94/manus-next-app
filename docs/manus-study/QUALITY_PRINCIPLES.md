# QUALITY_PRINCIPLES.md — Manus Design Principles for Agent Quality

> Derived from primary sources: Manus engineering blog posts, public architecture documentation, and observed product behavior. These principles inform every quality decision in the Manus Next parity implementation.

---

## Principle 1: Design Around the KV-Cache

The KV-cache hit rate is the single most important metric for a production AI agent. It directly affects both latency and cost. With Claude Sonnet, cached input tokens cost $0.30/MTok while uncached cost $3.00/MTok — a 10x difference. Manus's average input-to-output token ratio is approximately 100:1, making cache efficiency critical.

**Implementation requirements:**

- Keep the system prompt prefix stable across iterations. A single-token difference invalidates the cache from that point forward. Never include volatile data (timestamps, random IDs) at the beginning of the system prompt.
- Make context append-only. Never modify previous actions or observations. Ensure serialization is deterministic — many languages do not guarantee stable JSON key ordering.
- Mark cache breakpoints explicitly. At minimum, ensure the breakpoint includes the end of the system prompt.

**Manus Next application:** Our `agentStream.ts` system prompt is structured with stable prefix, tool definitions, then conversation history (append-only). We avoid mid-stream tool definition changes and use deterministic JSON serialization for tool results.

*Source: "Context Engineering for AI Agents: Lessons from Building Manus" — Yichao 'Peak' Ji, manus.im/blog, July 18, 2025*

---

## Principle 2: Mask, Don't Remove

As an agent gains capabilities, its action space grows. The natural reaction is to dynamically load tools on demand (RAG-like). Manus found this degrades performance for two reasons: (1) changing tool definitions invalidates the KV-cache for all subsequent tokens, and (2) when previous actions reference tools no longer in context, the model hallucinates or violates schemas.

Instead, Manus uses a context-aware state machine that masks token logits during decoding to prevent or enforce tool selection based on current state — without modifying tool definitions. Tool names use consistent prefixes (`browser_*`, `shell_*`) to enable group-level masking.

**Manus Next application:** Our tool definitions remain static across all agent turns. We use `tool_choice: "auto"` consistently and design tool names with semantic prefixes (`web_search`, `read_webpage`, `generate_image`, `generate_document`, `execute_code`, `wide_research`, `browse_web`).

*Source: Same blog post, section "Mask, Don't Remove"*

---

## Principle 3: Use the File System as Context

The file system is the most underrated context management tool for AI agents. Rather than stuffing everything into the conversation context, agents should read and write files as external memory. This compresses large outputs into file references, enables multi-step workflows without context overflow, and follows the GoLang concurrency principle: "Share memory by communicating, don't communicate by sharing memory."

**Manus Next application:** Our `generate_document` tool writes documents to S3 and returns a URL reference rather than embedding full document content in the conversation. The `execute_code` tool writes code to files before execution. Workspace artifacts persist file references in the database.

*Source: Same blog post, section "Use the File System as Context"*

---

## Principle 4: Manipulate Attention Through Recitation

LLM attention is not uniform across the context window. Critical instructions should be placed where the model attends most strongly — typically at the beginning and end of the system prompt, and immediately before decision points. Reciting key rules at these positions reinforces compliance.

**Manus Next application:** Our system prompt places the CRITICAL IDENTITY RULE first, followed by tool-use mandates. The final section repeats "ALWAYS use web_search FIRST" to exploit recency attention. Tool descriptions include inline behavioral nudges.

*Source: Same blog post, section "Manipulate Attention Through Recitation"*

---

## Principle 5: Keep the Wrong Stuff In

Failed attempts should not be removed from the conversation context. When the agent makes an error — a failed tool call, a hallucinated action, a timeout — leaving the failure visible teaches the model what NOT to do. Removing failures causes the model to repeat them because it has no evidence that the approach was tried and failed.

**Manus Next application:** Our `agentStream.ts` appends tool errors as assistant messages with full error details. The `MAX_TOOL_TURNS` limit prevents infinite retry loops while preserving the failure history. Error messages include user-friendly descriptions alongside technical details.

*Source: Same blog post, section "Keep the Wrong Stuff In"*

---

## Principle 6: Context Engineering Over Fine-Tuning

Manus chose context engineering over model fine-tuning to maintain rapid iteration speed. Fine-tuning takes weeks per cycle; context engineering ships improvements in hours. This keeps the product orthogonal to the underlying model — "if model progress is the rising tide, we want Manus to be the boat, not the pillar stuck to the seabed."

The team rebuilt their agent framework four times through what they call "Stochastic Graduate Descent" — architecture searching, prompt fiddling, and empirical guesswork.

**Manus Next application:** Our agent uses the platform's `invokeLLM` helper which abstracts the model layer. System prompts are designed to be model-agnostic. The `authAdapter.ts` pattern demonstrates the same orthogonality principle applied to infrastructure.

*Source: Same blog post, opening section*

---

## Principle 7: Modular Agent Skills Architecture

Agent Skills are modular capabilities that extend the agent's functionality without modifying core code. Each skill is a self-contained directory with instructions (`SKILL.md`), metadata, and optional resources. This architecture enables community contribution, per-user customization, and capability scaling without monolithic growth.

**Manus Next application:** Our tool system follows this principle — each tool is a self-contained executor with its own schema, validation, and error handling. The `AGENT_TOOLS` array is the skill registry. Adding a new tool requires only defining its schema and executor function.

*Source: "Integrating Agent Skills to Usher in a New Chapter for Agents" — manus.im/blog, January 27, 2026*

---

## Principle 8: Wide Research for Context Window Management

When researching a list of items, LLMs start fabricating results as the context fills. Manus's Wide Research pattern distributes research across parallel sub-queries, each operating within its own context window, then synthesizes results. This overcomes the "lost in the middle" problem where models attend poorly to information in the center of long contexts.

**Manus Next application:** Our `wide_research` tool fires 3-5 parallel `web_search` calls with varied query formulations, collects results via `Promise.allSettled`, then synthesizes through `invokeLLM`. This matches the Manus pattern exactly.

*Source: "Wide Research: Beyond the Context Window" — manus.im/blog, October 29, 2025*

---

## Cross-Cutting Quality Dimensions

These principles inform the seven quality dimensions used for capability scoring:

| Dimension | Primary Principles Applied |
|-----------|---------------------------|
| Correctness | P1 (cache stability), P5 (preserve errors) |
| Completeness | P3 (file system context), P8 (wide research) |
| Efficiency | P1 (KV-cache), P2 (mask don't remove) |
| Robustness | P5 (keep wrong stuff), P6 (model-agnostic) |
| User Experience | P4 (attention manipulation), P7 (modular skills) |
| Maintainability | P6 (context over fine-tuning), P7 (modular skills) |
| Innovation | P8 (wide research), P2 (state machine masking) |
