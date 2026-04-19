# Prerequisites Ready Checklist

> Tracks which prerequisites from the v8.3 spec are satisfied.

## Environment Prerequisites

| Prerequisite | Status | Notes |
|-------------|--------|-------|
| Node.js 22+ | READY | v22.13.0 in sandbox |
| pnpm | READY | Available globally |
| TypeScript 5.9+ | READY | v5.9.3 |
| React 19 | READY | Installed |
| Tailwind CSS 4 | READY | Installed |
| Express 4 | READY | Installed |
| tRPC 11 | READY | Installed |
| Drizzle ORM | READY | v0.44.5 |
| Database (TiDB/MySQL) | READY | Via DATABASE_URL |
| S3 Storage | READY | Via built-in helpers |
| LLM API | READY | Via invokeLLM helper |
| OAuth | READY | Manus OAuth (not Clerk) |

## Spec-Required Artifacts

| Artifact | Status | Path |
|----------|--------|------|
| MANIFEST.json | READY | docs/parity/MANIFEST.json |
| STATE_MANIFEST.json | READY | docs/parity/STATE_MANIFEST.json |
| PARITY_BACKLOG.md | READY | docs/parity/PARITY_BACKLOG.md |
| COMPREHENSION_ESSAY.md | READY | docs/parity/COMPREHENSION_ESSAY.md |
| AFK_DECISIONS.md | READY | docs/parity/AFK_DECISIONS.md |
| AFK_BLOCKED.md | READY | docs/parity/AFK_BLOCKED.md |
| INFRA_DECISIONS.md | READY | docs/parity/INFRA_DECISIONS.md |
| RESUME_WHEN_PACKAGES_PUBLISHED.md | READY | docs/parity/RESUME_WHEN_PACKAGES_PUBLISHED.md |
| CHANGELOG.md | READY | CHANGELOG.md |
| ARCHITECTURE.md | READY | ARCHITECTURE.md (v4.0) |

## Upstream Package Prerequisites (NOT READY)

| Package | Status | Blocker |
|---------|--------|---------|
| @mwpenn94/manus-next-core | NOT READY | Not published on npm |
| @mwpenn94/manus-next-browser | NOT READY | Not published on npm |
| @mwpenn94/manus-next-computer | NOT READY | Not published on npm |
| @mwpenn94/manus-next-document | NOT READY | Not published on npm |
| @mwpenn94/manus-next-deck | NOT READY | Not published on npm |
| @mwpenn94/manus-next-billing | NOT READY | Not published on npm |
| @mwpenn94/manus-next-share | NOT READY | Not published on npm |
| @mwpenn94/manus-next-replay | NOT READY | Not published on npm |
| @mwpenn94/manus-next-scheduled | NOT READY | Not published on npm |
| @mwpenn94/manus-next-webapp-builder | NOT READY | Not published on npm |
| @mwpenn94/manus-next-client-inference | NOT READY | Not published on npm |
| @mwpenn94/manus-next-desktop | NOT READY | Not published on npm |
| @mwpenn94/manus-next-sync | NOT READY | Not published on npm |

## Gate A Prerequisites

| Prerequisite | Status |
|-------------|--------|
| All tests pass | READY (217 tests) |
| 0 TypeScript errors | READY |
| Capability gap scan complete | READY |
| AFK artifacts produced | READY |
| Convergence passes (2 consecutive clean) | PENDING |
| Persona validation (7 personas) | PENDING |
