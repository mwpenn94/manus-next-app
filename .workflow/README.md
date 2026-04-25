# Workflow Configuration

## Recursive Optimization Loop

The optimization loop is driven by `tools/recursive_optimization_toolkit.cjs`. Each pass follows this cycle:

1. `suggest` — Get the recommended pass type (LANDSCAPE, DEEP-DIVE, CONVERGENCE, POLISH)
2. Execute the pass — Make real code changes
3. `record-pass` — Log the pass results to the ledger
4. `gate` — Check if the current phase gate is met
5. `self-optimize` — Check for toolkit-level improvements

## Phase Gates

| Phase | Key Criteria |
|-------|-------------|
| A | Converged spec, expert panel approval |
| B | min_score >= 8, min_tests >= 250, 0 TS errors, clean build |
| C | All Class E founder personas validated, SLOs defined |
| D | 7-day steady-state, Class F VU operations running |

## Quality Guards

16 guards are checked on every pass. See `tools/optimization-config.json` for the full list.
