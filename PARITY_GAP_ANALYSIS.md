# Manus Parity Spec v8.2 — Gap Analysis for manus-next-app

**Date:** April 18, 2026
**Last Updated:** April 18, 2026 (Phase 4 — v8.2 Parity Complete)
**Scope:** Audit manus-next-app codebase against the Manus Parity Spec v8.2 capability inventory.
**Status:** All implementable capabilities are live. 166 unit tests, 18 e2e validations, 35 persona checks. 3 consecutive convergence passes with zero issues.

---

## Signal Assessment

- **Fundamental Redesign:** Absent. Core architecture (React 19 + Express + tRPC + SSE agentic loop) is sound and aligned with the target.
- **Landscape:** **COMPLETE.** All capabilities audited across 4 implementation phases.
- **Depth:** **COMPLETE.** All implemented features tested end-to-end with 166 unit tests, 18 e2e validations, and 35 persona checks.
- **Adversarial:** **COMPLETE.** Capability honesty updated, mock/implementation mismatches fixed, type safety verified with 0 TypeScript errors.
- **Future-State:** Documented — see "Planned Capabilities" section below.

---

## Implementation Summary by Phase

### Phase 1: Foundation (Core Platform)
Chat mode, agent mode, web search, code execution, image generation, data analysis, document generation, file upload, voice STT, OAuth, task management, workspace artifacts, mobile responsive, SEO.

### Phase 2: Feature Parity (Manus v8.0)
Speed/quality mode, cross-session memory, memory auto-extraction, task sharing, notifications, capability honesty, bridge integration, preferences, identity rule, research nudge.

### Phase 3: Advanced Features
Enhanced browsing (browse_web), session replay with timeline scrubber, task scheduling (UI), conversation regenerate, memory auto-extraction (post-task), system prompt customization.

