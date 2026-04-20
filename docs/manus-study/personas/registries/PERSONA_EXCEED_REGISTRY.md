# §L.28 PERSONA_EXCEED_REGISTRY — Persona Journey Tracking

> Tracks persona journeys where manus-next-app exceeds manus-live on user experience.
> Updated after each persona sweep.
> Per §L.28: "If any persona journey shows EXCEED on any dimension, log it here."

## Registry

| Persona ID | Journey | Dimension | manus-next-app Score | manus-live Score | Delta | Date | Sweep ID |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

*No persona sweeps executed yet. Initial sweep pending.*

## Summary

| Metric | Value |
|---|---|
| Total EXCEED entries | 0 |
| Unique personas with EXCEED | 0 |
| Unique dimensions with EXCEED | 0 |
| Last updated | 2026-04-20 (bootstrap) |

## LAG Registry (persona journeys where manus-next-app lags)

| Persona ID | Journey | Dimension | manus-next-app Score | manus-live Score | Delta | Date | Sweep ID | Remediation |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

*No persona sweeps executed yet.*

## Persona Journey Definitions

Each persona has 2-3 representative journeys derived from their key tasks. Journeys are defined in `journeys/` directory.

### Journey Template

```
Journey ID: PXX-JY
Persona: [Name]
Scenario: [What the user is trying to accomplish]
Entry point: [Where they start — home page, direct URL, mobile app]
Steps: [Numbered sequence of user actions]
Success criteria: [What constitutes a successful journey]
Accessibility requirements: [Specific to this persona's needs]
Benchmark tasks exercised: [TASK-XXX references]
```

## Sweep History

| Sweep # | Date | Personas Tested | Journeys Run | EXCEED | MATCH | LAG | Notes |
|---|---|---|---|---|---|---|---|
| 0 | 2026-04-20 | 0 | 0 | 0 | 0 | 0 | Bootstrap — infrastructure created |
