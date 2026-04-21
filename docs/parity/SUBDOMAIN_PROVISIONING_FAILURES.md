# Subdomain Provisioning Failures — §L.30

> DNS/cert provisioning issues log.
> Target: Zero unresolved provisioning failures.

## Current Provisioning Status

| Component | Status | Provider |
|-----------|--------|----------|
| Subdomain | Active | Manus Platform (`*.manus.space`) |
| TLS/SSL | Auto-provisioned | Manus Platform |
| DNS | Managed | Manus Platform |
| Custom domain | Available | User-configurable via Settings > Domains |

## Failure Log

| # | Timestamp | Domain | Error | Resolution | Duration |
|---|-----------|--------|-------|-----------|----------|
| — | — | — | — | No provisioning failures recorded | — |

## Failover Chain (per §L.25 + §L.30)

If the primary subdomain provisioning fails:

| Priority | Provider | Method | Cost |
|----------|---------|--------|------|
| 1 | Manus Platform | Built-in `*.manus.space` | $0 |
| 2 | Cloudflare Pages | DNS API + Pages deploy | $0 (free tier) |
| 3 | Vercel | Platform-native subdomain | $0 (hobby tier) |
| 4 | GitHub Pages | `*.github.io` subdomain | $0 |
| 5 | Railway | Platform-native subdomain | $0 (trial tier) |
