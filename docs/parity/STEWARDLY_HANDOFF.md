# STEWARDLY_HANDOFF — manus-next-app

> Handoff readiness assessment: what a new developer or AI agent needs to continue this project without the original builder present.

---

## Handoff Readiness: PARTIAL

The project is handoff-ready for maintenance and feature development. It is NOT handoff-ready for infrastructure migration or upstream package publishing, which require owner decisions.

---

## What Works Without Guidance

| Area | Status | Entry Point |
|------|--------|-------------|
| Local development | Ready | `pnpm install && pnpm dev` — starts Vite + Express on auto-assigned port |
| Database schema changes | Ready | Edit `drizzle/schema.ts` then `pnpm db:push` |
| Adding new agent tools | Ready | Add tool definition + executor in `server/agentTools.ts`, register in `AGENT_TOOLS` array |
| Adding new tRPC procedures | Ready | Add to `server/routers.ts`, consume via `trpc.*` hooks |
| Adding new pages | Ready | Create in `client/src/pages/`, register route in `App.tsx` |
| Running tests | Ready | `pnpm test` — 166 tests across 11 files |
| TypeScript checking | Ready | `npx tsc --noEmit` — 0 errors |
| Deployment | Ready | Manus platform auto-deploys on checkpoint. Click Publish in Management UI. |

## What Requires Owner Decisions

| Area | Blocker | Decision Needed |
|------|---------|----------------|
| Upstream packages | 13 stubs in `packages/` with `@mwpenn94` scope | Owner must publish to npm or decide on alternative distribution |
| Infrastructure migration | Dual-deploy scripts ready (`scripts/deploy.mjs`) | Owner must decide: stay on Manus hosting or migrate to Cloudflare/Railway |
| Auth migration | Clerk adapter in `server/authAdapter.ts` | Owner must decide: stay on Manus OAuth or switch to Clerk |
| Domain | Currently `manusnext-mlromfub.manus.space` | Owner must configure custom domain if desired |
| Stripe integration | Not active | Owner must decide if paid features are needed |

## Key Architecture Decisions

All major decisions are documented in `docs/parity/AFK_DECISIONS.md` and `docs/parity/INFRA_DECISIONS.md`. Summary of non-obvious choices:

1. **Agent streaming uses SSE, not WebSocket.** SSE is simpler, works through all proxies, and supports the unidirectional data flow our agent needs. WebSocket would add complexity without benefit.

2. **Tools are defined as a static array, not dynamically loaded.** Per Manus Principle 2 (Mask, Don't Remove), changing tool definitions mid-conversation degrades LLM performance.

3. **Auth uses an adapter pattern.** `server/authAdapter.ts` abstracts Manus OAuth vs Clerk. Switching requires only changing `AUTH_PROVIDER` env var.

4. **File storage uses S3 exclusively.** No files stored in the database. `storagePut` returns URLs; metadata stored in DB.

5. **No fine-tuning or custom models.** Per Manus Principle 6, we use `invokeLLM` which abstracts the model layer. System prompts are model-agnostic.

## File Map for New Developers

```
server/
  agentStream.ts     ← Core agent loop (SSE streaming, tool dispatch)
  agentTools.ts      ← 8 tool definitions + executors
  routers.ts         ← tRPC procedures (tasks, projects, sharing, etc.)
  db.ts              ← Database query helpers
  authAdapter.ts     ← Auth provider abstraction
  storage.ts         ← S3 file operations

client/src/
  pages/Home.tsx     ← Landing page with task input
  pages/TaskView.tsx ← Main task execution UI (largest file, ~1600 lines)
  pages/Settings.tsx ← Settings and capability status
  contexts/          ← React contexts (Task, Theme, Auth)
  components/        ← Reusable UI (DashboardLayout, ManusNextChat, etc.)

drizzle/schema.ts    ← All database tables (12 tables)
docs/parity/         ← Spec compliance tracking (40+ files)
docs/manus-study/    ← Manus design research (9 files)
packages/            ← 13 upstream package stubs (not yet published)
```

## Known Technical Debt

1. **TaskView.tsx is 1600+ lines.** Should be split into sub-components (MessageList, ToolPanel, InputArea).
2. **ManusNextChat uses setTimeout placeholder.** Must be wired to real agent backend.
3. **No Storybook.** Component documentation is in code comments only.
4. **No E2E tests.** Only unit tests via Vitest. Playwright E2E recommended.
5. **No i18n.** All strings are hardcoded in English.

## Emergency Procedures

| Scenario | Action |
|----------|--------|
| Published site crashes | Roll back to previous checkpoint via Management UI > Version History |
| Database corruption | Database data is NOT recoverable. Keep backups. |
| Auth stops working | Check `OAUTH_SERVER_URL` and `JWT_SECRET` env vars in Management UI > Settings > Secrets |
| Agent returns errors | Check `server/agentStream.ts` error handling. Common: LLM timeout, tool execution failure. |
| Tests fail after changes | Run `npx tsc --noEmit` first to check types, then `pnpm test` for test failures. |
