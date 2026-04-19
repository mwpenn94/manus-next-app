# AFK_BLOCKED.md — Upstream Package Blockers

**Date:** April 18, 2026 | **Status:** BLOCKED — packages not published on npm

## Blocked Packages

All 13 `@mwpenn94/manus-next-*` packages return 404 on npm:

| Package | Capabilities Blocked | Workaround Applied |
|---------|---------------------|-------------------|
| `@mwpenn94/manus-next-browser` | #22 Cloud Browser, #23 Browser Operator, #24 Screenshot verification | None — requires cloud VM |
| `@mwpenn94/manus-next-computer` | #25 Computer Use, #47 My Computer | None — requires desktop OS |
| `@mwpenn94/manus-next-webapp-builder` | #27-29 Website Builder | None — requires build pipeline |
| `@mwpenn94/manus-next-design-view` | #15 Design View, #39 Figma Import | None — requires canvas engine |
| `@mwpenn94/manus-next-deck` | #16 Manus Slides | None — requires slide engine |
| `@mwpenn94/manus-next-mobile` | #43 Mobile Development | None — requires mobile build |
| `@mwpenn94/manus-next-desktop` | #46 Desktop App | None — requires Tauri/Electron |
| `@mwpenn94/manus-next-connectors` | #49 Connectors, #50 MCP, #65 Zapier | None — requires connector framework |
| `@mwpenn94/manus-next-collab` | #56-58 Collaboration | None — requires WebSocket infra |
| `@mwpenn94/manus-next-billing` | #57 Team Billing | None — requires payment infra |
| `@mwpenn94/manus-next-messaging` | #51-52 Slack/Messaging | None — requires bot framework |
| `@mwpenn94/manus-next-skills` | #12-14 Skills | Partial — can scaffold interface |
| `@mwpenn94/manus-next-projects` | #11 Projects (enhanced) | **Implemented in-app** — DB + CRUD + UI |

## What Was Produced Instead

1. **Repo scaffolding** — TypeScript interfaces and type definitions for all package APIs in `shared/types.ts`
2. **In-app implementations** — Projects (#11), TTS (#59), Wide Research (#5), Scheduler (#17) built natively
3. **§L compliance artifacts** — COMPREHENSION_ESSAY, CONVERGENCE_DIRECTIVE_CHECK, per-cap-notes
4. **RESUME_WHEN_PACKAGES_PUBLISHED.md** — Step-by-step checklist for Mike

## See Also

- `RESUME_WHEN_PACKAGES_PUBLISHED.md` — checklist for post-publish integration
- `AFK_DECISIONS.md` — all autonomous decisions logged
