# STEWARDLY_HANDOFF — manus-next-app

> Handoff readiness assessment: what a new developer or AI agent needs to continue this project without the original builder present.

---

## Handoff Readiness: READY

The project is handoff-ready for maintenance, feature development, and deployment. Infrastructure migration and upstream package publishing require owner decisions.

---

## What Works Without Guidance

| Area | Status | Entry Point |
|------|--------|-------------|
| Local development | Ready | `pnpm install && pnpm dev` — starts Vite + Express on auto-assigned port |
| Database schema changes | Ready | Edit `drizzle/schema.ts` then `pnpm db:push` |
| Adding new agent tools | Ready | Add tool definition + executor in `server/agentTools.ts`, register in `AGENT_TOOLS` array (currently 14 tools) |
| Adding new tRPC procedures | Ready | Add to `server/routers.ts`, consume via `trpc.*` hooks (currently 25 router namespaces) |
| Adding new pages | Ready | Create in `client/src/pages/`, register route in `App.tsx` (currently 21 pages) |
| Running tests | Ready | `pnpm test` — 166 tests across 11 files |
| TypeScript checking | Ready | `npx tsc --noEmit` — 0 errors |
| Deployment | Ready | Manus platform auto-deploys on checkpoint. Click Publish in Management UI. |
| Stripe payments | Ready | Sandbox provisioned, webhook handler at `/api/stripe/webhook`, fulfillment persists IDs to users table |

## What Requires Owner Decisions

| Area | Blocker | Decision Needed |
|------|---------|----------------|
| Upstream packages | 13 stubs in `packages/` with `@mwpenn94` scope | Owner must publish to npm or decide on alternative distribution |
| Infrastructure migration | Dual-deploy scripts ready (`scripts/deploy.mjs`) | Owner must decide: stay on Manus hosting or migrate to Cloudflare/Railway |
| Auth migration | Clerk adapter in `server/authAdapter.ts` | Owner must decide: stay on Manus OAuth or switch to Clerk |
| Domain | Currently on Manus hosting | Owner must configure custom domain via Management UI > Settings > Domains |
| Stripe activation | Test sandbox provisioned | Owner must claim at Stripe dashboard URL before expiry |

## Key Architecture Decisions

All major decisions are documented in `docs/parity/AFK_DECISIONS.md` and `docs/parity/INFRA_DECISIONS.md`. Summary of non-obvious choices:

1. **Agent streaming uses SSE, not WebSocket.** SSE is simpler, works through all proxies, and supports the unidirectional data flow our agent needs.

2. **Tools are defined as a static array, not dynamically loaded.** Per Manus Principle 2 (Mask, Don't Remove), changing tool definitions mid-conversation degrades LLM performance.

3. **Auth uses an adapter pattern.** `server/authAdapter.ts` abstracts Manus OAuth vs Clerk.

4. **File storage uses S3 exclusively.** No files stored in the database. `storagePut` returns URLs; metadata stored in DB.

5. **MAX_TOOL_TURNS is mode-dependent.** Quality=20, Speed=8, Max=25. Configurable in `server/agentStream.ts`.

6. **Stripe webhook fulfillment is real.** `server/stripe.ts` persists `stripeCustomerId` and `stripeSubscriptionId` to the users table on checkout.session.completed.

## File Map for New Developers

```
server/
  agentStream.ts     ← Core agent loop (SSE streaming, tool dispatch, MAX_TOOL_TURNS)
  agentTools.ts      ← 14 tool definitions + executors
  routers.ts         ← tRPC procedures (25 router namespaces: system, auth, task, file, bridge, preferences, usage, workspace, voice, llm, memory, share, schedule, replay, notification, project (with knowledge sub-router), skill, slides, connector, meeting, team, webapp, design, payment)
  db.ts              ← Database query helpers (50+ functions)
  stripe.ts          ← Stripe checkout + webhook + fulfillment
  products.ts        ← Stripe product definitions
  storage.ts         ← S3 file operations

client/src/
  pages/Home.tsx            ← Landing page with task input
  pages/TaskView.tsx        ← Main task execution UI
  pages/Settings.tsx        ← Settings and capability status
  pages/SkillsPage.tsx      ← Skills management
  pages/SlidesPage.tsx      ← Slide deck generation
  pages/DesignView.tsx      ← Design canvas with AI generation + S3 export
  pages/MeetingsPage.tsx    ← Meeting notes from transcripts
  pages/ConnectorsPage.tsx  ← Integration connectors
  pages/WebAppBuilderPage.tsx ← Prompt-to-app builder with publishing
  pages/TeamPage.tsx        ← Team management, invites, shared sessions
  pages/ComputerUsePage.tsx ← Virtual desktop environment
  pages/FigmaImportPage.tsx ← Figma URL → React/Tailwind code
  pages/DesktopAppPage.tsx  ← Tauri config generator
  pages/MessagingAgentPage.tsx ← Messaging platform webhook bridge
  pages/BillingPage.tsx     ← Stripe checkout + usage
  components/               ← Reusable UI (ManusNextChat, AppLayout, FeedbackWidget, etc.)

drizzle/schema.ts    ← All database tables (23 tables)
docs/parity/         ← Spec compliance tracking (40+ files)
docs/manus-study/    ← Manus design research
packages/            ← 13 upstream package stubs
```

## Known Technical Debt

1. **TaskView.tsx is large.** Should be split into sub-components (MessageList, ToolPanel, InputArea).
2. **No E2E tests.** Only unit tests via Vitest. Playwright E2E recommended.
3. **i18n implemented (English + Spanish).** react-intl with 80+ keys per locale. Additional locales (French, etc.) planned but not yet added.
4. **5 RED capabilities blocked on external infrastructure.** See PARITY_BACKLOG.md for details.
5. **ComputerUsePage uses client-side simulation.** Real sandboxed execution would require a container runtime.

## Emergency Procedures

| Scenario | Action |
|----------|--------|
| Published site crashes | Roll back to previous checkpoint via Management UI > Version History |
| Database corruption | Database data is NOT recoverable. Keep backups. |
| Auth stops working | Check `OAUTH_SERVER_URL` and `JWT_SECRET` env vars in Management UI > Settings > Secrets |
| Agent returns errors | Check `server/agentStream.ts` error handling. Common: LLM timeout, tool execution failure. |
| Tests fail after changes | Run `npx tsc --noEmit` first to check types, then `pnpm test` for test failures. |
| Stripe webhook fails | Check Stripe Dashboard > Developers > Webhooks for delivery logs. Verify `STRIPE_WEBHOOK_SECRET` in Settings > Secrets. |
