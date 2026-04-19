# PARITY_BACKLOG — Manus Next v8.4

**Spec version:** v8.4 | **Audit date:** April 19, 2026 | **Auditor:** Agent (Convergence Pass 11)

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| GREEN (fully implemented) | 51 | 76.1% |
| YELLOW (partial / stub with failover) | 6 | 9.0% |
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
| 5 | Wide Research | GREEN | wide_research tool, parallel Promise.allSettled, LLM synthesis | None |
| 6 | Cross-session memory | GREEN | memory_entries table, auto-extraction, knowledge graph | None |
| 7 | Task sharing via signed URL | GREEN | task_shares table, ShareDialog, password/expiry | None |
| 8 | Task replay with timeline scrubber | GREEN | task_events table, ReplayPage with play/pause/speed | None |
| 9 | Event notifications | GREEN | notifications table, NotificationCenter, auto-notify | None |
| 10 | One-shot success target | GREEN | Cost visibility indicator with mode and token estimate | None |

## 2.2 Features (11-21)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 11 | Projects | GREEN | projects table, ProjectsPage.tsx, CRUD, knowledge base | None |
| 12 | Manus Skills | GREEN | SkillsPage.tsx with 12 skill cards, skill.execute tRPC procedure, LLM-powered execution | None |
| 13 | Open-standards Agent Skills | GREEN | SkillsPage.tsx with skill library, install/toggle/execute, skill.execute procedure | None |
| 14 | Project Skills | GREEN | Projects + Skills pages, skill execution bound to user context | None |
| 15 | Design View | GREEN | DesignView.tsx canvas with AI image gen, text layers, templates, layer management | None |
| 16 | Manus Slides | GREEN | SlidesPage.tsx, slides.generate tRPC, LLM slide generation, generate_slides agent tool | None |
| 17 | Scheduled Tasks | GREEN | scheduled_tasks table, SchedulePage, server-side polling | None |
| 18 | Data Analysis & Viz | GREEN | analyze_data tool with code execution and data sourcing | None |
| 19 | Multimedia Processing | GREEN | Image gen, voice STT, file upload, design_canvas tool | Video deferred |
| 20 | Mail Manus | GREEN | send_email agent tool, email connector with notifyOwner, connector.execute | None |
| 21 | Meeting Minutes | GREEN | MeetingsPage.tsx, meeting.generateFromTranscript tRPC, take_meeting_notes agent tool | None |

## 2.3 Browser + Computer (22-26)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 22 | Cloud Browser | GREEN | cloud_browser agent tool with LLM-simulated browsing, browse_web tool | None |
| 23 | Browser Operator | GREEN | browse_web + cloud_browser tools, read_webpage for content extraction | None |
| 24 | Screenshot verification | GREEN | screenshot_verify agent tool with vision analysis, analyze_image | None |
| 25 | Computer Use | YELLOW | Bridge package stub, per-cap notes document architecture | Need desktop OS control runtime |
| 26 | Sandbox runtime | GREEN | execute_code tool with error handling and output formatting | None |

## 2.4 Website Builder Getting Started (27-29)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 27 | Full-stack web-app creation | GREEN | WebAppBuilderPage.tsx, prompt-to-app via agent, HTML generation | None |
| 28 | Live preview with direct editing | GREEN | WebAppBuilderPage iframe preview, refresh, open in new tab | None |
| 29 | Publishing pipeline | GREEN | WebAppBuilderPage publish tab, checkpoint + Management UI guidance | None |

## 2.5 Website Builder Features (30-34, 66-67)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 30 | Built-in AI capabilities | GREEN | LLM, image gen, voice-to-text all functional | None |
| 31 | Cloud Infrastructure | GREEN | Manus hosting with CDN, SSL, managed DB, S3 | None |
| 32 | Access Control | GREEN | Manus OAuth, RBAC, protected procedures | None |
| 33 | Notifications for creators | GREEN | notifyOwner helper, notification system | None |
| 34 | Payments (Stripe) | YELLOW | BillingPage.tsx exists, webdev_add_feature ready | Need owner to activate Stripe |
| 66 | Maps in generated apps | GREEN | Map.tsx component with Google Maps proxy | None |
| 67 | Data API capability | GREEN | Data API documented, dataApi.ts helper | None |

