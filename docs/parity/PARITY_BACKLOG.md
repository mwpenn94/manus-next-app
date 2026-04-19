# PARITY_BACKLOG — manus-next-app

**Spec version:** v8.3 | **Audit date:** April 18, 2026 | **Auditor:** Agent (CAPABILITY_GAP_SCAN pass)

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| GREEN (fully implemented) | 32 | 47.8% |
| YELLOW (partial) | 1 | 1.5% |
| RED (blocked/deferred) | 29 | 43.3% |
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
| 12 | Manus Skills | RED | No skills system | Need skill definitions |
| 13 | Open-standards Agent Skills | RED | No Agent Skills protocol | Blocked on upstream |
| 14 | Project Skills | RED | No team-level skill library | Depends on #11/#12 |
| 15 | Design View | YELLOW | DesignView.tsx stub page, /design route | Need design canvas |
| 16 | Manus Slides | RED | No slide generation | Need deck package |
| 17 | Scheduled Tasks | GREEN | scheduled_tasks table, SchedulePage, server-side polling | None |
| 18 | Data Analysis & Viz | GREEN | analyze_data tool with code execution and data sourcing | None |
| 19 | Multimedia Processing | GREEN | Image gen, voice STT, file upload all functional | Video deferred |
| 20 | Mail Manus | RED | No email capability | Need email integration |
| 21 | Meeting Minutes | RED | No audio-to-transcript | Need meetings package |

## 2.3 Browser + Computer (22-26)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 22 | Cloud Browser | RED | No cloud browser environment | Need browser package |
| 23 | Browser Operator | RED | No local Chrome automation | Need browser package |
| 24 | Screenshot verification | RED | No vision model verification | Depends on #22 |
| 25 | Computer Use | RED | No desktop OS control | Need computer package |
| 26 | Sandbox runtime | GREEN | execute_code tool with error handling and output formatting | None |

## 2.4 Website Builder Getting Started (27-29)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 27 | Full-stack web-app creation | RED | No webapp builder | Need webapp-builder package |
| 28 | Live preview with direct editing | RED | No inline editing | Depends on #27 |
| 29 | Publishing pipeline | RED | No app publishing from chat | Depends on #27 |

## 2.5 Website Builder Features (30-34, 66-67)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 30 | Built-in AI capabilities | GREEN | LLM, image gen, voice-to-text all functional | Maps/Data API separate caps |
| 31 | Cloud Infrastructure | GREEN | Manus hosting with CDN, SSL, managed DB, S3 | Migration documented |
| 32 | Access Control | GREEN | Manus OAuth, RBAC, protected procedures | None |
| 33 | Notifications for creators | GREEN | notifyOwner helper, notification system | None |
| 34 | Payments (Stripe) | RED | Stripe not integrated | Use webdev_add_feature |
| 66 | Maps in generated apps | RED | Map component exists but not in generated apps | N/A for chat app |
| 67 | Data API capability | RED | No structured data API exposure | N/A for chat app |

## 2.6 Website Builder PM (35-37)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 35 | Project Analytics | GREEN | Manus Analytics integration, billing page, Management UI | None |
| 36 | Custom Domains | RED | Using manus.space subdomain only | Hosting limitation |
| 37 | Built-in SEO | GREEN | Meta tags, OG tags, robots.txt, JSON-LD | None |

## 2.7 Developer Tools (38-42)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 38 | Code Control | GREEN | GitHub sync, Management UI download as ZIP | None |
| 39 | Import from Figma | RED | No Figma integration | Need design-view |
| 40 | Third-Party Integrations | GREEN | External LLM bridge, web search, S3 storage integrations | Connector framework deferred |
| 41 | GitHub Integration | GREEN | user_github remote, bidirectional sync via checkpoints | None |
| 42 | App Publishing (mobile) | RED | No mobile app publishing | Blocked on upstream |

## 2.8 Mobile (43-45)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 43 | Mobile Development | RED | No mobile app generation | Need mobile package |
| 44 | Mobile app (Manus client) | N/A | Out of scope | — |
| 45 | Mobile-responsive web UI | GREEN | Mobile drawer, bottom nav, responsive grid | None |

## 2.9 Desktop (46-48)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 46 | Desktop app | RED | No Tauri/Electron build | Need desktop packaging |
| 47 | My Computer | RED | No virtual desktop environment | Need computer package |
| 48 | Version rollback | GREEN | Manus checkpoint/rollback via Management UI | None |

## 2.10 Integrations (49-55, 65)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 49 | Connectors framework | RED | No SaaS connector layer | Need connectors |
| 50 | MCP | RED | No MCP protocol support | Need MCP integration |
| 51 | Slack integration | RED | No Slack bot | Need messaging package |
| 52 | Messaging-app agent | RED | No messaging agents | Need messaging package |
| 53 | Microsoft Agent365 | RED | No Microsoft integration | Enterprise scope |
| 54 | GoHighLevel | N/A | Out of scope | — |
| 55 | Meta Ads Manager | N/A | Out of scope | — |
| 65 | Zapier Integration | RED | No Zapier integration | Could use MCP gateway |

## 2.11 Collaboration + Team (56-58)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 56 | Manus Collab | RED | No real-time collaboration | Need collab package |
| 57 | Team billing + admin | RED | No team billing | Need billing package |
| 58 | Shared session | RED | No shared sessions | Depends on #56 |

## 2.12 Voice + Audio (59-60)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 59 | Voice TTS | GREEN | Browser SpeechSynthesis API, TTS button on messages | None |
| 60 | Voice STT + hands-free | GREEN | MediaRecorder, S3 upload, transcribeAudio | Hands-free not yet |

## 2.13 Content Generation (61-62)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 61 | Document generation | GREEN | generate_document tool, multiple formats | Could add docx/PDF |
| 62 | Veo3 video generation | RED | No video generation | Need Veo3 API |

## 2.14 Compliance (63-64)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 63 | FINRA/SEC compliance | N/A | Stewardly-only | — |
| 64 | Rule 17a-4 WORM | N/A | Stewardly-only | — |

## Priority Actions (Implementable Now)

1. **#34 Payments (Stripe)** — monetization prerequisite (owner decision required)
2. **#36 Custom Domains** — owner must configure in Management UI
3. **#15 Design View** — needs design canvas implementation

All other RED capabilities are blocked on upstream packages or deferred to Phase 2.

## Blocked Items (HRQ Required)

| Item | Blocker | HRQ ID |
|------|---------|--------|
| #11 Projects | ~~RESOLVED: Implemented directly~~ | ~~HRQ-001~~ |
| #12-14 Skills | Needs @mwpenn94/manus-next-skills | HRQ-002 |
| #15 Design View | Needs @mwpenn94/manus-next-design-view | HRQ-003 |
| #22-24 Browser | Needs @mwpenn94/manus-next-browser | HRQ-004 |
| #25 Computer Use | Needs @mwpenn94/manus-next-computer | HRQ-005 |
| #43 Mobile Dev | Needs @mwpenn94/manus-next-mobile | HRQ-006 |
| #49 Connectors | Needs @mwpenn94/manus-next-connectors | HRQ-007 |
| Hosting migration | Cloudflare + Railway setup | HRQ-008 |
| Clerk auth | Replace Manus OAuth | HRQ-009 |
| Manus baseline | Mike captures Manus Pro baselines | HRQ-010 |
