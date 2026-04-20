# PARITY.md

> Canonical v9 §L.26 structure. Migrated from PARITY_BACKLOG.md on 2026-04-20.
> Schema migration logged in `docs/parity/PARITY_SCHEMA_MIGRATION.md`.

## Open Recommendations (consumed by build loop, produced by assessment loop)

| ID | Source | Area | Recommendation | Priority | Status | Depth Score | Commit SHA |
|---|---|---|---|---|---|---|---|
| R1 | ns13-fix | chat-persistence | Server-side onComplete saves assistant messages independently of client | P1 | done | 3 | ef6e1c65 |
| R2 | ns13-fix | chat-persistence | beforeunload + unmount cleanup saves partial streaming content | P1 | done | 3 | ef6e1c65 |
| R3 | ns13-fix | chat-ux | User-friendly error messages replacing raw browser errors (Load failed → Connection lost) | P2 | done | 2 | ef6e1c65 |
| R4 | ns13-fix | chat-persistence | Message dedup uses role+content(300 chars) key; ASC ordering on getTaskMessages | P2 | done | 2 | ef6e1c65 |
| R5 | v9-red-audit | microsoft-365 | #53 Microsoft 365 OAuth scaffold — needs Azure AD credentials from owner | P2 | open | 1 | — |
| R6 | v9-red-audit | video-gen | #62 Veo3 video generation scaffold — needs API access from owner | P2 | open | 1 | — |
| R7 | assessment | cross-model-judge | §L.22 cross-model judge validation on reasoning traces (self-assessed, external recommended) | P3 | open | 0 | — |
| R8 | live-benchmark | browser-automation | Add headless browser as agent tool — closes largest capability gap (4 HIGH gaps) | P1 | open | 0 | — |
| R9 | live-benchmark | code-sandbox | Add sandboxed code execution — second highest impact capability | P1 | open | 0 | — |
| R10 | live-benchmark | document-gen | Add server-side PDF/DOCX generation — quick win, no sandbox needed | P2 | open | 0 | — |
| R11 | live-persona | task-replay | Add step logging + replay UI for agent transparency | P2 | open | 0 | — |
| R12 | live-persona | artifact-preview | Add syntax-highlighted code blocks + document viewer | P3 | open | 0 | — |

## Protected Improvements (never weaken these)

| ID | What | Why | Commit SHA | Date |
|---|---|---|---|---|
| PI-1 | Bundle optimization 985KB → 291KB | 70% reduction via code splitting + lazy loading | 6dd93f2d | 2026-04-20 |
| PI-2 | Server-side message persistence (onComplete) | Messages survive client disconnects | ef6e1c65 | 2026-04-20 |
| PI-3 | 348 tests across 21 files | Regression safety net | ef6e1c65 | 2026-04-20 |
| PI-4 | 60G/2Y/0R/5NA parity status | Gate A achieved | 6dd93f2d | 2026-04-20 |
| PI-5 | 4 reasoning traces at 4.59/5.0 avg | §L.22 compliance | 6dd93f2d | 2026-04-20 |
| PI-6 | 4/4 automation demos PASS at $0 | §L.23 compliance | 6dd93f2d | 2026-04-20 |
| PI-7 | 34 services × 3 tiers documented | §L.21 free-tier compliance | 6dd93f2d | 2026-04-20 |
| PI-8 | §L.27 benchmark infrastructure (25 tasks, scorer 59/59) | Live testing capability | 8e8582d1 | 2026-04-20 |
| PI-9 | §L.28 persona infrastructure (32 personas, 21 journeys) | User archetype coverage | 8e8582d1 | 2026-04-20 |
| PI-10 | Comparison matrix: 81.4% parity+partial+exceed rate | Strategic positioning clarity | pending | 2026-04-20 |
| PI-11 | 5 exceed areas identified (Stripe, connectors, self-host, RBAC, webhooks) | Competitive differentiation | pending | 2026-04-20 |

## Known-Bad (tried, failed, don't retry)

