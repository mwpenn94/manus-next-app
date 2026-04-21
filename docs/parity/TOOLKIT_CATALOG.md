# TOOLKIT_CATALOG.md — §L.32 Implementation Toolkit

**Generated:** 2026-04-21
**Scope:** T0-T6 tools + M0-M5 monitoring per §L.32

## T0 — Core Runtime

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| Node.js 22.x | Server runtime | ACTIVE | Bun 1.x |
| TypeScript 5.9 | Type safety | ACTIVE | None (required) |
| Vite 6.x | Dev server + bundler | ACTIVE | esbuild direct |
| Express 4.x | HTTP server | ACTIVE | Fastify 5.x |
| tRPC 11.x | Type-safe RPC | ACTIVE | REST + zod |

## T1 — Database & Storage

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| Drizzle ORM 0.44 | Database queries | ACTIVE | Kysely |
| TiDB (MySQL) | Primary database | ACTIVE | PlanetScale / Turso |
| AWS S3 | File storage | ACTIVE | MinIO / Cloudflare R2 |
| drizzle-kit | Schema migrations | ACTIVE | Manual SQL |

## T2 — Frontend Framework

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| React 19 | UI framework | ACTIVE | Preact |
| Tailwind CSS 4 | Styling | ACTIVE | UnoCSS |
| shadcn/ui | Component library | ACTIVE | Radix primitives |
| wouter | Routing | ACTIVE | TanStack Router |
| Framer Motion | Animations | ACTIVE | CSS animations |
| TanStack Query 5 | Data fetching | ACTIVE | SWR |

## T3 — AI & LLM

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| Manus LLM API | Chat completions | ACTIVE | OpenAI API / Ollama |
| Manus Image Gen | Image generation | ACTIVE | Stable Diffusion / DALL-E |
| Whisper API | Voice transcription | ACTIVE | Whisper.cpp local |
| edge-tts-universal | Text-to-speech | ACTIVE (AGPL!) | Piper TTS (MIT) |

## T4 — Authentication & Payments

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| Manus OAuth | User authentication | ACTIVE | Auth.js / Lucia |
| Stripe | Payment processing | ACTIVE | LemonSqueezy |
| jose | JWT handling | ACTIVE | jsonwebtoken |

## T5 — Testing & Quality

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| Vitest | Unit/integration tests | ACTIVE | Jest |
| Playwright | E2E browser tests | ACTIVE | Puppeteer |
| axe-core/react | Accessibility audit | ACTIVE | pa11y |
| license-checker | License audit | ACTIVE | licensee |
| TypeScript strict | Type checking | ACTIVE | None |

## T6 — DevOps & Deployment

| Tool | Purpose | Status | Fallback |
|------|---------|--------|----------|
| GitHub | Source control | ACTIVE | GitLab |
| Manus Hosting | Deployment | ACTIVE | Vercel / Railway |
| pnpm | Package manager | ACTIVE | npm / yarn |
| esbuild | Production bundler | ACTIVE | Rollup |

## M0 — Error Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| Console error capture | Client-side errors | ACTIVE (debug-collector.js) |
| Server error logging | Express error middleware | ACTIVE |
| tRPC error handler | API errors with codes | ACTIVE |
| Unhandled rejection handler | Promise rejections | ACTIVE |

## M1 — Performance Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| Vite HMR timing | Dev reload speed | ACTIVE |
| SSE stream timing | Agent response latency | ACTIVE |
| Core Web Vitals | LCP, FID, CLS | ACTIVE (automationContext.ts) |
| Network request logging | API call duration | ACTIVE (.manus-logs/networkRequests.log) |

## M2 — User Behavior Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| Session replay | Click/focus/navigation events | ACTIVE (.manus-logs/sessionReplay.log) |
| Analytics endpoint | UV/PV tracking | ACTIVE (VITE_ANALYTICS_ENDPOINT) |
| Feature usage | Tool invocation counts | ACTIVE (per-task tool tracking) |

## M3 — Security Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| CSRF protection | Cookie-based auth | ACTIVE (SameSite=Lax) |
| Input validation | zod schemas on all procedures | ACTIVE |
| Rate limiting | API abuse prevention | ACTIVE (per-user throttle) |
| Webhook signature verification | Stripe webhook integrity | ACTIVE |

## M4 — Availability Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| Health endpoint | Server liveness | ACTIVE (/api/health) |
| SSE keepalive | Stream connection health | ACTIVE (30s heartbeat) |
| Database connection pool | DB availability | ACTIVE (connection retry) |

## M5 — Cost Monitoring

| Monitor | What It Tracks | Status |
|---------|---------------|--------|
| LLM token counting | API cost per task | ACTIVE (usage tracking in agentStream) |
| S3 storage tracking | File storage costs | ACTIVE (per-user storage limits) |
| Stripe billing events | Revenue tracking | ACTIVE (webhook events) |

## Failover Workarounds (per §L.25)

| Failure Mode | Primary | Failover 1 | Failover 2 |
|-------------|---------|------------|------------|
| LLM API down | Manus API | Retry with backoff | Queue task for later |
| Database unreachable | TiDB | Connection pool retry | Read-only mode |
| S3 upload fails | AWS S3 | Retry 3x | Store locally + queue |
| Stripe webhook miss | Live webhook | Retry from dashboard | Manual reconciliation |
| OAuth callback fail | Redirect flow | Popup flow | Manual token entry |
| SSE stream drops | Auto-reconnect | Full page reload | Polling fallback |
| Image gen timeout | 20s timeout | Retry with simpler prompt | Placeholder image |
| Voice transcription fail | Whisper API | Retry | Manual text input |
