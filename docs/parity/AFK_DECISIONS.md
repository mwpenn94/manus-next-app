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


---

## v9 Prompt-42 AFK Architecture Decisions (2026-04-20)

### 7. AFK State Machine Architecture

The v9 prompt specifies a complete AFK execution state machine: IDENTIFY → OPTIMIZE → VALIDATE → COMMIT/REVERT → CHECKPOINT → REPORT → REALITY_CHECK → EXIT. This is documented as an infrastructure specification. The current architecture already supports the core primitives (scheduled tasks, task persistence, notifyOwner), but the orchestration layer that chains these into the I→O→V cycle is a future requirement.

### 8. Checkpoint and Report Cadence

| Parameter | Value | Current Support |
|-----------|-------|----------------|
| Checkpoint interval | 30 min | webdev_save_checkpoint (project-level); task-level needed |
| Progress report interval | 2 hr | notifyOwner helper exists; scheduling logic needed |
| Max cycles | 200 | Future env var: AFK_MAX_CYCLES |
| Max wall-clock | 168 hr | Future env var: AFK_MAX_HOURS |

### 9. Failover Doctrine (§L.25)

The 10-layer failover tree requires error classification and recovery beyond the current try/catch pattern. Three legitimate global halt conditions: (1) unrecoverable data corruption, (2) security breach detection, (3) resource exhaustion beyond configured limits. All other failures trigger failover, not halt.

### 10. Updated Skipped Capabilities Status

Several previously-skipped capabilities have been resolved since the initial AFK pass:

| Capability | Previous Status | Current Status |
|-----------|----------------|----------------|
| #43 Mobile Development | Skipped (requires mobile package) | GREEN (responsive PWA approach) |
| #62 Veo3 Video | Skipped (requires API access) | YELLOW (scaffold + multi-provider UI) |
| #53 Microsoft Agent365 | Not listed | YELLOW (Azure AD OAuth scaffold) |
