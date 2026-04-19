# EXCEED_ROADMAP.md — Beyond-Parity Targets

> Per §E: For every capability at GREEN, define a concrete "exceed" target that would push Manus Next beyond Manus Pro parity. For YELLOW/RED capabilities, define the path to GREEN plus the exceed target.

**Last updated:** April 18, 2026 | **Capabilities covered:** 67/67

---

## Agent Core (Caps 1-10)

| # | Capability | Status | Exceed Target | Effort | Impact |
|---|-----------|--------|---------------|--------|--------|
| 1 | Chat Mode | GREEN | Multi-model selection (GPT-4o, Claude, Gemini) per-conversation with automatic prompt adaptation | 20h | Model flexibility |
| 2 | Agent Mode | GREEN | Extend MAX_TOOL_TURNS to 25+ with checkpoint/resume for long-running tasks spanning hours | 12h | Complex task completion |
| 3 | 1.6 Max tier | GREEN | Add "Ultra" tier with 50+ turns, parallel tool execution, and cost cap alerts | 8h | Power users |
| 4 | Speed/Quality Mode | GREEN | Auto-mode selection based on query complexity analysis (simple→speed, complex→max) | 6h | UX intelligence |
| 5 | Wide Research | GREEN | Scale to 100+ parallel sources with deduplication, citation graph, and confidence scoring | 15h | Research depth |
| 6 | Cross-session memory | GREEN | Semantic memory search with embedding similarity, memory decay, and importance ranking | 12h | Memory quality |
| 7 | Task sharing | GREEN | Add commenting, reactions, and collaborative annotation on shared tasks | 10h | Collaboration |
| 8 | Task replay | GREEN | Export replay as video/GIF, add branching replay (explore alternate paths) | 8h | Content creation |
| 9 | Notifications | GREEN | Push notifications via Web Push API, email digests, Slack/Discord webhooks | 10h | Reach |
| 10 | One-shot success | GREEN | Predictive cost estimation with historical accuracy tracking per task type | 6h | Cost transparency |

## Features (Caps 11-21)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 11 | Projects | GREEN | — | Project templates, auto-generated project briefs from conversation history | 8h |
| 12 | Manus Skills | YELLOW | Build skill execution engine with sandboxed runtime | Community skill marketplace with ratings, reviews, and one-click install | 30h |
| 13 | Agent Skills | YELLOW | Implement Agent Skills protocol parser and executor | Auto-discover skills from GitHub repos, version management, skill composition | 25h |
| 14 | Project Skills | YELLOW | Bind skills to projects with team-level permissions | Skill analytics (usage, success rate), auto-suggest skills per project type | 15h |
| 15 | Design View | YELLOW | Integrate Fabric.js canvas for visual editing | AI-powered layout suggestions, component library, export to Figma | 40h |
| 16 | Manus Slides | YELLOW | Build slide generation backend with template engine | Real-time collaborative editing, presenter mode, export to PPTX/PDF | 30h |
| 17 | Scheduled Tasks | GREEN | — | Natural language scheduling ("every Monday at 9am"), dependency chains between tasks | 10h |
| 18 | Data Analysis | GREEN | — | Interactive chart builder, pivot tables, SQL query interface with natural language | 20h |
| 19 | Multimedia | GREEN | — | Video generation (Veo3), audio editing, image batch processing | 25h |
| 20 | Mail Manus | YELLOW | Integrate SMTP/IMAP with OAuth2 | AI email drafting, smart reply, email analytics, thread summarization | 20h |
| 21 | Meeting Minutes | YELLOW | Build meeting-specific UI with speaker diarization | Real-time transcription, action item extraction, calendar integration | 15h |

## Browser + Computer (Caps 22-26)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 22 | Cloud Browser | YELLOW | Deploy headless Chrome with Playwright in cloud runtime | Multi-tab browsing, session persistence, cookie management, proxy rotation | 40h |
| 23 | Browser Operator | YELLOW | Wire Playwright automation to agent tool calls | Record-and-replay macros, visual element selection, form auto-fill | 30h |
| 24 | Screenshot verification | YELLOW | Connect browser screenshots to vision model pipeline | Visual diff testing, layout regression detection, accessibility overlay | 15h |
| 25 | Computer Use | YELLOW | Implement desktop OS control via bridge package | Multi-monitor support, application-specific macros, file system navigation | 50h |
| 26 | Sandbox runtime | GREEN | — | Multi-language support (Python, Node, Rust, Go), persistent environments, package caching | 20h |

## Website Builder (Caps 27-34, 66-67)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 27 | Web-app creation | YELLOW | Build webapp-builder orchestrator with template system | AI-driven full-stack generation from natural language spec, component library | 40h |
| 28 | Live preview | YELLOW | Implement iframe preview with hot reload | Direct visual editing (click-to-edit), responsive preview at multiple breakpoints | 25h |
| 29 | Publishing | YELLOW | Wire publish-from-chat flow to Manus hosting | One-click deploy to custom domains, A/B testing, rollback with traffic splitting | 15h |
| 30 | Built-in AI | GREEN | — | Model marketplace, fine-tuned models per use case, RAG with project documents | 25h |
| 31 | Cloud Infra | GREEN | — | Multi-region deployment, auto-scaling, CDN edge caching, cost optimization dashboard | 20h |
| 32 | Access Control | GREEN | — | Fine-grained RBAC with custom roles, API key management, audit logging | 12h |
| 33 | Notifications | GREEN | — | Multi-channel (email, SMS, push, Slack), notification templates, delivery analytics | 10h |
| 34 | Payments | YELLOW | Owner activates Stripe via webdev_add_feature | Subscription management, usage-based billing, invoice generation, revenue analytics | 15h |
| 66 | Maps | GREEN | — | Custom map styles, heatmap layers, route optimization, geofencing | 10h |
| 67 | Data API | GREEN | — | GraphQL endpoint generation, API rate limiting, webhook subscriptions | 15h |

