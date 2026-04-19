# INFRA_DECISIONS — Infrastructure Architecture Decisions

> Documents all infrastructure choices, rationale, and migration paths per §L.8.

---

## Current Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Hosting | Manus Platform | Zero-config deployment, built-in CDN, SSL, analytics |
| Database | TiDB (MySQL-compatible) | Managed by Manus, auto-scaling, serverless via Drizzle ORM |
| Auth | Manus OAuth | Built-in, zero-config, session cookies, RBAC |
| Storage | S3 (Manus-managed) | Pre-configured helpers, public URLs |
| LLM | Manus Forge API | Built-in, no API key management needed |
| Image Gen | Manus ImageService | Built-in, integrated with Forge API |
| Voice STT | Whisper via Manus | Built-in transcription helper |
| Analytics | Manus Analytics | Built-in UV/PV tracking |
| CI/CD | Manus Checkpoints | Save/rollback via Management UI |
| Domain | manus.space subdomain | Auto-generated, custom domain available |

## Spec-Recommended Stack (v8.3 §L.8)

| Layer | Recommended | Status | Migration Path |
|-------|------------|--------|---------------|
| Hosting | Cloudflare Pages + Railway | DEFERRED | See ADR-001 |
| Database | PlanetScale/Neon | DEFERRED | TiDB is MySQL-compatible, migration straightforward |
| Auth | Clerk | DEFERRED | See ADR-002 |
| Storage | Cloudflare R2 | DEFERRED | S3-compatible, swap endpoint only |
| Monitoring | Posthog + Sentry | DEFERRED | See ADR-003 |
| Payments | Stripe | DEFERRED | Use `webdev_add_feature` when ready |
| Cache | Upstash Redis | DEFERRED | See ADR-004 |

## Decision: Stay on Manus Platform

The current Manus platform provides equivalent functionality to the spec-recommended stack with significantly lower operational complexity. Migration is deferred until one of these triggers occurs:

1. **Scale trigger:** Traffic exceeds Manus platform limits
2. **Feature trigger:** A capability requires infrastructure not available on Manus (e.g., WebSocket for real-time collab)
3. **Cost trigger:** Manus platform costs exceed self-hosted equivalent
4. **Independence trigger:** Owner decides to decouple from Manus platform

All migration paths are documented. The codebase uses abstraction layers (tRPC, S3 helpers, env vars) that make migration a configuration change, not a rewrite.

---

## ADR-001: Hosting — Manus vs Cloudflare+Railway

**Context:** The spec recommends Cloudflare Pages (static) + Railway (server) for hosting.

**Decision:** Stay on Manus Platform.

**Rationale:**
- Manus provides equivalent CDN, SSL, and deployment capabilities
- Zero-config deployment reduces operational burden
- Built-in analytics, domain management, and version control
- Migration cost: ~4 hours (Dockerfile for Railway, wrangler.toml for CF Pages)

**Consequences:**
- Cannot use Cloudflare Workers for edge compute
- Cannot use Railway's persistent volumes
- Dependent on Manus platform availability

---

## ADR-002: Auth — Manus OAuth vs Clerk

**Context:** The spec recommends Clerk for authentication with social logins, MFA, and user management.

**Decision:** Stay on Manus OAuth.

**Rationale:**
- Manus OAuth provides login/logout, session management, and RBAC
- Clerk adds: social logins (Google, GitHub), MFA, user management dashboard
- Current app doesn't require social logins or MFA
- Migration cost: ~8 hours (install @clerk/express, replace auth middleware, update frontend)

**Consequences:**
- No social login options (Google, GitHub, etc.)
- No MFA support
- No self-service password reset
- User management via database only (no Clerk dashboard)

---

## ADR-003: Monitoring — Built-in vs Posthog+Sentry

**Context:** The spec recommends Posthog (analytics) + Sentry (error tracking).

**Decision:** Use Manus Analytics for now, add Sentry when error volume justifies it.

**Rationale:**
- Manus Analytics provides UV/PV tracking
- Sentry adds: error tracking, performance monitoring, session replay
- Current error volume is low (clean browser console)
- Migration cost: ~2 hours (install @sentry/react, add DSN, wrap error boundary)

**Consequences:**
- No detailed error tracking with stack traces
- No performance monitoring (Web Vitals)
- No session replay for debugging

---

## ADR-004: Cache — None vs Upstash Redis

**Context:** The spec recommends Upstash Redis for caching and rate limiting.

**Decision:** No cache layer for now.

**Rationale:**
- Current response times are acceptable
- Database queries are simple and fast
- Rate limiting handled by Manus platform
- Migration cost: ~3 hours (install @upstash/redis, add cache middleware)

**Consequences:**
- No server-side caching of LLM responses
- No rate limiting beyond platform defaults
- No session store (using JWT cookies instead)

---

## ADR-005: Package Architecture — Monolith vs Packages

**Context:** The spec calls for 13 `@mwpenn94/manus-next-*` packages published to npm.

**Decision:** Monolith with extraction-ready boundaries.

**Rationale:**
- Packages don't exist on npm yet
- All code lives in the monolith with clear module boundaries
- TypeScript interfaces defined for future extraction (ManusNextChat types)
- Package extraction documented in REUSABILITY_SCAFFOLD.md

**Consequences:**
- No npm packages published
- No independent versioning of components
- All code ships as one deployment unit

---

## ADR-006: Scheduler — Polling vs Job Queue

**Context:** Scheduled tasks need a reliable execution mechanism.

**Decision:** setInterval polling with 60s interval.

**Rationale:**
- Simple, no additional infrastructure needed
- Race condition guard prevents concurrent executions
- Error throttling (1 log per 10 minutes) prevents log spam
- Production upgrade path: BullMQ + Redis

**Consequences:**
- Maximum 60s delay between schedule and execution
- No retry with backoff on failure
- No distributed locking for multi-instance deployment

---

## ADR-007: LLM Routing — 3-Tier Mode

**Context:** The spec calls for Speed/Quality/Max mode routing.

**Decision:** 3-tier mode with distinct parameters.

**Implementation:**
- Speed: temperature 0.3, 4 tool turns, concise system prompt
- Quality: temperature 0.7, 8 tool turns, thorough system prompt
- Max: temperature 0.8, 12 tool turns, comprehensive system prompt

**Rationale:**
- Maps directly to user expectations (fast vs thorough)
- Uses single LLM endpoint with parameter variation
- Production upgrade: distinct model selection per tier

---

## Pricing Verification (as of April 2026)

| Service | Free Tier | Paid Tier | Monthly Estimate |
|---------|-----------|-----------|-----------------|
| Cloudflare Pages | 500 builds/mo | $20/mo (Pro) | $0-20 |
| Railway | $5 credit | $0.01/hr (Hobby) | $5-20 |
| Clerk | 10K MAU | $0.02/MAU | $0-50 |
| PlanetScale | 5GB, 1B reads | $29/mo (Scaler) | $0-29 |
| Upstash Redis | 10K cmd/day | $0.2/100K cmd | $0-10 |
| Posthog | 1M events | $0.00031/event | $0-30 |
| Sentry | 5K errors | $26/mo (Team) | $0-26 |
| **Total** | | | **$5-185/mo** |

Current Manus Platform cost: **$0** (included with Manus subscription).

---

## Guest Exploration

Per project knowledge base: users should access the app without gate. Current implementation shows empty state for unauthenticated users with login CTA. Authenticated users get full functionality.
