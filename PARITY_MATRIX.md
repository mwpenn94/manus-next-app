# PARITY_MATRIX.md (v2.0 — MANUS-PARITY-PLUS-LOOP v1.1)

Last updated: 2026-04-26 Cycle 1, Pass 4 — **OPTIMIZATION IN PROGRESS**

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

## Axis B — Engineering Quality (6.5 / 10)

Measures code health, test coverage, observability, and operational readiness.

| Sub-dimension | Score | Evidence |
|---|---|---|
| B1: Type safety | 7 | Full TypeScript, 0 tsc errors, tRPC end-to-end types |
| B2: Test coverage | 6 | 303+ vitest tests across 8+ files, but no E2E test execution |
| B3: Error handling | 7 | ErrorBoundary with server reporting, tRPC error propagation, toast feedback |
| B4: Security | 7 | Rate limiting on all sensitive routes, CSRF via SameSite cookies, input validation |
| B5: Observability | 7 | Structured logging (observability service), /api/health endpoint, client error collection |
| B6: Build pipeline | 6 | Vite + esbuild, HMR, but no CI/CD pipeline definition |
| B7: Onboarding DX | 6 | 6-step walkthrough, localStorage first-run detection |
| B8: Feedback system | 7 | DB-persisted feedback + owner notification + help page with FAQ |
| B9: Rate limiting | 7 | Per-route rate limiting on stream, upload, TTS, analytics, webhooks, tRPC |

## Axis C — UX Polish (6.5 / 10)

Measures visual quality, interaction design, accessibility, and responsive behavior.

| Sub-dimension | Score | Evidence |
|---|---|---|
| C1: Transitions/animations | 7 | Sidebar collapse (300ms cubic-bezier), mobile drawer (200ms ease-out), framer-motion on home |
| C2: Loading states | 7 | 67 skeleton/loading references, per-component loading, streaming indicators |
| C3: Empty states | 6 | Task list empty state with guidance, but some pages lack empty state design |
| C4: Toast feedback | 7 | 386 toast references, comprehensive action feedback |
| C5: Mobile responsiveness | 7 | viewport-fit=cover, safe-area-inset, responsive breakpoints, mobile drawer |
| C6: Keyboard navigation | 6 | 64 focus-visible references, Ctrl+K command palette, keyboard shortcuts dialog |
| C7: Accessibility | 6 | Landmark structure (axe-core 0 violations), sr-only labels, ARIA attributes |
| C8: Visual consistency | 7 | CSS variable theming, consistent spacing, shadcn/ui components |

## Axis D — Orchestration Quality (6.5 / 10)

Measures task management, multi-step execution, error recovery, and system resilience.

| Sub-dimension | Score | Evidence |
|---|---|---|
| D1: Task queue | 7 | Priority ordering (high/normal/low), orchestration service with queue management |
| D2: Retry logic | 7 | invokeLLMWithRetry (3 retries, exponential backoff 1s/2s/4s), retryCount tracking |
| D3: Concurrency control | 7 | Max 3 concurrent tasks, canStartTask() gating, orchestration status endpoint |
| D4: Task dependencies | 6 | atlasPlans DAG with dependsOn, atlasGoalTasks execution order, taskBranches |
| D5: Timeout management | 7 | Per-task configurable timeout (default 300s), background timeout checker |
| D6: Status visibility | 7 | Step progress, cost estimate, tool turns, token usage, context pressure indicator |
| D7: Scheduled tasks | 6 | Full CRUD schedule router, but no recurring execution engine |
| D8: Error recovery | 6 | Task pause/resume, error status with retry option, but no automatic recovery |

## Score Summary

| Axis | Score | Trend | Previous |
|---|---|---|---|
| A: Manus Parity | 7.0 | ↔ | 7.0 |
| B: Engineering Quality | 6.5 | ↑ | 5.0 |
| C: UX Polish | 6.5 | ↑ | 5.5 |
| D: Orchestration Quality | 6.5 | ↑ | 5.0 |
| **Overall (MIN)** | **6.5** | **↑** | **5.0** |

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
```

## Next Priority Targets (to reach MIN 7.0)

1. **A7/A10**: Settings depth and onboarding polish — closest to Manus parity gap
2. **B2/B6**: E2E test execution and CI/CD pipeline
3. **C3/C6/C7**: Empty states, keyboard nav completeness, accessibility audit
4. **D4/D7/D8**: Dependency visualization, recurring tasks, automatic error recovery

## Legacy Scores (v1.2 — Cycle 11)

The previous scoring system used a 2-axis (Engineering/Experience) rubric with per-capability breakdowns. Those scores (8.1–8.5 composite) measured a different set of dimensions and are not directly comparable to the v2.0 4-axis rubric. The v2.0 rubric is more granular and includes orchestration quality as a separate axis, which was not measured before.
