# Manus Next — Tiered Options Matrix

> Generated: P13 Convergence Pass | 2026-04-20

## Agent Mode Tiers

| Tier | Mode | Max Tool Turns | System Prompt Injection | Anti-Shallow | Use Case |
|------|------|---------------|------------------------|-------------|----------|
| **T1** | Speed | 3 | Concise, direct answers | None | Quick lookups, simple Q&A |
| **T2** | Quality | 8 | Balanced depth + breadth | None | Standard research, code generation |
| **T3** | Max | 100 | 8-point deep research directive | Yes — forces continuation if <3 tools in first 5 turns | Comprehensive research, multi-source analysis, exhaustive reports |

## Deep Research Directive (Max Mode)

When Max mode is active, the system prompt injects:

1. Use ALL available tools extensively — web search, code execution, browsing
2. Cross-reference at least 3 independent sources for every factual claim
3. Produce comprehensive, detailed output with citations
4. Do NOT summarize prematurely — explore every angle
5. If a search returns useful leads, follow ALL of them
6. Generate intermediate artifacts (notes, outlines) before final output
7. Minimum 5 tool calls before considering task complete
8. Leave no stone unturned — thoroughness over speed

## Anti-Shallow Completion Heuristic

Triggers when: `mode === "max"` AND `turnCount <= 5` AND `toolCallCount < 3`

Action: Injects continuation nudge instead of allowing completion:
> "You are in MAX mode. The user expects exhaustive, thorough research. You have only used {n} tools in {t} turns. Continue investigating — use web_search, browse_web, and execute_code to gather more data before concluding."

## Prompt Caching Tiers

| Cache Layer | Scope | TTL | Hit Rate Target |
|------------|-------|-----|----------------|
| **Prefix Cache** | System prompt + tool definitions | 30 min | >90% within same session |
| **Memory Cache** | Memory extraction responses | 60 min | >70% for repeat conversations |

## Feature Capability Tiers

| Feature | Status | Tier | Notes |
|---------|--------|------|-------|
| Task creation & execution | GREEN | Core | Full agent loop with streaming |
| Multi-mode selection (Speed/Quality/Max) | GREEN | Core | Mode transport verified end-to-end |
| Voice input (speech-to-text) | GREEN | Core | MediaRecorder + Whisper API |
| File attachments | GREEN | Core | Drag-drop, paste, multi-file |
| Memory system | GREEN | Core | Auto-extract + manual CRUD |
| Billing & usage tracking | GREEN | Core | Credits, usage stats, Stripe |
| Scheduled tasks | GREEN | Core | Cron + interval scheduling |
| Projects | GREEN | Core | Multi-task organization |
| Team collaboration | GREEN | Extended | Invite codes, shared sessions |
| Replay/playback | GREEN | Extended | Session timeline with step-by-step |
| Skills marketplace | GREEN | Extended | Browse, install, manage |
| Web app builder | GREEN | Extended | AI-generated web apps |
| Mobile projects | GREEN | Extended | Cross-platform mobile apps |
| Slides generator | GREEN | Extended | AI presentation creation |
| Design studio | GREEN | Extended | Image generation + editing |
| Video generator | GREEN | Extended | AI video production |
| Meetings analyzer | GREEN | Extended | Transcript analysis |
| Messaging agent | GREEN | Extended | Multi-platform messaging |
| App publishing | GREEN | Extended | Build & deploy pipeline |
| Prompt caching | GREEN | Optimization | LRU with TTL, prefix + memory |
| Crimson-Hawk bridge | GREEN | Integration | WebSocket to local browser extension |
| Self-discovery mode | GREEN | Settings | Toggle for continuous learning |
| Hands-free audio | GREEN | Settings | Toggle for audio playback |
| Cache metrics | GREEN | Settings | Real-time hit/miss rates |

## Remaining Items (YELLOW)

| Item | Status | Blocker | Priority |
|------|--------|---------|----------|
| Stripe sandbox claim | YELLOW | User must claim at Stripe dashboard | High |
| OAuth login flow | YELLOW | Requires deployed environment | Medium |