## Website Builder PM (Caps 35-37)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 35 | Analytics | GREEN | — | Custom event tracking, funnel analysis, cohort retention, A/B test results | 15h |
| 36 | Custom Domains | YELLOW | Owner configures in Management UI | Automatic SSL provisioning, DNS management, subdomain routing | 5h |
| 37 | SEO | GREEN | — | AI-generated meta descriptions, structured data validation, sitemap auto-generation | 8h |

## Developer Tools (Caps 38-42)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 38 | Code Control | GREEN | — | Branch management, PR reviews, merge conflict resolution, code search | 15h |
| 39 | Figma Import | YELLOW | Implement Figma API integration for design-to-code | Bidirectional sync (code changes reflect in Figma), design token extraction | 30h |
| 40 | Third-Party | GREEN | — | Connector marketplace, OAuth2 flow builder, webhook management dashboard | 20h |
| 41 | GitHub | GREEN | — | GitHub Actions integration, issue tracking sync, PR auto-generation from tasks | 12h |
| 42 | Mobile Publish | RED | Implement Capacitor/Expo build pipeline | App Store submission automation, OTA updates, crash reporting | 50h |

## Mobile (Caps 43-45)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 43 | Mobile Dev | RED | Build mobile app generation with React Native/Expo | Cross-platform component library, native module bridging, device testing | 60h |
| 44 | Mobile Client | N/A | — | — | — |
| 45 | Mobile Web | GREEN | — | PWA install prompt, offline-first with sync, gesture navigation | 8h |

## Desktop (Caps 46-48)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 46 | Desktop App | YELLOW | Build Tauri/Electron wrapper with native menus | System tray integration, global hotkeys, file system watcher, auto-update | 30h |
| 47 | My Computer | RED | Implement virtual desktop environment | Multi-window management, clipboard sync, drag-and-drop file transfer | 60h |
| 48 | Version Rollback | GREEN | — | Visual diff between versions, selective file rollback, branch-based versioning | 10h |

## Integrations (Caps 49-55, 65)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 49 | Connectors | YELLOW | Build connector runtime engine with OAuth2 flows | Visual connector builder, data mapping UI, error retry with backoff | 30h |
| 50 | MCP | YELLOW | Implement MCP server runtime | MCP marketplace, auto-discovery, protocol versioning | 25h |
| 51 | Slack | YELLOW | Implement Slack API with bot user | Slash commands, interactive messages, channel-specific agents | 15h |
| 52 | Messaging Agent | YELLOW | Build messaging runtime with adapter pattern | Multi-platform (Slack, Discord, Teams, Telegram), conversation threading | 25h |
| 53 | Microsoft 365 | RED | Enterprise Microsoft Graph API integration | SharePoint, OneDrive, Outlook, Teams deep integration | 40h |
| 54 | GoHighLevel | N/A | — | — | — |
| 55 | Meta Ads | N/A | — | — | — |
| 65 | Zapier | YELLOW | Implement Zapier webhook integration | Bi-directional triggers, Zap templates, usage analytics | 12h |

## Collaboration + Team (Caps 56-58)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 56 | Collab | YELLOW | Implement WebSocket broadcast for real-time viewing | Cursor presence, collaborative editing, role-based permissions per task | 25h |
| 57 | Team Billing | YELLOW | Build team billing backend with seat management | Usage-based billing per team member, cost allocation, budget alerts | 20h |
| 58 | Shared Session | YELLOW | Implement real-time session sync via WebSocket | Session handoff, spectator mode, session recording for training | 15h |

## Voice + Audio (Caps 59-60)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 59 | Voice TTS | GREEN | — | Edge TTS with optional voices, voice cloning, SSML support, multi-language | 12h |
| 60 | Voice STT | GREEN | — | Hands-free continuous mode, wake word detection, noise cancellation | 10h |

## Content Generation (Caps 61-62)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 61 | Documents | GREEN | — | Multi-format export (DOCX, PDF, LaTeX), template library, collaborative editing | 15h |
| 62 | Veo3 Video | RED | Obtain Veo3 API access | Text-to-video with style transfer, video editing, multi-clip composition | 30h |

## Compliance (Caps 63-64)

| # | Capability | Status | Path to GREEN | Exceed Target | Effort |
|---|-----------|--------|---------------|---------------|--------|
| 63 | FINRA/SEC | N/A | Stewardly-only scope | — | — |
| 64 | WORM | N/A | Stewardly-only scope | — | — |

---

## Summary

| Metric | Value |
|--------|-------|
| Total capabilities | 67 |
| GREEN with exceed target | 36 |
| YELLOW with path + exceed | 21 |
| RED with path + exceed | 5 |
| N/A (out of scope) | 5 |
| Total estimated effort (all exceeds) | ~1,200 hours |
| Priority exceed targets (next sprint) | Caps 1, 4, 5, 6, 17, 45, 59, 60 |
