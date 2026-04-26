# Decision Record

Tracks all branch decisions, resolutions, and deferred items across the parity optimization loop.

## Schema

Each entry: `{branch_id, status, rationale, decided_at_pass, decided_at_timestamp, re_explore_after_date, superseded_by}`

## Construction-Time Decisions (from MANUS-PARITY-PLUS-LOOP v1.1)

| Branch ID | Status | Rationale | Decided At | Re-explore After |
|---|---|---|---|---|
| B1 | pruned | 5-axis MIN with Evolution Velocity — redundant with re-entry trigger 1 + STATE.json drift_log; aggregator complexity without proportional signal | construction | N/A |
| B2 | pruned | 7-day timer floor — 14-day rhythm aligns with product-release cycles; halving would not improve drift detection materially | construction | N/A |
| B3 | deferred | Continuous Synthesis — interesting but premature; revisit after Run #1 if pass-end Synthesis is observed as bottleneck empirically | construction | post-Cycle-3 retrospective |

## Cycle Decisions

*No cycle decisions recorded yet. Entries will be appended as branches are created and resolved during Phase B passes.*
