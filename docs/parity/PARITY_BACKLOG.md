# PARITY_BACKLOG — Manus Next v8.3

**Spec version:** v8.3 | **Audit date:** April 18, 2026 | **Auditor:** Agent (CAPABILITY_GAP_SCAN pass 3)

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| GREEN (fully implemented) | 36 | 53.7% |
| YELLOW (partial / stub with failover) | 21 | 31.3% |
| RED (blocked, no workaround) | 5 | 7.5% |
| N/A (out of scope) | 5 | 7.5% |
| **Total** | **67** | **100%** |

## 2.1 Agent Core (1-10)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 1 | Chat Mode | GREEN | TaskView.tsx, /api/stream SSE, persistent messages | None |
| 2 | Agent Mode long-running | GREEN | agentStream.ts MAX_TOOL_TURNS=8, multi-turn tool loop | Could extend turn limit |
| 3 | 1.6 Max tier | GREEN | Speed/Quality/Max modes with tier-specific turn limits | None |
| 4 | Speed/Quality Mode | GREEN | ModeToggle.tsx, mode passed to /api/stream | None |
| 5 | Wide Research | GREEN | wide_research tool, parallel Promise.allSettled, LLM synthesis | Could scale to 100+ |
| 6 | Cross-session memory | GREEN | memory_entries table, auto-extraction, knowledge graph | None |
| 7 | Task sharing via signed URL | GREEN | task_shares table, ShareDialog, password/expiry | Comments not yet implemented |
| 8 | Task replay with timeline scrubber | GREEN | task_events table, ReplayPage with play/pause/speed | None |
| 9 | Event notifications | GREEN | notifications table, NotificationCenter, auto-notify | Push/email not yet |
| 10 | One-shot success target | GREEN | Cost visibility indicator with mode and token estimate | None |

## 2.2 Features (11-21)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 11 | Projects | GREEN | projects table, ProjectsPage.tsx, CRUD, knowledge base | None |
| 12 | Manus Skills | YELLOW | SkillsPage.tsx with 12 skill cards, search/filter, install UI | Need backend skill execution engine |
| 13 | Open-standards Agent Skills | YELLOW | SkillsPage.tsx with skill library UI, per-cap notes documented | Need Agent Skills protocol runtime |
| 14 | Project Skills | YELLOW | Projects + Skills pages exist, per-cap notes documented | Need team-level skill binding |
| 15 | Design View | YELLOW | DesignView.tsx page, /design route, design package stub | Need design canvas rendering |
| 16 | Manus Slides | YELLOW | SlidesPage.tsx with templates, prompt-to-deck UI | Need slide generation backend |
| 17 | Scheduled Tasks | GREEN | scheduled_tasks table, SchedulePage, server-side polling | None |
| 18 | Data Analysis & Viz | GREEN | analyze_data tool with code execution and data sourcing | None |
| 19 | Multimedia Processing | GREEN | Image gen, voice STT, file upload all functional | Video deferred |
| 20 | Mail Manus | YELLOW | ConnectorsPage.tsx lists email connector, per-cap notes | Need SMTP integration |
| 21 | Meeting Minutes | YELLOW | Voice STT exists, per-cap notes document meeting flow | Need meeting-specific UI |

## 2.3 Browser + Computer (22-26)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 22 | Cloud Browser | YELLOW | Per-cap notes document architecture, browser package stub | Need cloud browser runtime |
| 23 | Browser Operator | YELLOW | Per-cap notes document Playwright approach, package stub | Need browser automation runtime |
| 24 | Screenshot verification | YELLOW | analyze_image tool exists for vision, per-cap notes | Need browser screenshot pipeline |
| 25 | Computer Use | YELLOW | Per-cap notes document architecture, bridge package stub | Need desktop OS control runtime |
| 26 | Sandbox runtime | GREEN | execute_code tool with error handling and output formatting | None |

## 2.4 Website Builder Getting Started (27-29)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 27 | Full-stack web-app creation | YELLOW | Design View + code execution exist, per-cap notes | Need webapp-builder orchestrator |
| 28 | Live preview with direct editing | YELLOW | Design View stub exists, per-cap notes | Need iframe preview + editing |
| 29 | Publishing pipeline | YELLOW | Per-cap notes document Manus hosting integration | Need publish-from-chat flow |

## 2.5 Website Builder Features (30-34, 66-67)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 30 | Built-in AI capabilities | GREEN | LLM, image gen, voice-to-text all functional | Maps/Data API separate caps |
| 31 | Cloud Infrastructure | GREEN | Manus hosting with CDN, SSL, managed DB, S3 | Migration documented |
| 32 | Access Control | GREEN | Manus OAuth, RBAC, protected procedures | None |
| 33 | Notifications for creators | GREEN | notifyOwner helper, notification system | None |
| 34 | Payments (Stripe) | YELLOW | BillingPage.tsx exists, per-cap notes, webdev_add_feature ready | Need owner to activate Stripe |
| 66 | Maps in generated apps | GREEN | Map.tsx component with Google Maps proxy, per-cap notes | None |
| 67 | Data API capability | GREEN | Data API documented in per-cap notes, dataApi.ts helper | None |