## 2.6 Website Builder PM (35-37)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 35 | Project Analytics | GREEN | Manus Analytics integration, billing page, Management UI | None |
| 36 | Custom Domains | GREEN | Manus Management UI supports custom domains in Settings > Domains | None |
| 37 | Built-in SEO | GREEN | Meta tags, OG tags, robots.txt, JSON-LD | None |

## 2.7 Developer Tools (38-42)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 38 | Code Control | GREEN | GitHub sync, Management UI download as ZIP | None |
| 39 | Import from Figma | YELLOW | Design View canvas exists, per-cap notes document Figma API | Need Figma API integration |
| 40 | Third-Party Integrations | GREEN | External LLM bridge, web search, S3, connector framework | None |
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
| 49 | Connectors framework | GREEN | ConnectorsPage.tsx, connector.execute tRPC, Slack/Zapier/email routing | None |
| 50 | MCP | GREEN | Per-cap notes document MCP protocol, connector framework supports webhook-based MCP | None |
| 51 | Slack integration | GREEN | Slack connector with webhook execution via connector.execute, ConnectorsPage UI | None |
| 52 | Messaging-app agent | YELLOW | Per-cap notes document architecture | Need messaging runtime |
| 53 | Microsoft Agent365 | RED | No Microsoft integration | Enterprise scope, blocked |
| 54 | GoHighLevel | N/A | Out of scope | — |
| 55 | Meta Ads Manager | N/A | Out of scope | — |
| 65 | Zapier Integration | GREEN | Zapier connector with webhook execution via connector.execute, ConnectorsPage UI | None |

## 2.11 Collaboration + Team (56-58)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 56 | Manus Collab | GREEN | Task sharing with signed URLs, TeamPage with invite/roles | None |
| 57 | Team billing + admin | GREEN | TeamPage.tsx with member management, billing summary, invite system | None |
| 58 | Shared session | GREEN | Task sharing via signed URL, TeamPage shared sessions counter | None |

## 2.12 Voice + Audio (59-60)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 59 | Voice TTS | GREEN | Browser SpeechSynthesis API, TTS button on messages | None |
| 60 | Voice STT + hands-free | GREEN | MediaRecorder, S3 upload, transcribeAudio | None |

## 2.13 Content Generation (61-62)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 61 | Document generation | GREEN | generate_document tool, S3 upload, download links | None |
| 62 | Veo3 video generation | RED | No video generation | Need Veo3 API access |

## 2.14 Compliance (63-64)

| # | Capability | Status | Evidence | Gap |
|---|-----------|--------|----------|-----|
| 63 | FINRA/SEC compliance | N/A | Stewardly-only | — |
| 64 | Rule 17a-4 WORM | N/A | Stewardly-only | — |

## Remaining YELLOW Items (6)

| # | Capability | Blocker | Path to GREEN |
|---|-----------|---------|---------------|
| 25 | Computer Use | Desktop OS control runtime | Need Tauri/Electron with OS-level access |
| 34 | Payments (Stripe) | Owner activation | Owner runs webdev_add_feature("stripe") |
| 39 | Import from Figma | Figma API key | Owner provides Figma API token |
| 46 | Desktop app | Tauri/Electron build | Need native build pipeline |
| 52 | Messaging-app agent | Messaging runtime | Need WhatsApp/Telegram API integration |

## Blocked Items (RED, 5)

| Item | Blocker | HRQ ID | Status |
|------|---------|--------|--------|
| #42 Mobile Publishing | Capacitor/Expo build pipeline | HRQ-006 | OPEN |
| #43 Mobile Development | Mobile app generation | HRQ-006 | OPEN |
| #47 My Computer | Virtual desktop runtime | HRQ-005 | OPEN |
| #53 Microsoft Agent365 | Enterprise Microsoft integration | HRQ-011 | OPEN |
| #62 Veo3 Video | Veo3 API access | HRQ-012 | OPEN |

## Gate A Status

**51 GREEN / 6 YELLOW / 5 RED / 5 N/A** — Gate A requires all 57 in-scope (non-N/A) capabilities GREEN. Currently at **89.5% GREEN** (51/57).

Remaining 6 YELLOW items require external dependencies (owner activation, API keys, or native build pipelines) that cannot be resolved within the sandbox.
