# SPEC_DRIFT_BACKLOG — manus-next-app

> Tracks specification drift between Manus platform and our implementation.

## Current Drift Items

| Item | Severity | Status | Notes |
|---|---|---|---|
| No drift detected | N/A | CLEAN | All platform APIs match current implementation |

## Historical Drift (Resolved)

| Date | Item | Resolution |
|---|---|---|
| 2026-04-22 | tRPC batch response format | E2E test updated to handle array responses |
| 2026-04-22 | Cookie sameSite for Playwright | Changed from None to Lax for localhost |

## Monitoring

Spec drift is checked during each convergence pass via MANUS_SPEC_WATCH_LOG.
Next scheduled review: 2026-04-29
