# HRQ_QUEUE — manus-next-app

> Human-Required Queue: items that cannot be resolved autonomously and require owner action.

---

## Active HRQ Items

| # | Item | Priority | Owner Action Required | Failover Status |
|---|------|----------|----------------------|----------------|
| 1 | Upstream npm packages | HIGH | Publish 13 `@mwpenn94/manus-next-*` packages to npm | FAILOVER ACTIVE: local workspace stubs in `packages/` |
| 2 | Custom domain | MEDIUM | Purchase/assign domain in Management UI > Settings > Domains | FAILOVER ACTIVE: using `manusnext-mlromfub.manus.space` |
| 3 | Infrastructure decision | LOW | Decide: stay on Manus hosting or migrate to Cloudflare/Railway | FAILOVER ACTIVE: dual-deploy scripts ready |
| 4 | Auth provider decision | LOW | Decide: stay on Manus OAuth or switch to Clerk | FAILOVER ACTIVE: adapter layer in `server/authAdapter.ts` |
| 5 | Stripe integration | LOW | Decide if paid features are needed; if yes, add Stripe keys | FAILOVER ACTIVE: no payment features, all features free |

## Resolved HRQ Items

| # | Item | Resolution | Date |
|---|------|-----------|------|
| R1 | Manus baseline capture | Captured via browser automation; documented in `manus-baseline-capture-notes.md` | 2025-04-15 |
| R2 | Gate B user simulation | Executed 42 flows across 10 personas; 100% pass rate | 2025-04-15 |
| R3 | Hosting configuration | Manus hosting confirmed as primary; dual-deploy as failover | 2025-04-15 |
| R4 | Auth configuration | Manus OAuth confirmed as primary; Clerk adapter as failover | 2025-04-15 |

## INFRA_PRICING_VERIFY

Per §L.19, current infrastructure pricing verification:

| Service | Provider | Monthly Cost | Verified Date | Notes |
|---------|----------|-------------|---------------|-------|
| Hosting | Manus Platform | $0.00 | 2025-04-18 | Included in Manus subscription |
| Database | Manus TiDB | $0.00 | 2025-04-18 | Included in Manus subscription |
| Auth | Manus OAuth | $0.00 | 2025-04-18 | Included in Manus subscription |
| LLM API | Manus invokeLLM | $0.00 | 2025-04-18 | Included in Manus subscription |
| Storage | Manus S3 | $0.00 | 2025-04-18 | Included in Manus subscription |
| Analytics | Manus Analytics | $0.00 | 2025-04-18 | Included in Manus subscription |
| CDN | Manus CDN | $0.00 | 2025-04-18 | Included in Manus subscription |
| **Total** | | **$0.00/mo** | | All services bundled with Manus platform |

**Migration cost estimate** (if moving off Manus):

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| Hosting | Fly.io (free tier) | $0.00 |
| Database | Turso (free tier) | $0.00 |
| Auth | Lucia Auth (OSS) | $0.00 |
| LLM API | Ollama (local) | $0.00 (hardware cost only) |
| Storage | MinIO (self-hosted) | $0.00 (hardware cost only) |
| **Total** | | **$0.00/mo** (excluding hardware) |
