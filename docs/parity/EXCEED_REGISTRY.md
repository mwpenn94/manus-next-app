# EXCEED Registry

Per §L.27: cumulative log of EXCEED verdicts with evidence. Each entry represents a capability where manus-next-app demonstrably exceeds Manus AI's implementation.

## EXCEED Verdicts

| Capability | Verdict | Evidence | Date | Confidence |
|-----------|---------|----------|------|------------|
| #8 Event Notifications | EXCEED | Real-time SSE push + DB persistence + owner notification API + in-app toast system. Manus uses polling-based notifications. | 2026-04-22 | High |
| #10 Billing & Subscription | EXCEED | Full Stripe integration with webhook verification, checkout sessions, test/live mode, promotion codes. Manus billing is internal-only. | 2026-04-22 | High |
| #12 Projects | EXCEED | Project-level instruction persistence + shared file system + cross-task context. Manus projects are simpler folder groupings. | 2026-04-22 | Medium |
| #14 Storybook Component Library | EXCEED | 8 Storybook stories with visual regression testing. Manus does not expose component library. | 2026-04-22 | High |
| #23 Accessibility (axe-core) | EXCEED | axe-core/react runtime scanning + Playwright axe-core CI + WCAG 2.1 AA compliance. Manus has no documented a11y testing. | 2026-04-22 | High |
| #25 Task Scheduling | EXCEED | Cron + interval scheduling with DB persistence + repeat/one-shot modes + timezone support. Manus scheduling is simpler. | 2026-04-22 | Medium |
| #33 Built-in AI (LLM) | EXCEED | invokeLLM with retry + exponential backoff + structured JSON schema + streaming + multi-model routing. Manus uses single-model. | 2026-04-22 | Medium |
| #36 Project Analytics | EXCEED | UV/PV tracking + analytics endpoint + per-project dashboard. Manus analytics are owner-only. | 2026-04-22 | Medium |

## LAG Verdicts

| Capability | Verdict | Gap Description | Remediation Plan |
|-----------|---------|-----------------|------------------|
| #5 Wide Research | LAG | Manus spawns 2000+ parallel subtasks; our implementation uses sequential search. | Implement map-based parallel research. |
| #15 Design View | LAG | Manus has visual editor overlay; ours is placeholder UI. | Requires Management UI integration. |
| #16 Manus Slides | LAG | Manus has full slide authoring; ours delegates to Forge API. | Implement native slide editor. |
| #27 Full-Stack Web-App Creation | LAG | Manus creates full webdev projects; ours creates task-scoped apps. | Expand webapp builder scope. |
| #42 App Publishing (Mobile) | LAG | Manus has native mobile publishing; ours is web-only. | Owner-blocked: requires app store accounts. |

## Summary

**EXCEED count:** 8
**MATCH count:** 44
**LAG count:** 10
**N/A:** 5

**EXCEED rate:** 8/62 = 12.9% (target: ≥30% per §L.15)

**Last updated:** 2026-04-22 Session 4
