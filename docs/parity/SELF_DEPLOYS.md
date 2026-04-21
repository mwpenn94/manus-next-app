# Self-Deploys — §L.36

> Every self-initiated deploy with rollback status.
> Target: >= 5 successful self-deploys with §L.29 + §L.33 verifications passing.

## Self-Deploy Log

| # | Date | Version ID | Trigger | Changes | Tests | Verification | Rollback Available |
|---|------|-----------|---------|---------|-------|-------------|-------------------|
| 1 | 2026-04-21 | 5126f702 | Agent session | Voice pipeline + §L.35 artifacts | 1212 pass | TS compiles, tests pass | Yes |

## Self-Deploy Protocol

Each self-initiated deploy follows this sequence:

1. **Pre-deploy checks**
   - TypeScript compiles with 0 errors
   - Full test suite passes (`pnpm test`)
   - No critical console errors in dev server
   - todo.md updated with completed items

2. **Deploy action**
   - `webdev_save_checkpoint` creates versioned snapshot
   - GitHub sync pushes to `user_github` remote
   - Version ID recorded in this log

3. **Post-deploy verification**
   - Dev server restarts successfully
   - Health check passes
   - No regressions in existing functionality
   - Side-effect verification logged in `SIDE_EFFECT_VERIFICATIONS.md`

4. **Rollback readiness**
   - Previous version ID recorded
   - `webdev_rollback_checkpoint` tested and available
   - Stable channel (previous checkpoint) always accessible

## Rollback History

| # | Date | From Version | To Version | Reason | Duration | Success |
|---|------|-------------|-----------|--------|----------|---------|
| — | — | — | — | No rollbacks needed yet | — | — |

## Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Total self-deploys | 1 | >= 5 |
| Successful deploys | 1 | 100% |
| Failed deploys | 0 | 0 |
| Rollbacks executed | 0 | As needed |
| Mean deploy time | ~45s | < 60s |
| Stable channel breaks | 0 | 0 (always) |