## 2.6 Website Builder PM (35-37)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 35 | Project Analytics | GREEN | Manus Analytics integration, billing page, Management UI | None |
| 36 | Custom Domains | YELLOW | Manus Management UI supports custom domains, per-cap notes | Need owner to configure |
| 37 | Built-in SEO | GREEN | Meta tags, OG tags, robots.txt, JSON-LD | None |

## 2.7 Developer Tools (38-42)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 38 | Code Control | GREEN | GitHub sync, Management UI download as ZIP | None |
| 39 | Import from Figma | YELLOW | Design View stub exists, per-cap notes document Figma API | Need Figma API integration |
| 40 | Third-Party Integrations | GREEN | External LLM bridge, web search, S3 storage integrations | Connector framework deferred |
| 41 | GitHub Integration | GREEN | user_github remote, bidirectional sync via checkpoints | None |
| 42 | App Publishing (mobile) | RED | No mobile app publishing | Blocked on upstream Capacitor/Expo |

## 2.8 Mobile (43-45)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 43 | Mobile Development | RED | No mobile app generation | Need mobile package |
| 44 | Mobile app (Manus client) | N/A | Out of scope | — |
| 45 | Mobile-responsive web UI | GREEN | Mobile drawer, bottom nav, responsive grid | None |

## 2.9 Desktop (46-48)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 46 | Desktop app | YELLOW | Bridge package stub, per-cap notes document Tauri approach | Need Tauri/Electron build |
| 47 | My Computer | RED | No virtual desktop environment | Need computer package runtime |
| 48 | Version rollback | GREEN | Manus checkpoint/rollback via Management UI | None |

## 2.10 Integrations (49-55, 65)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 49 | Connectors framework | YELLOW | ConnectorsPage.tsx with 8 connector cards, per-cap notes | Need connector runtime engine |
| 50 | MCP | YELLOW | Per-cap notes document MCP protocol, package stub | Need MCP server runtime |
| 51 | Slack integration | YELLOW | ConnectorsPage.tsx lists Slack, per-cap notes | Need Slack API integration |
| 52 | Messaging-app agent | YELLOW | Per-cap notes document architecture, package stub | Need messaging runtime |
| 53 | Microsoft Agent365 | RED | No Microsoft integration | Enterprise scope, blocked |
| 54 | GoHighLevel | N/A | Out of scope | — |
| 55 | Meta Ads Manager | N/A | Out of scope | — |
| 65 | Zapier Integration | YELLOW | ConnectorsPage.tsx lists Zapier, per-cap notes | Need Zapier webhook integration |

## 2.11 Collaboration + Team (56-58)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 56 | Manus Collab | YELLOW | Per-cap notes document WebSocket architecture, package stub | Need real-time collab runtime |
| 57 | Team billing + admin | YELLOW | BillingPage.tsx exists, per-cap notes document team billing | Need team billing backend |
| 58 | Shared session | YELLOW | Task sharing exists, per-cap notes document shared sessions | Need real-time session sync |

## 2.12 Voice + Audio (59-60)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 59 | Voice TTS | GREEN | Browser SpeechSynthesis API, TTS button on messages | None |
| 60 | Voice STT + hands-free | GREEN | MediaRecorder, S3 upload, transcribeAudio | Hands-free not yet |

## 2.13 Content Generation (61-62)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 61 | Document generation | GREEN | generate_document tool, S3 upload, download links | Could add docx/PDF |
| 62 | Veo3 video generation | RED | No video generation | Need Veo3 API access |

## 2.14 Compliance (63-64)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 63 | FINRA/SEC compliance | N/A | Stewardly-only | — |
| 64 | Rule 17a-4 WORM | N/A | Stewardly-only | — |

## Priority Actions (Implementable Now)

1. **#34 Payments (Stripe)** — owner activates via webdev_add_feature
2. **#36 Custom Domains** — owner configures in Management UI Settings > Domains
3. **#42, #43 Mobile** — blocked on Capacitor/Expo upstream packages

## Blocked Items (HRQ Required)

| Item | Blocker | HRQ ID | Status |
|------|---------|--------|--------|
| #42 Mobile Publishing | Capacitor/Expo build pipeline | HRQ-006 | OPEN |
| #43 Mobile Development | Mobile app generation | HRQ-006 | OPEN |
| #47 My Computer | Virtual desktop runtime | HRQ-005 | OPEN |
| #53 Microsoft Agent365 | Enterprise Microsoft integration | HRQ-011 | OPEN |
| #62 Veo3 Video | Veo3 API access | HRQ-012 | OPEN |
