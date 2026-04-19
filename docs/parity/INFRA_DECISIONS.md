# Infrastructure Decisions

> Autonomous decisions made during v8.3 parity implementation regarding infrastructure.

## Hosting

| Decision | Rationale |
|----------|-----------|
| **Stay on Manus hosting** | Spec calls for Cloudflare Pages + Railway. Current Manus hosting provides built-in OAuth, database, S3, and LLM. Migration deferred as HRQ. |
| **No Cloudflare Workers** | Would require Manus hosting migration. Documented in AFK_BLOCKED.md. |

## Authentication

| Decision | Rationale |
|----------|-----------|
| **Keep Manus OAuth** | Spec calls for Clerk. Manus OAuth is already wired, provides user management, and is free. Clerk integration deferred as HRQ. |
| **Guest exploration** | Per knowledge base: users should access app without gate. Current: shows empty state for unauth users with login CTA. |

## Database

| Decision | Rationale |
|----------|-----------|
| **TiDB/MySQL via Drizzle** | Spec is database-agnostic. Current TiDB works well with Drizzle ORM. No migration needed. |
| **Projects table** | Added `projects` and `project_knowledge` tables for capability #11. |
| **projectId on tasks** | Added nullable `projectId` column to tasks table for project association. |

## LLM Integration

| Decision | Rationale |
|----------|-----------|
| **Manus built-in LLM** | Spec mentions model routing. Using Manus invokeLLM helper which handles model selection internally. |
| **3-tier mode** | Speed (temp 0.3, 4 turns), Quality (temp 0.7, 8 turns), Max (temp 0.8, 12 turns). |

## File Storage

| Decision | Rationale |
|----------|-----------|
| **Manus S3** | Using built-in storagePut/storageGet helpers. No migration needed. |

## Package Architecture

| Decision | Rationale |
|----------|-----------|
| **Monolith for now** | Spec calls for 13 `@mwpenn94/manus-next-*` packages. These don't exist on npm yet. All code lives in the monolith. Package extraction documented in RESUME_WHEN_PACKAGES_PUBLISHED.md. |
| **ManusNextChat type defs** | Created TypeScript interfaces per spec §B.5 for future extraction. |

## Scheduler

| Decision | Rationale |
|----------|-----------|
| **setInterval polling** | Spec doesn't specify scheduler architecture. Using 60s polling loop with race condition guard. Production would use a proper job queue (BullMQ, etc.). |
| **Error throttling** | Scheduler poll errors suppressed to 1 log per 10 minutes to avoid log spam. |