### Phase 4: v8.2 Parity
Server-side scheduler polling loop, parallel wide research (up to 5 concurrent queries + LLM synthesis), keyboard shortcuts (Cmd+K/N/Shift+S//, Escape), cost visibility indicator, PWA manifest, researching action type.

---

## Current Capability Inventory

### Live Capabilities (32 total)

| # | Capability | Implementation | Phase |
|---|-----------|----------------|-------|
| 1 | Chat Mode | Multi-turn conversational interface with persistent messages | 1 |
| 2 | Agent Mode | Agentic loop with 8 tools, max 8 turns | 1 |
| 3 | Web Search | DDG + Wikipedia + page fetch + LLM synthesis | 1 |
| 4 | Speed/Quality Mode | Mode toggle adjusts LLM parameters per task | 2 |
| 5 | Wide Research | Parallel multi-query search (up to 5) with LLM synthesis | 4 |
| 6 | Cross-Session Memory | Persistent memory entries injected into system prompt | 2 |
| 7 | Task Sharing | Signed URLs with password/expiry, public view page | 2 |
| 8 | Task Replay | Timeline scrubber, play/pause/speed, event inspection | 3 |
| 9 | Notifications | In-app notification center with unread tracking | 2 |
| 10 | Code Execution | Sandboxed JavaScript eval with 5s timeout | 1 |
| 11 | Data Analysis | LLM-powered structured analysis | 1 |
| 12 | Image Generation | Via built-in imageGeneration helper | 1 |
| 13 | Document Generation | Agent tool for markdown/report/analysis/plan | 2 |
| 14 | Enhanced Browsing | Deep URL analysis (metadata, links, images, structured data) | 3 |
| 15 | Voice STT | MediaRecorder → S3 → Whisper transcription | 1 |
| 16 | Task Scheduling (UI) | Cron-based and interval-based recurring tasks | 3 |
| 17 | Task Scheduling (Server) | 60s polling loop, auto-execution, notifications | 4 |
| 18 | Memory Auto-Extraction | LLM-powered fact extraction from completed tasks | 3 |
| 19 | Conversation Regenerate | Re-generate any assistant response | 3 |
| 20 | System Prompt Customization | Global + per-task system prompt editor | 3 |
| 21 | Keyboard Shortcuts | Cmd+K/N/Shift+S//, Escape + help dialog | 4 |
| 22 | Cost Visibility | Per-task estimated cost indicator | 4 |
| 23 | PWA Installability | Web App Manifest for mobile/desktop | 4 |
| 24 | OAuth Authentication | Manus OAuth with session cookies | 1 |
| 25 | SEO | OG tags, meta description, robots.txt, JSON-LD | 1 |
| 26 | Mobile Responsive | Sidebar drawer, bottom nav, touch-friendly | 1 |
| 27 | Bridge Integration | WebSocket to Manus Next Hybrid backend | 2 |
| 28 | User Preferences | General settings, capability toggles, global system prompt | 2 |
| 29 | Identity Rule | Prevents vendor self-identification | 2 |
| 30 | Research Nudge | Auto-nudges LLM to use read_webpage after web_search | 2 |
| 31 | Task Management | CRUD, search, filter, archive, favorite | 1 |
| 32 | Workspace Artifacts | Browser URLs, code, terminal, images, documents | 1 |

### Planned Capabilities (shown in Settings as "planned")

| Capability | Blocker |
|-----------|---------|
| Slide Decks | Requires slide generation engine |
| Webapp Builder | Requires scaffold/deploy infrastructure |
| Client Inference | Requires WebGPU/WASM support |
| Desktop Agent | Requires native app build |

### Out of Scope (platform-level)

| Capability | Notes |
|-----------|-------|
| Computer Use (screen/mouse/keyboard) | Requires Manus Next Bridge connection |
| Email Send/Receive | Requires email service integration |
| Meeting Minutes | Requires audio → transcript pipeline |
| Website Builder | Manus-specific infrastructure |
| Creator Tools (webhooks, payments) | Platform feature |
| Custom Domains | Platform feature |
| Native Mobile App | Requires React Native or similar |
| Version Rollback | Task state versioning |
| Integrations (MCP, Slack, etc.) | Connector framework |
| Video Generation | Requires Veo3 API |
| Compliance/Maps/Data | Infrastructure-level |

---

## Stability Verification

| Check | Result |
|-------|--------|
| Unit tests | 166/166 pass (11 test files) |
| E2E validation | 18/18 pass |
| Persona checks | 35/35 pass (5 personas) |
| TypeScript | 0 errors |
| Server logs | 0 errors |
| Convergence passes | 3 consecutive (no new issues) |

---

## Architecture Decisions

1. **Memory injection**: Memory entries are fetched at stream start and prepended to the system prompt. Max 20 entries, ordered by recency. This avoids per-message overhead while keeping context fresh.

2. **Share security**: Passwords are hashed with SHA-256 (not bcrypt) since share links are ephemeral with optional expiry. The trade-off is acceptable for this use case.

3. **Notification polling**: Frontend polls unread count every 30 seconds via tRPC query. SSE-based push was considered but deferred to avoid complexity in the current architecture.

4. **Document generation**: Uses the same LLM as chat but with a structured prompt that outputs formatted documents. Documents are stored as workspace artifacts with `document` type.

5. **Capability honesty**: SettingsPage shows explicit `live`/`planned` status badges. Planned capabilities have disabled toggles and show informational toasts.

6. **Scheduler design**: Server-side polling loop (60s interval) instead of a dedicated job queue. The `isRunning` guard prevents overlapping polls. Tasks execute sequentially within each poll to avoid resource contention.

7. **Wide research**: Parallel execution via `Promise.allSettled` with a hard cap of 5 concurrent queries. Results are synthesized by a separate LLM call with a dedicated synthesis prompt. This avoids overwhelming the search pipeline while providing comprehensive coverage.

8. **Cost visibility**: Estimated costs are displayed as a range based on the selected mode (Speed/Balanced/Quality). These are approximations based on typical token usage, not metered billing.
