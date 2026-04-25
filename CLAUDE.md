# CLAUDE.md — Manus Next App Intelligence Brief

> This file is the canonical entry point for any AI assistant working on this codebase.
> Read it first. Follow it always. Update it when the architecture changes.

## Project Identity

**Name:** Manus Next — Sovereign AI Agent Platform
**Stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + TiDB (MySQL-compatible)
**Node:** 22.x | **Package Manager:** pnpm | **TypeScript:** 5.9.x strict
**Auth:** Manus OAuth (cookie-based, `protectedProcedure` for gated routes)
**Theme:** Dark-first ("Warm Void"), switchable light mode

## Architecture — 4-Layer Agent Stack

```
┌─────────────────────────────────────────────┐
│  manus-next-app (Presentation + Orchestration) │
├─────────────────────────────────────────────┤
│  AEGIS Layer    — Pre/post-flight pipeline  │
│  ATLAS Layer    — Goal decomposition kernel │
│  Sovereign Layer — Multi-provider routing   │
├─────────────────────────────────────────────┤
│  LLM / Tool Use / S3 / TiDB               │
└─────────────────────────────────────────────┘
```

### AEGIS (server/services/aegis.ts)
Pre/post-flight middleware for every LLM call. Classifies tasks, checks semantic cache,
optimizes prompts, scores quality, extracts fragments and lessons for continuous improvement.
Schema: `aegis_sessions`, `aegis_quality_scores`, `aegis_cache`, `aegis_fragments`, `aegis_lessons`, `aegis_patterns`

### ATLAS (server/services/atlas.ts)
Goal decomposition kernel. Takes a high-level goal, uses LLM to decompose into a task DAG,
executes tasks with budget guards (max tokens, max cost), reflects on results.
Schema: `atlas_goals`, `atlas_plans`, `atlas_goal_tasks`

### Sovereign (server/services/sovereign.ts)
Multi-provider routing with circuit breakers. Routes LLM calls to the best available provider
based on health, cost, capability, and latency. Automatic failover on failure.
Schema: `sovereign_providers`, `sovereign_routing_decisions`, `sovereign_usage_logs`

## Key Directories

```
client/src/pages/          → 39 page components (SovereignDashboard.tsx is the agent stack UI)
client/src/components/     → Reusable UI (shadcn/ui based)
client/src/contexts/       → TaskContext, BridgeContext, ThemeContext
server/routers/            → 10 extracted router modules (task, file, bridge, preferences,
                              webappProject, branches, browser, aegis, atlas, sovereign)
server/routers.ts          → Composition root (2,545 lines, imports sub-routers)
server/services/           → AEGIS, ATLAS, Sovereign service layers
server/db.ts               → All DB helpers (Drizzle query functions)
server/_core/              → Framework plumbing (DO NOT EDIT unless extending infra)
drizzle/schema.ts          → 48 tables (945+ lines)
server/test-utils/         → readRouterSource.ts (aggregates router source for string-scanning tests)
```

## Build Loop

1. Edit schema in `drizzle/schema.ts` → run `pnpm db:push`
2. Add DB helpers in `server/db.ts`
3. Add/extend procedures in `server/routers.ts` or `server/routers/*.ts`
4. Build UI in `client/src/pages/*.tsx` using `trpc.*.useQuery/useMutation`
5. Write tests in `server/*.test.ts` → run `pnpm test`

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server (tsx watch) |
| `pnpm build` | Production build (vite + esbuild) |
| `pnpm start` | Run production server |
| `pnpm test` | Run all vitest tests |
| `pnpm check` | TypeScript type check |
| `pnpm db:push` | Generate + migrate DB schema |

## Critical Constraints

1. **Never hardcode port numbers** — the platform assigns ports dynamically
2. **Never store files in `client/public/`** — use `manus-upload-file --webdev` for static assets
3. **Never store file bytes in DB** — use S3 via `storagePut()`, store URL in DB
4. **15+ test files do raw string scanning** of router source — use `readRouterSource()` from `server/test-utils/readRouterSource.ts` when writing tests that need to inspect procedure implementations
5. **GDPR `deleteAllData`** must cover every table with a `userId` column — the GDPR test enforces this with a 8000-char body scan
6. **All timestamps** stored as UTC milliseconds (bigint) in DB, converted to local time in UI

## Testing

- 111 test files, 3,084+ tests
- Tests use vitest with the config in `vitest.config.ts`
- String-scanning tests (GDPR, false-positive-elimination, security) use `readRouterSource()` to aggregate all router sub-files
- Full suite may OOM in constrained sandboxes — run subsets: `npx vitest run server/specific.test.ts`

## Environment Variables

System-injected (never hardcode):
`DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`,
`OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`,
`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

## Style Guide

- Dark theme: OKLCH color space in CSS variables (`index.css`)
- Font: Inter (body), JetBrains Mono (code)
- Heading font: `var(--font-heading)` — Inter with tighter tracking
- shadcn/ui components for all interactive elements
- Framer Motion for animations (AnimatePresence, motion.div)
- Streamdown for markdown rendering in chat

## What NOT to Do

- Don't edit `server/_core/` unless extending framework infrastructure
- Don't add `express.json()` before the Stripe webhook route (needs raw body)
- Don't create new objects/arrays in render as tRPC query inputs (causes infinite loops)
- Don't nest `<a>` tags inside `<Link>` components
- Don't use empty string values in `<Select.Item>`
