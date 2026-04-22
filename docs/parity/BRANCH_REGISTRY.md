# Branch Registry (§L.38)

**Created:** 2026-04-22T10:55:00Z
**Purpose:** Named branches with status (active / merged / converged / pruned), max 3 active enforced.

## Active Branches

| Branch | Status | Created | Last Activity | Purpose |
|--------|--------|---------|---------------|---------|
| main | ACTIVE | 2026-04-17 | 2026-04-22T06:20Z | Primary development branch — all work committed here |

## Branch History

This project uses a single-branch workflow (main only). All 115 commits are on main. No feature branches have been created because:

1. The project is single-developer (agent-driven with owner review)
2. The webdev_save_checkpoint tool commits directly to main
3. Rollback is handled via webdev_rollback_checkpoint, not branch revert
4. The GitHub integration syncs main automatically

## Branch Policy

Per §L.38: max 3 active branches enforced. Current count: 1/3. No branch creation needed — the convergence loop operates on main with checkpoint-based rollback as the safety mechanism.

## Divergence Budget

Per v4 universal optimization: divergence budget = floor(T_initial × 10) = floor(0.70 × 10) = 7 divergent passes allowed.

| Metric | Value |
|--------|-------|
| Starting temperature | 0.70 |
| Divergence budget | 7 passes |
| Divergent passes used | 2 (Phase 13 new caps + v9 artifact creation) |
| Remaining budget | 5 |
