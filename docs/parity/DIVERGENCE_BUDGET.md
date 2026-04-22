# Divergence Budget

Per §L.38: divergence budget scales with starting temperature. Higher temperature allows more exploration; lower temperature constrains to refinement.

## Budget Formula

`divergence_budget = starting_temperature × 0.3`

When temperature drops below 0.2, divergence budget approaches zero, meaning only convergent refinements are permitted.

## Per-Phase Budgets

| Phase | Starting Temp | Divergence Budget | Current Temp | Remaining Budget | Status |
|-------|--------------|-------------------|--------------|-----------------|--------|
| §L.27 Benchmark | 0.60 | 0.18 | 0.15 | 0.00 | Converged |
| §L.28 Persona | 0.55 | 0.17 | 0.18 | 0.01 | Near-converged |
| §L.29 False-Positive | 0.50 | 0.15 | 0.12 | 0.00 | Converged |
| §L.30 Deploy | 0.45 | 0.14 | 0.15 | 0.00 | Converged |
| §L.31 Video Context | 0.65 | 0.20 | 0.20 | 0.02 | Active |
| §L.32 Toolkit | 0.50 | 0.15 | 0.15 | 0.00 | Converged |
| §L.33 In-App Validation | 0.55 | 0.17 | 0.18 | 0.01 | Near-converged |
| §L.34 OSS Toolkit | 0.60 | 0.18 | 0.20 | 0.02 | Active |
| §L.35 Conversational | 0.70 | 0.21 | 0.22 | 0.03 | Active |
| §L.36 Self-Dev | 0.50 | 0.15 | 0.15 | 0.00 | Converged |
| §L.37 Canonical Caps | 0.45 | 0.14 | 0.12 | 0.00 | Converged |
| §L.38 Optimization | 0.40 | 0.12 | 0.10 | 0.00 | Converged |
| §L.40 PII Detection | 0.60 | 0.18 | 0.20 | 0.02 | Active |
| §L.41 SLA/Observability | 0.65 | 0.20 | 0.22 | 0.03 | Active |
| §L.42 Sustainability | 0.70 | 0.21 | 0.25 | 0.05 | Active |
| §L.43 Multi-Provider | 0.75 | 0.23 | 0.25 | 0.06 | Active |
| §L.44 Manus-Alignment | 0.45 | 0.14 | 0.15 | 0.01 | Near-converged |
| §L.45 OSS Catalog | 0.55 | 0.17 | 0.18 | 0.02 | Active |

## Rules

1. When remaining budget reaches 0, only convergent changes allowed (bug fixes, documentation corrections, test additions)
2. Any divergent change (new feature, architectural change, scope expansion) requires budget > 0
3. Budget can be replenished by Mike's explicit direction (resets starting temperature for that phase)
4. Cross-phase budget transfers are not permitted

**Last updated:** 2026-04-22 Session 4
