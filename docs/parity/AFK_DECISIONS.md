# AFK_DECISIONS.md — Autonomous Execution Decision Log

**Mode:** AFK Autonomous | **Target:** Gate A (DEV_CONVERGENCE) | **Date:** April 18-19, 2026

## HRQ Resolutions

| # | HRQ Type | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | `HRQ:upstream-packages-unpublished` | Proceed with in-app implementations; scaffold interfaces that would accept packages when available | All 13 `@mwpenn94/manus-next-*` packages return 404 on npm. Per AFK addendum: write `AFK_BLOCKED.md`, produce partial deliverable with repo scaffolding |
| 2 | `HRQ:infra-pricing-verify-current` | Using Manus hosting (current environment) | App is deployed on Manus hosting; migration to Cloudflare/Railway deferred to post-AFK |
| 3 | `HRQ:manus-current-flagship-verify` | Using "Manus 1.6 Max" as documented | Cannot verify manus.im flagship tier name in current context |
| 4 | `HRQ:best-in-class-paid-escalation:*` | Auto-declined all paid escalations | Using free-tier observation only per AFK addendum |
| 5 | `HRQ:capability-fold-in-*` | Auto-deferred new capabilities beyond current scope | Logged in DEFERRED_CAPABILITIES.md |
| 6 | `HRQ:cloudflare-storybook-subdomain-verify` | Deferred | Storybook deployment requires Cloudflare Pages; not available in Manus hosting |

## Implementation Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Voice TTS uses browser SpeechSynthesis API | Zero-cost, zero-latency, works in all modern browsers. Edge TTS would require server-side proxy. |
| 2 | Projects implemented as DB-backed workspace concept | Matches Manus's project model; tasks can be grouped under projects with shared instructions |
| 3 | Max tier routing implemented as parameter adjustment | No separate model endpoint available; using temperature/max_tokens/reasoning depth modulation |
| 4 | Scheduler poll errors suppressed with graceful handling | DB may not have scheduled_tasks table in all environments; scheduler now catches and logs silently |
| 5 | ManusNextChat component interface defined as TypeScript types | Cannot publish npm package from Manus; interface ready for when packages are available |
| 6 | Auth remains Manus OAuth | Clerk migration requires external service setup; deferred to post-AFK |
| 7 | Hosting remains Manus | Cloudflare/Railway migration requires DNS and deployment pipeline changes |

## Skipped Capabilities (Free-tier insufficient)

| Capability | Reason |
|-----------|--------|
| #22-24 Cloud Browser | Requires browser package with cloud VM |
| #25 Computer Use | Requires desktop OS control |
| #27-29 Website Builder | Requires webapp-builder package |
| #43 Mobile Development | Requires mobile package |
| #46 Desktop App | Requires Tauri/Electron build pipeline |
| #62 Veo3 Video | Requires Veo3 API access |
