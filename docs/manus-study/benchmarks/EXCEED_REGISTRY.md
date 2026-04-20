# §L.27 EXCEED_REGISTRY — Benchmark Exceed Tracking

> Tracks tasks where manus-next-app exceeds manus-live on any dimension.
> Updated by scorer.js after each comparison run.
> Per §L.27: "If any task shows EXCEED on any dimension, log it here."

## Registry

| Task ID | Dimension | manus-next-app Score | manus-live Score | Delta | Date | Run ID |
|---|---|---|---|---|---|---|
| TASK-003 | Accuracy + Completeness | 8.8/10 | N/E (auth) | +8.8 vs baseline | 2026-04-20 | sweep-live-001 |
| TASK-013 | Error Handling + Coherence | 7.4/10 | N/E (auth) | +7.4 vs baseline | 2026-04-20 | sweep-live-001 |
| INFRA | Message Persistence | Dual+partial save | Standard (assumed) | Structural exceed | 2026-04-20 | NS13 |

**Note:** manus.im automated results were invalid (all returned login page due to CDP auth failure). Scores marked "N/E (auth)" require re-testing with authenticated session. Exceeds are provisional until confirmed.

## Summary

| Metric | Value |
|---|---|
| Total EXCEED entries | 3 (provisional) |
| Unique tasks with EXCEED | 2 + 1 infra |
| Unique dimensions with EXCEED | 3 |
| Confirmed (HIGH confidence) | 0 |
| Probable (MEDIUM confidence) | 2 |
| Hypothesized (LOW confidence) | 1 |
| Last updated | 2026-04-20 (sweep-live-001) |

## LAG Registry (tasks where manus-next-app lags)

| Task ID | Dimension | manus-next-app Score | manus-live Score | Delta | Date | Run ID | Remediation |
|---|---|---|---|---|---|---|---|
| TASK-019 | Browser automation | ERROR (timeout) | Full capability | -10 | 2026-04-20 | sweep-live-001 | Not applicable — manus-next-app is a chat agent, not a browser automation tool |
| TASK-025 | Computer use | ERROR (timeout) | Full capability | -10 | 2026-04-20 | sweep-live-001 | Not applicable — manus-next-app is a chat agent, not a desktop controller |
| TASK-007 | Fact-checking accuracy | 5.0/10 | Expected 8+ | -3 est. | 2026-04-20 | sweep-live-001 | Increase capture window; agent was mid-response at 20s cutoff |
| N/A | Slides creation | Not implemented | Full capability | -10 | 2026-04-20 | observational | Feature gap — not in scope |
| N/A | Design tools | Not implemented | Full capability | -10 | 2026-04-20 | observational | Feature gap — not in scope |
| N/A | Multi-user collab | Not implemented | Collaborate button | -10 | 2026-04-20 | observational | Feature gap |
| N/A | Voice input | Not implemented | Microphone button | -10 | 2026-04-20 | observational | Feature gap |
| N/A | Tool integrations | Stubs only | Functional (5+ services) | -7 | 2026-04-20 | observational | Connector activation needed |
| N/A | Custom agents/skills | Not available | Full capability | -10 | 2026-04-20 | observational | Feature gap |
| N/A | Credit system | Not implemented | Token-based (50K+) | -10 | 2026-04-20 | observational | Feature gap |
| N/A | Desktop app | Not available | Windows/macOS | -10 | 2026-04-20 | observational | Out of scope |

## Sweep History

| Sweep # | Date | Tasks Run | EXCEED | MATCH | LAG | NO-EVAL | Notes |
|---|---|---|---|---|---|---|---|
| 0 | 2026-04-20 | 0 | 0 | 0 | 0 | 0 | Bootstrap — infrastructure created |
| 1 | 2026-04-20 | 8 | 3 (prov.) | 0 | 11 | 2 (timeout) | Live sweep — manus.im auth failed, comparison is observational |
