# PARITY_MATRIX.md (v2.0 — MANUS-PARITY-PLUS-LOOP v1.1)

Last updated: 2026-04-26 Cycle 1, Pass 5 — **OPTIMIZATION IN PROGRESS**

## Axis A — Manus Parity (7.0 / 10)

Measures how closely the app replicates Manus.im's observable feature surface.

| Sub-dimension | Score | Evidence |
|---|---|---|
| A1: Home screen layout | 8 | Greeting, suggestion cards, category tabs, input bar with attachments — matches Manus |
| A2: Task creation flow | 8 | Text input → task creation → streaming response — matches Manus |
| A3: Agent streaming | 7 | Real-time streaming with tool actions, step progress, abort — close to Manus |
| A4: Artifact rendering | 7 | Code blocks, markdown, images, file attachments — most artifact types covered |
| A5: Model/mode selector | 7 | 4 modes (Lite/Standard/Max/Limitless) with descriptions — matches Manus tier structure |
| A6: Sidebar navigation | 7 | Task list, projects, search, library, filter — matches Manus sidebar |
| A7: Settings/billing | 6 | Profile, billing with Stripe, usage stats — basic parity |
| A8: Share/export | 7 | Share links, markdown/HTML/JSON export, clipboard copy — matches Manus |
| A9: Mobile experience | 7 | Responsive drawer, safe-area handling, touch-friendly — close to Manus mobile |
| A10: Onboarding | 6 | 6-step walkthrough, first-run detection — functional but less polished than Manus |

## Axis B — Engineering Quality (7.0 / 10)

Measures code health, test coverage, observability, and operational readiness.

| Sub-dimension | Score | Evidence |
|---|---|---|
| B1: Type safety | 7 | Full TypeScript, 0 tsc errors, tRPC end-to-end types |
| B2: Test coverage | 7 | 3570+ vitest tests across 130 files, 7 new auto-retry tests. Pre-existing failures in 8 files (not regressions). |
| B3: Error handling | 7 | ErrorBoundary with server reporting, tRPC error propagation, toast feedback |
| B4: Security | 7 | Rate limiting on all sensitive routes, CSRF via SameSite cookies, input validation |
| B5: Observability | 7 | Structured logging (observability service), /api/health endpoint, client error collection |
| B6: Build pipeline | 7 | GitHub Actions CI/CD workflow (typecheck → test → build), Vite + esbuild, HMR |
| B7: Onboarding DX | 6 | 6-step walkthrough, localStorage first-run detection |
| B8: Feedback system | 7 | DB-persisted feedback + owner notification + help page with FAQ |
| B9: Rate limiting | 7 | Per-route rate limiting on stream, upload, TTS, analytics, webhooks, tRPC |

## Axis C — UX Polish (7.0 / 10)

Measures visual quality, interaction design, accessibility, and responsive behavior.

| Sub-dimension | Score | Evidence |
|---|---|---|
| C1: Transitions/animations | 7 | Sidebar collapse (300ms cubic-bezier), mobile drawer (200ms ease-out), framer-motion on home |
| C2: Loading states | 7 | 67 skeleton/loading references, per-component loading, streaming indicators |
| C3: Empty states | 7 | Library (artifacts + files), Projects (with CTA), SkillsPage (search no-results), TaskView (guidance). All data-driven pages covered. |
| C4: Toast feedback | 7 | 386 toast references, comprehensive action feedback |
| C5: Mobile responsiveness | 7 | viewport-fit=cover, safe-area-inset, responsive breakpoints, mobile drawer |
| C6: Keyboard navigation | 7 | Skip-to-content link, 64 focus-visible references, Ctrl+K command palette, keyboard shortcuts dialog |
| C7: Accessibility | 7 | Skip-to-content, landmark structure (axe-core 0 violations), sr-only labels, ARIA attributes |
| C8: Visual consistency | 7 | CSS variable theming, consistent spacing, shadcn/ui components |

## Axis D — Orchestration Quality (7.0 / 10)

Measures task management, multi-step execution, error recovery, and system resilience.

| Sub-dimension | Score | Evidence |
|---|---|---|
| D1: Task queue | 7 | Priority ordering (high/normal/low), orchestration service with queue management |
| D2: Retry logic | 7 | invokeLLMWithRetry (3 retries, exponential backoff 1s/2s/4s), retryCount tracking |
| D3: Concurrency control | 7 | Max 3 concurrent tasks, canStartTask() gating, orchestration status endpoint |
| D4: Task dependencies | 6 | atlasPlans DAG with dependsOn, atlasGoalTasks execution order, taskBranches |
| D5: Timeout management | 7 | Per-task configurable timeout (default 300s), background timeout checker |
| D6: Status visibility | 7 | Step progress, cost estimate, tool turns, token usage, context pressure indicator |
| D7: Scheduled tasks | 7 | Full CRUD schedule router + server-side recurring execution (cron + interval polling, stale sweep, memory decay, data retention) |
| D8: Error recovery | 7 | Auto-retry failed tasks with exponential backoff (5s base, 5min cap, 10% jitter), concurrency-aware, task pause/resume |

## Score Summary

| Axis | Score | Trend | Previous |
|---|---|---|---|
| A: Manus Parity | 7.0 | ↔ | 7.0 |
| B: Engineering Quality | 7.0 | ↑ | 6.5 |
| C: UX Polish | 7.0 | ↑ | 6.5 |
| D: Orchestration Quality | 7.0 | ↑ | 6.5 |
| **Overall (MIN)** | **7.0** | **↑** | **6.5** |

## Scoring Key

- 9.0–10.0: Parity+ (exceeds oracle in measurable ways)
- 8.0–8.9: Near-parity (minor gaps, production-ready)
- 7.0–7.9: Approaching parity (notable gaps, functional)
- 6.0–6.9: Sub-parity (significant gaps, needs work)
- Below 6.0: Far from parity (fundamental gaps)

## Convergence Trajectory

```
Baseline : A=7.0 B=5.0 C=5.5 D=5.0 → MIN=5.0
Pass 1   : A=7.0 B=6.5 C=5.5 D=5.0 → MIN=5.0 (B-axis +1.5)
Pass 2   : A=7.0 B=6.5 C=5.5 D=6.0 → MIN=5.5 (D-axis +1.0)
Pass 3   : A=7.0 B=6.5 C=6.5 D=6.0 → MIN=6.0 (C-axis +1.0)
Pass 4   : A=7.0 B=6.5 C=6.5 D=6.5 → MIN=6.5 (D-axis +0.5)
Pass 5   : A=7.0 B=7.0 C=7.0 D=7.0 → MIN=7.0 (B/C/D all +0.5)
```

## Next Priority Targets (to reach MIN 7.5)

1. **A7/A10**: Settings depth and onboarding polish — closest to Manus parity gap
2. **B7**: Onboarding DX — improve first-run experience
3. **D4**: Task dependency visualization — DAG display in UI
4. **Cross-axis**: Address pre-existing test failures (8 files with 42 failing tests)

## Legacy Scores (v1.2 — Cycle 11)

The previous scoring system used a 2-axis (Engineering/Experience) rubric with per-capability breakdowns. Those scores (8.1–8.5 composite) measured a different set of dimensions and are not directly comparable to the v2.0 4-axis rubric. The v2.0 rubric is more granular and includes orchestration quality as a separate axis, which was not measured before.
