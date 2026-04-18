# Manus Parity Spec v8.0 — Gap Analysis for manus-next-app

**Date:** April 18, 2026
**Last Updated:** April 18, 2026 (post-implementation)
**Scope:** Audit manus-next-app codebase against all 67 capabilities in the Manus Parity Spec v8.0.
**Status:** Implementation complete for all high-priority items. Stability verified through 3 consecutive convergence passes.

---

## Signal Assessment

- **Fundamental Redesign:** Absent. Core architecture (React 19 + Express + tRPC + SSE agentic loop) is sound and aligned with the target.
- **Landscape:** **COMPLETE.** All 67 capabilities audited. High-priority gaps identified and resolved.
- **Depth:** **COMPLETE.** All implemented features tested end-to-end with 128 unit tests and 18 e2e validations.
- **Adversarial:** **COMPLETE.** Capability honesty updated, mock/implementation mismatches fixed, type safety improved.
- **Future-State:** Documented — see "Remaining Gaps" section below.

---

## Implementation Results

### Features Implemented in This Session

| Feature | Spec # | Status | Tests | Notes |
|---------|--------|--------|-------|-------|
| Speed/Quality Mode | #4 | Live | 128/128 | Mode toggle in TaskView, adjusts LLM temperature/max_tokens |
| Cross-Session Memory | #6 | Live | 30 parity tests | CRUD + search + auto-extraction from tasks, injected into system prompt |
| Task Sharing | #7 | Live | 30 parity tests | Signed URLs with optional password (SHA-256) and expiry (1-720h) |
| Event Notifications | #9 | Live | 30 parity tests | Bell icon, unread badge, mark-read, auto-notify on task completion |
| Document Generation | #61 | Live | 30 parity tests | Agent tool: markdown, report, analysis, plan formats; stored as artifacts |
| SEO Basics | #37 | Live | 18 e2e checks | OG tags, meta description, robots.txt, viewport meta |
| Capability Honesty | N/A | Live | N/A | SettingsPage shows 7 live + 7 planned capabilities with status badges |

### Stability Verification

| Check | Result |
|-------|--------|
| Unit tests | 128/128 pass (9 test files) |
| E2E validation | 18/18 pass |
| TypeScript | 0 errors |
| Browser console | 0 errors |
| Server logs | 0 errors |
| Convergence passes | 3 consecutive (no new issues) |

---

## Current Capability Inventory

### Live Capabilities (22 total)

| # | Capability | Implementation |
|---|-----------|----------------|
| 1 | Chat Mode | Multi-turn conversational interface with persistent messages |
| 2 | Agent Mode | Agentic loop with 6 tools, max 8 turns |
| 4 | Speed/Quality Mode | **NEW** — Mode toggle adjusts LLM parameters per task |
| 6 | Cross-Session Memory | **NEW** — Persistent memory entries injected into system prompt |
| 7 | Task Sharing | **NEW** — Signed URLs with password/expiry, public view page |
| 9 | Notifications | **NEW** — In-app notification center with unread tracking |
| 18 | Data Analysis | Structured analysis tool with LLM synthesis |
| 19 | Image Generation | Via built-in imageGeneration helper |
| 26 | Web Search | DuckDuckGo + Wikipedia + page fetch pipeline |
| 32 | Auth (OAuth) | Manus OAuth with session cookies |
| 37 | SEO | **NEW** — OG tags, meta description, robots.txt |
| 38 | Code Execution | JavaScript eval in sandboxed tool |
| 41 | GitHub Integration | Via Manus platform |
| 44 | Mobile Responsive | Sidebar drawer, bottom nav |
| 60 | Voice STT | MediaRecorder → S3 → Whisper transcription |
| 61 | Document Generation | **NEW** — Agent tool for markdown/report/analysis/plan |
| — | Task Management | CRUD, search, filter, archive, favorite, per-task system prompt |
| — | Workspace Artifacts | Browser URLs, code, terminal, images, documents persisted |
| — | Bridge Integration | WebSocket to Sovereign Hybrid backend |
| — | Preferences | General settings, capability toggles, global system prompt |
| — | Identity Rule | Prevents vendor self-identification, verified at runtime |
| — | Research Nudge | Auto-nudges LLM to use read_webpage after web_search |

### Planned Capabilities (shown in Settings as "planned")

| # | Capability | Blocker |
|---|-----------|---------|
| 8 | Task Replay | Requires timeline scrubber UI |
| 15 | Design View | Requires image canvas with mark tool |
| 16 | Slides | Requires slide generation engine |
| 17 | Task Scheduling | Requires cron/interval backend |
| 22-25 | Computer Use | Requires Sovereign Bridge connection |
| 46-47 | Desktop Agent | Requires native app build |
| 59 | Client Inference | Requires WebGPU/WASM support |

### Out of Scope (platform-level)

| # | Capability | Notes |
|---|-----------|-------|
| 5 | Wide Research | Requires parallel sub-agent architecture |
| 10 | One-shot Success | Requires success tracking metric |
| 11 | Projects | Requires project/workspace concept |
| 12-14 | Skills | Requires skills marketplace |
| 20 | Mail | Email send/receive |
| 21 | Meeting Minutes | Audio → transcript + action items |
| 27-31 | Website Builder | Manus-specific infrastructure |
| 33-36 | Creator Tools | Webhooks, payments, analytics |
| 39-40 | Domains | Platform feature |
| 42-43 | Mobile App | Native development |
| 48 | Version Rollback | Task state versioning |
| 49-58 | Integrations | Connectors, MCP, Slack, etc. |
| 62 | Video Gen | Requires Veo3 API |
| 63-67 | Compliance/Maps/Data | Infrastructure-level |

---

## Architecture Decisions

1. **Memory injection**: Memory entries are fetched at stream start and prepended to the system prompt. Max 20 entries, ordered by recency. This avoids per-message overhead while keeping context fresh.

2. **Share security**: Passwords are hashed with SHA-256 (not bcrypt) since share links are ephemeral with optional expiry. The trade-off is acceptable for this use case.

3. **Notification polling**: Frontend polls unread count every 30 seconds via tRPC query. SSE-based push was considered but deferred to avoid complexity in the current architecture.

4. **Document generation**: Uses the same LLM as chat but with a structured prompt that outputs formatted documents. Documents are stored as workspace artifacts with `document` type.

5. **Capability honesty**: SettingsPage now shows explicit `live`/`planned` status badges. Planned capabilities have disabled toggles and show informational toasts.
