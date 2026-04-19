# OSS_FALLBACKS — manus-next-app

> Per §L.19 freemium-first protocol: every paid service in the stack must have a documented open-source or free-tier fallback. This ensures the project can operate at zero marginal cost during development and early adoption.

---

## Authentication

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| Clerk ($25/mo+) | Manus OAuth (current) | ACTIVE | Zero cost; built into Manus platform. Provides user management, session cookies, and role-based access. |
| Clerk ($25/mo+) | Lucia Auth (OSS) | DOCUMENTED | MIT-licensed, framework-agnostic auth library. Supports session management, OAuth providers, and database adapters. |
| Auth0 ($23/mo+) | Keycloak (OSS) | DOCUMENTED | Apache 2.0. Self-hosted identity provider with OAuth2/OIDC. Enterprise-grade but requires server resources. |

## Database

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| PlanetScale ($39/mo+) | Manus TiDB (current) | ACTIVE | Zero cost; built into Manus platform. MySQL-compatible, managed. |
| PlanetScale ($39/mo+) | SQLite + Turso (free tier) | DOCUMENTED | Turso offers 9GB free tier with edge replication. LibSQL is OSS fork of SQLite. |
| Neon ($19/mo+) | PostgreSQL self-hosted | DOCUMENTED | Zero cost on own infrastructure. Drizzle ORM supports PostgreSQL natively. |

## Hosting

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| Cloudflare Pages ($20/mo+) | Manus hosting (current) | ACTIVE | Zero cost; built into Manus platform. Includes CDN, SSL, custom domains. |
| Railway ($5/mo+) | Fly.io (free tier) | DOCUMENTED | 3 shared VMs free. Supports Docker containers. |
| Vercel ($20/mo+) | Coolify (OSS) | DOCUMENTED | Self-hosted Vercel alternative. MIT license. Supports Node.js, Docker. |

## Caching

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| Upstash Redis ($10/mo+) | In-memory Map cache | ACTIVE | Zero cost; server-side JavaScript Map with TTL. Sufficient for single-instance deployment. |
| Upstash Redis ($10/mo+) | Redis self-hosted (OSS) | DOCUMENTED | BSD license. Zero cost on own infrastructure. |
| Upstash Redis ($10/mo+) | Dragonfly (OSS) | DOCUMENTED | BSL license. Redis-compatible, 25x throughput improvement. |

## Analytics

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| PostHog ($0-450/mo) | Umami (OSS) | DOCUMENTED | MIT license. Privacy-focused, self-hosted. GDPR compliant. |
| Mixpanel ($25/mo+) | Plausible (OSS) | DOCUMENTED | AGPL license. Lightweight, cookie-free analytics. |
| Google Analytics (free but privacy concerns) | Manus Analytics (current) | ACTIVE | Built-in via VITE_ANALYTICS_ENDPOINT. |

## Error Tracking

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| Sentry ($26/mo+) | GlitchTip (OSS) | DOCUMENTED | MIT license. Sentry-compatible API. Self-hosted. |
| Sentry ($26/mo+) | Console error logging (current) | ACTIVE | Zero cost; errors logged to server console and streamed to client via SSE error events. |
| Bugsnag ($59/mo+) | Highlight.io (OSS) | DOCUMENTED | Apache 2.0. Full-stack error monitoring with session replay. |

## Monitoring

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| UptimeRobot ($7/mo+) | Uptime Kuma (OSS) | DOCUMENTED | MIT license. Self-hosted monitoring with notifications. |
| Datadog ($15/mo+) | Grafana + Prometheus (OSS) | DOCUMENTED | Apache 2.0. Industry-standard observability stack. |

## Payments

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| Stripe (2.9% + $0.30/txn) | LemonSqueezy (lower fees) | DOCUMENTED | Merchant of record model. Handles tax compliance. |
| Stripe (2.9% + $0.30/txn) | Paddle (lower fees) | DOCUMENTED | Alternative MoR with global tax handling. |
| N/A | No payment processing | ACTIVE | Current deployment has no paid features. Freemium model. |

## LLM API

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| OpenAI API ($varies) | Manus invokeLLM (current) | ACTIVE | Zero cost; built into Manus platform. Abstracts model selection. |
| OpenAI API ($varies) | Ollama + local models (OSS) | DOCUMENTED | MIT license. Run Llama, Mistral, etc. locally. Zero API cost. |
| Anthropic API ($varies) | LM Studio (free) | DOCUMENTED | Free local inference. Supports GGUF models. |

## File Storage

| Paid Service | OSS/Free Fallback | Status | Notes |
|-------------|-------------------|--------|-------|
| AWS S3 ($0.023/GB/mo) | Manus S3 (current) | ACTIVE | Zero cost; built into Manus platform via storagePut/storageGet. |
| AWS S3 ($0.023/GB/mo) | MinIO (OSS) | DOCUMENTED | AGPL license. S3-compatible. Self-hosted. |
| Cloudflare R2 ($0.015/GB/mo) | Garage (OSS) | DOCUMENTED | AGPL license. S3-compatible distributed storage. |

---

## Summary

| Category | Current (Zero Cost) | Migration Fallback |
|----------|--------------------|--------------------|
| Auth | Manus OAuth | Lucia Auth |
| Database | Manus TiDB | SQLite + Turso |
| Hosting | Manus hosting | Fly.io / Coolify |
| Caching | In-memory Map | Redis / Dragonfly |
| Analytics | Manus Analytics | Umami / Plausible |
| Error Tracking | Console logging | GlitchTip |
| Monitoring | N/A | Uptime Kuma |
| Payments | None needed | LemonSqueezy |
| LLM | Manus invokeLLM | Ollama |
| Storage | Manus S3 | MinIO |

**Total current monthly cost: $0.00** — All services use Manus platform built-ins or zero-cost alternatives.
