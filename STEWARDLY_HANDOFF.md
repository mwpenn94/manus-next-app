# Stewardly Handoff — Manus Next

This document provides a comprehensive handoff guide for anyone taking over development or maintenance of the Manus Next platform.

---

## Platform Overview

Manus Next is a sovereign AI agent platform that provides Manus-equivalent (or better) functionality as a self-hosted web application. It features a conversational AI interface with multi-tool agentic execution, persistent memory, task scheduling, session replay, and a full ecosystem of connectors, skills, and creative tools.

---

## Architecture Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Tailwind 4 + shadcn/ui | 25+ pages, wouter routing |
| Backend | Express 4 + tRPC 11 | 27 routers, SSE streaming |
| Database | MySQL/TiDB + Drizzle ORM | Schema in `drizzle/schema.ts` |
| Auth | Manus OAuth | JWT sessions, cookie-based |
| Payments | Stripe | Checkout, webhooks, subscriptions |
| LLM | Built-in Forge API | `invokeLLM()` helper |
| Storage | S3 | `storagePut()` / `storageGet()` |
| Desktop | Electron companion | WebSocket bridge |

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `server/routers.ts` | All tRPC procedures (1832 lines, 27 routers) |
| `server/agentStream.ts` | SSE agent loop with anti-premature-completion |
| `server/agentTools.ts` | 14 tool definitions and executors |
| `server/db.ts` | Database query helpers |
| `server/stripe.ts` | Stripe payment integration |
| `server/products.ts` | Product/pricing definitions |
| `server/scheduler.ts` | Server-side task scheduler |
| `server/memoryExtractor.ts` | LLM-powered memory extraction |
| `client/src/App.tsx` | Route definitions (54 routes) |
| `client/src/components/AppLayout.tsx` | Main layout with sidebar |
| `client/src/pages/TaskView.tsx` | Agent chat interface |
| `client/src/pages/Home.tsx` | Landing page with suggestions |
| `drizzle/schema.ts` | Database schema definitions |
| `server/_core/index.ts` | Server entry point with security middleware |

---

## Security Posture

The platform has been hardened with:

1. **Helmet** — 10 security headers (CSP, HSTS, X-Frame-Options, etc.)
2. **Rate limiting** — 200/min API, 30/min uploads, 20/min streams
3. **Auth guards** — File upload and SSE stream endpoints require authentication
4. **Zod validation** — 281 input validations across all tRPC procedures
5. **JWT sessions** — HS256 signed, httpOnly, SameSite cookies
6. **Stripe webhook verification** — Signature validation on all webhook events

---

## Agent Behavior Fixes

Three critical agent behavior issues were identified and fixed:

1. **Creative task completion** — Agent now completes creative tasks (guides, stories, plans) instead of stopping after web search
2. **Anti-premature-completion** — Agent loop detects when LLM falsely claims completion without producing deliverable
3. **Deflection detection** — Agent loop detects when LLM deflects to search results instead of generating original content

These fixes are in `server/agentStream.ts` (system prompt rules + loop continuation logic).

---

## Testing

- **246 tests** across 14 test files
- Run with `pnpm test`
- Key test files:
  - `server/routers.test.ts` — Router procedure tests
  - `server/stream.test.ts` — Agent streaming + anti-premature-completion
  - `server/stripe.test.ts` — Stripe integration
  - `server/agentTools.test.ts` — Tool execution
  - `server/parity.test.ts` — Manus parity checks

---

## Known Limitations

1. **Large files** — `routers.ts` (1832 lines), `TaskView.tsx` (1815 lines), `agentTools.ts` (1732 lines) could benefit from splitting
2. **`any` types** — 29 occurrences in business logic, mostly in catch blocks (standard TypeScript pattern)
3. **Connector OAuth** — Requires real OAuth credentials to test end-to-end; API key fallback works
4. **Electron companion** — Requires desktop environment to fully test; WebSocket bridge verified

---

## Deployment

The platform is deployed via Manus hosting. To publish:

1. Save a checkpoint: `webdev_save_checkpoint`
2. Click the Publish button in the Management UI
3. Stripe test sandbox must be claimed at the provided URL before expiry

---

## Environment Variables

All environment variables are managed through `webdev_request_secrets`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL/TiDB connection |
| `JWT_SECRET` | Session signing |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend Stripe key |
| `BUILT_IN_FORGE_API_KEY` | LLM API access |
| `OAUTH_SERVER_URL` | Manus OAuth backend |

---

## Maintenance Checklist

- [ ] Run `pnpm test` before any deployment
- [ ] Run `npx tsc --noEmit` to verify type safety
- [ ] Check `todo.md` for any remaining items
- [ ] Review `assessment-findings.md` for known issues
- [ ] Verify Stripe webhook endpoint responds to test events
- [ ] Check rate limiting is active (`curl -I` should show rate limit headers)
- [ ] Verify security headers are present (`curl -I` should show helmet headers)
