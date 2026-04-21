# Stable Channel Snapshots — §L.36

> Rollback-targets registry.
> The stable channel is always accessible and never broken by self-deploys.

## Current Stable Channel

| Property | Value |
|----------|-------|
| **Version ID** | 5126f702 |
| **Date** | 2026-04-21 |
| **Tests passing** | 1212/1212 |
| **TypeScript errors** | 0 |
| **Known issues** | JSON parse error (fixed in next checkpoint) |
| **Rollback command** | `webdev_rollback_checkpoint` with version ID |

## Snapshot Registry

| # | Version ID | Date | Tests | TS Errors | Promoted From | Notes |
|---|-----------|------|-------|-----------|--------------|-------|
| 1 | 5126f702 | 2026-04-21 | 1212 pass | 0 | Development | Pre-voice-pipeline stable baseline |

## Promotion Criteria

A development checkpoint is promoted to stable channel when:

1. **All tests pass**: `pnpm test` returns 0 failures
2. **TypeScript compiles**: `tsc --noEmit` returns 0 errors
3. **No critical console errors**: Dev server logs show no unhandled exceptions
4. **No regressions**: All previously-working features still work
5. **Side-effect verified**: At least one independent verification per `SIDE_EFFECT_VERIFICATIONS.md`

## Rollback Protocol

If a self-deploy breaks the stable channel:

1. **Immediate**: `webdev_rollback_checkpoint` to the latest stable snapshot
2. **Verify**: Confirm stable version is serving correctly
3. **Investigate**: Diagnose what broke in the failed deploy
4. **Fix**: Apply fix and re-test before attempting another deploy
5. **Log**: Record the incident in `SELF_DEPLOYS.md` rollback history

## Stable Channel Guarantee

> The stable channel MUST always be accessible. If a self-deploy breaks the app, rollback is automatic and immediate. Users never see a broken state from self-development activity.

This guarantee is enforced by:
- Checkpoint system provides instant rollback to any prior version
- Self-deploys are always preceded by a checkpoint save
- Post-deploy verification catches regressions before users are affected
- The Manus platform's publish flow requires explicit user action (not auto-published by agent)
