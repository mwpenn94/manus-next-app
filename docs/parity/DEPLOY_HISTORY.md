# Deploy History — §L.30

> Per-project deploy log with rollback markers.
> Every deploy is recorded with verification status per §L.29.

## Deploy Pipeline Status

| Phase | Status | Notes |
|-------|--------|-------|
| **A — GitHub Repo** | Active | Connected via `user_github` remote; auto-sync on checkpoint |
| **B — Code Commit** | Active | Every `webdev_save_checkpoint` commits + pushes to GitHub |
| **C — CI Build** | Partial | Manus platform builds on publish; GitHub Actions not yet configured |
| **D — Subdomain Deploy** | Active | Auto-deployed to `*.manus.space` on publish |
| **E — Custom Domain** | Available | Configurable via Settings > Domains in Management UI |
| **F — Monitoring** | Active | Manus Analytics (UV/PV) + built-in health checks |
| **G — Mobile** | PWA-ready | Service worker + manifest.json deployable via Phase D |
| **H — Rollback** | Active | `webdev_rollback_checkpoint` restores any prior version |

## Deploy Log

| # | Timestamp | Version ID | Commit SHA | Type | Verification | Rollback Marker |
|---|-----------|-----------|------------|------|-------------|-----------------|
| 1 | 2026-04-21 | 5126f702 | — | checkpoint | Platform-verified | Yes |

> Each `webdev_save_checkpoint` creates a new deploy-eligible version. Publishing is done via the Management UI "Publish" button.

## Rollback History

| # | Timestamp | From Version | To Version | Reason | Verification |
|---|-----------|-------------|-----------|--------|-------------|
| — | — | — | — | No rollbacks yet | — |

## Verification Protocol (per §L.29)

Every deploy claim requires:

1. **HTTPS GET verification**: Fetch the deployed URL, confirm HTTP 200 with expected content
2. **Content-match**: Response body contains expected markers (app title, version header)
3. **External verification**: Fetch from a different network/resolver to bypass CDN cache
4. **Side-effect log**: Record verification result in `SIDE_EFFECT_VERIFICATIONS.md`

## Subdomain Pattern

The current deployment uses the Manus platform's subdomain pattern:

```
<project-slug>.manus.space
```

Custom domains can be configured via Settings > Domains in the Management UI, supporting:
- Auto-generated prefix modification (e.g., `sovereign-ai.manus.space`)
- Domain purchase directly within Manus
- External domain binding with DNS configuration guidance