| ID | What was tried | Why it failed | Date |
|---|---|---|---|
| KB-1 | Direct Microsoft Graph API without Azure AD app registration | Requires owner to register app in Azure portal; cannot be automated without credentials | 2026-04-20 |
| KB-2 | Veo3 direct API integration | Limited-preview API; no public free-tier endpoint available | 2026-04-20 |

## Gap Matrix (consumed by assessment loop, produced by build loop)

| ID | Capability/Dimension | Current State | Target State | Found by | Date |
|---|---|---|---|---|---|
| G1 | #53 Microsoft 365 | YELLOW (scaffold + §L.25 degraded) | GREEN (live OAuth + Graph API) | v9-red-audit | 2026-04-20 |
| G2 | #62 Veo3 Video | YELLOW (scaffold + FFmpeg fallback) | GREEN (live AI video generation) | v9-red-audit | 2026-04-20 |
| G3 | Cross-model judge | Self-assessed | External model validation | v9-holistic | 2026-04-20 |
| G4 | §L.27 benchmark infrastructure | DONE — 25 tasks, scorer (59/59 tests), EXCEED_REGISTRY, live sweep | ≥20 benchmarks, scorer, EXCEED_REGISTRY | v9-command | 2026-04-20 |
| G5 | §L.28 persona infrastructure | DONE — 32 personas, 21 journeys, registries, live sweep | ≥30 personas, journey testing | v9-command | 2026-04-20 |
| G6 | Browser automation | NOT PRESENT | Headless browser as agent tool | live-benchmark | 2026-04-20 |
| G7 | Code execution sandbox | NOT PRESENT | Sandboxed code execution for user tasks | live-benchmark | 2026-04-20 |
| G8 | File system access | NOT PRESENT | Virtual file system over S3 | live-benchmark | 2026-04-20 |
| G9 | Document generation (PDF/DOCX) | NOT PRESENT | Server-side document generation | live-benchmark | 2026-04-20 |
| G10 | Task replay / step visualization | NOT PRESENT | Step logging + replay UI | live-persona | 2026-04-20 |
| G11 | Artifact preview (code, docs) | NOT PRESENT | Syntax-highlighted code blocks + doc viewer | live-persona | 2026-04-20 |

## Reconciliation Log (concurrent-edit conflicts and how resolved)

| Pass | Conflict | Resolution | Evidence |
|---|---|---|---|
| v9-10 | PARITY_BACKLOG showed #53/#62 as RED despite scaffolds | Updated to YELLOW with §L.25 degraded-delivery | V9_CONVERGENCE_LOG v9-10 |
| ns13 | Dual message persistence (server + client) could create duplicates | Dedup logic uses role+content(300 chars) key | ef6e1c65 |

## Build Loop Pass Log (one line per pass, append-only)

Pass 1 · 2026-04-20T12:00:00Z · angle=infrastructure · queue=[§L.26 PARITY.md creation, ANGLE_HISTORY.md init, pass numbering bootstrap] · commit=8e8582d1 · completed=[PARITY.md, ANGLE_HISTORY.md] · deferred=[§L.27, §L.28]
Pass 2 · 2026-04-20T13:00:00Z · angle=benchmark · queue=[§L.27 TASK_CATALOG, scorer.js, EXCEED_REGISTRY, live sweep] · commit=8e8582d1 · completed=[25 tasks, scorer 59/59, EXCEED_REGISTRY, sweep-001, live sweep 6/8 PASS] · deferred=[manus.im comparison]
Pass 3 · 2026-04-20T13:30:00Z · angle=persona · queue=[§L.28 PERSONA_CATALOG, journeys, registries, live sweep] · commit=8e8582d1 · completed=[32 personas, 21 journeys, registries, API sweep 6/6 tasks created] · deferred=[manus.im comparison]
Pass 4 · 2026-04-20T14:00:00Z · angle=comparison · queue=[side-by-side matrix, gap analysis, exceed analysis, PARITY.md update] · commit=pending · completed=[COMPARISON_MATRIX.md, FULL_BENCHMARK_SWEEP.md, FULL_PERSONA_SWEEP.md, PARITY.md updated] · deferred=[]
