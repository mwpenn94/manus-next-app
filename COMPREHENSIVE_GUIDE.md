# Manus Next — Comprehensive Platform Guide

## 1. Overview

Manus Next is a sovereign AI agent platform that provides autonomous task execution through a 4-layer architecture: a presentation layer (React 19 + Tailwind 4), an AEGIS quality assurance pipeline, an ATLAS goal decomposition kernel, and a Sovereign multi-provider routing engine. The platform enables users to submit natural-language goals that are automatically decomposed, optimized, executed with tool use, and delivered as rich artifacts.

## 2. Quick Start

### Prerequisites
- Node.js 22.x
- pnpm 9.x
- Access to a TiDB/MySQL database (connection string via `DATABASE_URL`)

### Local Development
```bash
git clone <repo-url> && cd manus-next-app
pnpm install
pnpm db:push        # Migrate 48 tables to database
pnpm dev             # Start dev server on dynamic port
```

### Production Build
```bash
pnpm build           # Vite (client) + esbuild (server)
pnpm start           # NODE_ENV=production node dist/index.js
```

## 3. Architecture

### 3.1 Presentation Layer (manus-next-app)

The frontend is a single-page React 19 application with 39 page components, organized around a task-centric workflow. The sidebar lists tasks; the main area shows either the home screen (with a prompt input and suggestion cards) or a task view (with chat, workspace tabs, and artifact display).

**Key pages:**
- `/` — Home with greeting, prompt input, category-filtered suggestions
- `/task/:id` — Task view with streaming chat, workspace (browser, code, terminal), and tool execution display
- `/sovereign` — 4-layer agent stack dashboard (AEGIS, ATLAS, Sovereign panels)
- `/settings` — User preferences, system prompt, bridge configuration
- `/billing` — Usage tracking and subscription management
- `/memory` — Memory entries viewer and manager
- `/analytics` — Platform analytics dashboard

**Navigation:** Collapsible sidebar with search (⌘K), task list with status filters, and bottom utility links. Mobile: drawer-based sidebar with bottom navigation bar.

### 3.2 AEGIS Layer (Pre/Post-Flight Pipeline)

Every LLM interaction passes through AEGIS:

1. **Classify** — Determines task type (generation, analysis, conversation, code, research, creative) and complexity (trivial, simple, moderate, complex, expert)
2. **Cache Check** — Semantic cache lookup to avoid redundant LLM calls
3. **Optimize** — Prompt optimization based on classification
4. **Execute** — The actual LLM call (handled by ATLAS or direct)
5. **Quality Score** — Post-flight scoring (0-100) on relevance, completeness, accuracy, coherence, helpfulness
6. **Fragment Extraction** — Extracts reusable knowledge fragments
7. **Lesson Extraction** — Captures lessons learned for continuous improvement

**Schema:** 6 tables (`aegis_sessions`, `aegis_quality_scores`, `aegis_cache`, `aegis_fragments`, `aegis_lessons`, `aegis_patterns`)

### 3.3 ATLAS Layer (Goal Decomposition Kernel)

ATLAS handles complex goals that require multi-step execution:

1. **Decompose** — LLM-powered decomposition of a goal into a task DAG with dependencies
2. **Plan** — Creates an execution plan with budget guards (max tokens, max cost in cents)
3. **Execute** — Runs tasks in dependency order, routing each through Sovereign
4. **Reflect** — Post-execution reflection to extract lessons and assess quality

**Schema:** 3 tables (`atlas_goals`, `atlas_plans`, `atlas_goal_tasks`)

### 3.4 Sovereign Layer (Multi-Provider Routing)

Sovereign provides resilient LLM access across multiple providers:

1. **Provider Registry** — Tracks providers with health scores, cost per token, capabilities, and rate limits
2. **Circuit Breaker** — Per-provider circuit breaker (closed → open → half-open) with configurable thresholds
3. **Routing** — Selects the best provider based on capability match, health, cost, and latency
4. **Guardrails** — Content filtering (PII detection, prompt injection, toxicity) before and after LLM calls
5. **Usage Tracking** — Logs every routing decision with latency, tokens, cost, and success/failure

**Schema:** 3 tables (`sovereign_providers`, `sovereign_routing_decisions`, `sovereign_usage_logs`)

## 4. Database Schema

The platform uses 48 tables organized into functional groups:

| Group | Tables | Purpose |
|-------|--------|---------|
| Core | `users`, `tasks`, `task_messages`, `workspace_artifacts` | User accounts, tasks, chat history, artifacts |
| Files | `files` | S3 file metadata (URL, key, mime type) |
| Preferences | `user_preferences` | User settings, system prompts, capability toggles |
| Memory | `memory_entries` | Extracted knowledge from conversations |
| Bridge | `bridge_configs` | Sovereign Bridge WebSocket configuration |
| Billing | `usage_stats`, `stripe_customers`, `stripe_subscriptions` | Usage tracking and payment |
| Sharing | `shared_tasks` | Task sharing tokens |
| Projects | `projects`, `project_tasks` | Multi-task project organization |
| GitHub | `github_repos`, `github_branches` | GitHub integration |
| WebApp | `webapp_projects`, `webapp_builds`, `webapp_domains`, `webapp_envs` | Web app builder |
| Connectors | `connectors` | Third-party service integrations |
| Skills | `skills` | Agent skill definitions |
| Schedule | `scheduled_tasks` | Recurring task scheduling |
| AEGIS | `aegis_sessions`, `aegis_quality_scores`, `aegis_cache`, `aegis_fragments`, `aegis_lessons`, `aegis_patterns` | Quality pipeline |
| ATLAS | `atlas_goals`, `atlas_plans`, `atlas_goal_tasks` | Goal decomposition |
| Sovereign | `sovereign_providers`, `sovereign_routing_decisions`, `sovereign_usage_logs` | Provider routing |

## 5. API Reference

All API access is through tRPC procedures under `/api/trpc`. Key namespaces:

### Task Operations
- `task.create` — Create a new task
- `task.list` — List user's tasks (with search, filter, pagination)
- `task.get` — Get task with messages
- `task.archive` — Soft-delete a task
- `task.favorite` — Toggle favorite flag

### AEGIS Operations
- `aegis.classify` — Classify a task by type and complexity
- `aegis.checkCache` — Check semantic cache for a prompt
- `aegis.preFlight` — Run full pre-flight pipeline
- `aegis.postFlight` — Run post-flight quality scoring and learning
- `aegis.stats` — Get AEGIS statistics

### ATLAS Operations
- `atlas.decompose` — Decompose a goal into a task DAG
- `atlas.execute` — Execute a decomposed goal
- `atlas.getGoal` — Get goal with plan and tasks
- `atlas.listGoals` — List recent goals

### Sovereign Operations
- `sovereign.route` — Route a request to the best provider
- `sovereign.stats` — Get routing statistics
- `sovereign.circuitStatus` — Get circuit breaker status for all providers
- `sovereign.providers` — List all providers
- `sovereign.seedProviders` — Seed default providers
- `sovereign.providerUsage` — Get usage logs for a provider

### Streaming
- `POST /api/stream` — SSE endpoint for streaming LLM responses with tool use

## 6. Testing

The project has 111 test files with 3,084+ tests covering:

- **Unit tests** — Individual service functions, DB helpers, utility functions
- **Integration tests** — tRPC procedure behavior, auth flows, GDPR compliance
- **String-scanning tests** — Verify implementation patterns exist in router source code
- **Security tests** — Input validation, auth enforcement, rate limiting patterns

Run tests:
```bash
pnpm test                                    # All tests (may OOM in small sandboxes)
npx vitest run server/specific.test.ts       # Single file
npx vitest run server/agent-stack.test.ts    # Agent stack tests
```

## 7. Deployment

### Docker
```bash
docker build -t manus-next .
docker run -p 3000:3000 --env-file .env manus-next
```

### PM2
```bash
pnpm build
pm2 start ecosystem.config.cjs
```

### Manus Platform
Click "Publish" in the Management UI after saving a checkpoint.

## 8. GDPR Compliance

The `gdpr.deleteAllData` procedure deletes all user data across all 48 tables. This is enforced by automated tests that scan the procedure body to verify every table with a `userId` column is included in the deletion cascade.

## 9. Security

- All mutations require authentication via `protectedProcedure`
- Admin-only routes use role-based access control (`ctx.user.role === 'admin'`)
- Stripe webhooks verify signatures before processing
- File uploads go through server-side validation before S3 storage
- Content guardrails in Sovereign layer filter PII and prompt injection

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests OOM | Run subsets: `npx vitest run server/specific.test.ts` |
| Server won't start | Check `DATABASE_URL` is set, run `pnpm db:push` |
| Stripe webhook fails | Verify `STRIPE_WEBHOOK_SECRET`, check raw body parsing order |
| TypeScript errors after schema change | Run `pnpm db:push` then `pnpm check` |
| String-scanning test fails after router extraction | Use `readRouterSource()` from `server/test-utils/` |
