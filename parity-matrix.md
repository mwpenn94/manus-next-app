# Sovereign AI — Full Manus Capability Parity Matrix

## Methodology
Cross-referenced 83 replay links, official Manus documentation, native app features, and deep codebase audit of ~15,000 lines across agentStream.ts, agentTools.ts, TaskView.tsx, routers, and supporting modules.

## Priority 1: AI Reasoning Depth

| Capability | Manus | Our App | Gap | Priority |
|---|---|---|---|---|
| Multi-turn agent loop | ✅ Full iterative loop with tool use | ✅ 4-tier loop (speed/quality/max/limitless) | ✅ PARITY+ (speed=30, quality=100, max=200, limitless=∞) | — |
| Recursive convergence | ✅ Implicit in agent behavior | ✅ Explicit report_convergence tool with temp/scoring | ✅ PARITY+ (we have explicit convergence framework) | — |
| Tool orchestration | ✅ 20+ tools, parallel map() | ✅ 29 tools, wide_research + parallel_map + parallel_execute | ✅ PARITY+ (parallel_map for structured batch, parallel_execute for ad-hoc) | — |
| Deep research mode | ✅ Gemini Deep Research agent | ✅ deep_research_content tool + wide_research | ⚠️ Our deep research is LLM-only, not multi-agent | P1-HIGH |
| Anti-shallow guards | ✅ Implicit quality control | ✅ Explicit anti-shallow detection + forced continuation | ✅ PARITY+ | — |
| Stuck detection | ✅ Implicit | ✅ Explicit stuck detection with recovery prompts | ✅ PARITY+ | — |
| Memory extraction | ✅ Cross-task memory | ✅ Post-task memory extraction to DB | ✅ PARITY | — |
| Context compression | ✅ Automatic | ✅ compressConversationContext with selective preservation | ✅ PARITY+ (failure log, artifact URLs, key decisions preserved) | — |
| Reasoning transparency | ✅ Step-by-step in replay | ✅ show_thinking tool + tool events + progress steps | ✅ PARITY (show_thinking emits structured reasoning to UI) | — |

## Priority 2: App Development & Production + GitHub

| Capability | Manus | Our App | Gap | Priority |
|---|---|---|---|---|
| Webapp scaffolding | ✅ React/HTML/Landing templates | ✅ HTML + React + Landing templates | ✅ PARITY | — |
| Live preview | ✅ Embedded iframe preview | ✅ S3-hosted preview with iframe | ✅ PARITY | — |
| File CRUD in project | ✅ create/edit/read/list files | ✅ create_file/edit_file/read_file/list_files | ✅ PARITY | — |
| npm install | ✅ Package installation | ✅ install_deps tool | ✅ PARITY | — |
| Build & deploy | ✅ CloudRun deployment | ✅ S3 static deploy + CDN provisioning | ⚠️ No server-side deployment (SSR/API) | P2-HIGH |
| GitHub repo creation | ✅ gh CLI | ✅ create_github_repo tool | ✅ PARITY | — |
| GitHub edit (AI-powered) | ✅ Not native (manual) | ✅ github_edit with diff preview + confirm | ✅ PARITY+ | — |
| GitHub assess/audit | ✅ Not native | ✅ github_assess with 14-dimension scoring | ✅ PARITY+ | — |
| GitHub CI/CD generation | ✅ Not native | ✅ github_ops with workflow generation | ✅ PARITY+ | — |
| GitHub PR workflow | ✅ Not native | ✅ github_ops branch/pr/release/merge | ✅ PARITY+ | — |
| Checkpoint/rollback | ✅ webdev_save_checkpoint | ✅ Deployments panel with version history + rollback mutations | ✅ PARITY | — |
| Visual editor | ✅ Select element + edit in preview | ❌ Not implemented | ❌ MISSING | P2-MEDIUM |
| Custom domains | ✅ Manus.space + custom domains | ❌ Not implemented | ❌ MISSING | P2-LOW |
| Environment secrets | ✅ webdev_request_secrets | ✅ Secrets tab in Settings + per-project addEnvVar/deleteEnvVar | ✅ PARITY | — |
| Database integration | ✅ Drizzle + TiDB | ⚠️ No database for built webapps | ❌ MISSING for user-built apps | P2-HIGH |
| Server-side code | ✅ Express + tRPC | ⚠️ Static-only deployment | ❌ MISSING server deployment | P2-HIGH |

## Priority 3: Task Structure/Flow/UI/UX

| Capability | Manus | Our App | Gap | Priority |
|---|---|---|---|---|
| Task creation | ✅ Chat input → task | ✅ Home page input → task creation | ✅ PARITY | — |
| Streaming responses | ✅ SSE streaming | ✅ SSE with streamWithRetry | ✅ PARITY | — |
| Tool event display | ✅ Collapsible tool cards | ✅ Action cards with icons/labels | ⚠️ Need richer tool result previews | P3-MEDIUM |
| Artifact gallery | ✅ Right panel artifacts | ✅ Artifact gallery with tabs | ✅ PARITY | — |
| Browser preview | ✅ Live browser screenshot | ✅ Cloud browser with screenshots | ✅ PARITY | — |
| File preview | ✅ Code viewer | ✅ File viewer in workspace | ✅ PARITY | — |
| Terminal preview | ✅ Terminal output | ✅ Terminal panel in workspace | ✅ PARITY | — |
| Task replay/share | ✅ manus.im/share links | ✅ Share sheet + replay mode | ✅ PARITY | — |
| Task branching | ✅ Not native | ✅ Branch/compare views | ✅ PARITY+ | — |
| Progress indicators | ✅ Step progress bar | ✅ StepProgressIndicator + convergence | ✅ PARITY+ | — |
| Voice input | ✅ Not prominent | ✅ Voice capture + TTS | ✅ PARITY+ | — |
| Follow-up suggestions | ✅ Suggested actions | ✅ Categorized follow-up suggestions | ✅ PARITY | — |
| Task rating | ✅ Thumbs up/down | ✅ 5-star rating + feedback | ✅ PARITY+ | — |
| Orchestration graph | ✅ Not native | ✅ Live orchestration graph | ✅ PARITY+ | — |
| Memory timeline | ✅ Not native | ✅ Memory timeline visualization | ✅ PARITY+ | — |
| Site live/publish | ✅ Publish button | ✅ SiteLiveSheet + publish flow | ✅ PARITY | — |
| Mobile responsiveness | ✅ Mobile app | ⚠️ Responsive web but no native app | ❌ MISSING native mobile app | P3-HIGH |
| Sidebar navigation | ✅ Collapsible sidebar | ✅ Sidebar with task list | ✅ PARITY | — |
| Dark/light theme | ✅ Dark default | ✅ Dark theme with warm void aesthetic | ✅ PARITY | — |
| Keyboard shortcuts | ✅ ⌘K focus | ✅ ⌘K shortcut | ✅ PARITY | — |

## Priority 4: Native App Development & Production

| Capability | Manus | Our App | Gap | Priority |
|---|---|---|---|---|
| PWA support | ✅ Not native feature | ✅ PWA manifest + service worker generation | ✅ PARITY+ | — |
| Capacitor config | ✅ Not native feature | ✅ Capacitor config generation | ✅ PARITY+ | — |
| Expo config | ✅ Not native feature | ✅ Expo config generation | ✅ PARITY+ | — |
| Tauri scaffold | ✅ Not native feature | ✅ Tauri scaffold generation | ✅ PARITY+ | — |
| GitHub Actions CI | ✅ Not native feature | ✅ CI workflow generation per platform | ✅ PARITY+ | — |
| Build execution | ✅ Not native feature | ⚠️ Config-only, no actual builds | ❌ MISSING actual build pipeline | P4-HIGH |
| Store submission | ✅ Not native feature | ⚠️ Checklist only, no automation | ❌ MISSING store submission automation | P4-MEDIUM |
| Binary signing | ✅ Not native feature | ❌ Not implemented | ❌ MISSING | P4-LOW |
| Native testing | ✅ Not native feature | ❌ Not implemented | ❌ MISSING | P4-MEDIUM |

## Priority 5: Other Capabilities

| Capability | Manus | Our App | Gap | Priority |
|---|---|---|---|---|
| Web search | ✅ Multi-source search | ✅ DDG + Wikipedia + page fetch | ✅ PARITY | — |
| Image generation | ✅ AI image gen | ✅ generateImage integration | ✅ PARITY | — |
| Document generation | ✅ PDF/DOCX/XLSX | ✅ Multi-format doc gen | ✅ PARITY | — |
| Slide generation | ✅ Slides mode | ✅ HTML slide deck generation | ✅ PARITY | — |
| Data analysis | ✅ Pandas/analysis | ✅ analyze_data tool | ✅ PARITY | — |
| Code execution | ✅ Shell/Python | ✅ execute_code (JS) | ⚠️ JS only, no Python | P5-MEDIUM |
| Email/notifications | ✅ Notification system | ✅ notifyOwner integration | ✅ PARITY | — |
| Meeting notes | ✅ Not native | ✅ take_meeting_notes tool | ✅ PARITY+ | — |
| Design canvas | ✅ Image gen + overlay | ✅ design_canvas tool | ✅ PARITY | — |
| Cloud browser | ✅ Playwright browser | ✅ cloud_browser with Playwright | ✅ PARITY | — |
| Screenshot verify | ✅ Vision AI | ✅ screenshot_verify with LLM vision | ✅ PARITY | — |
| Connectors (Slack/Drive/etc) | ✅ OAuth connectors | ✅ use_connector tool | ✅ PARITY | — |
| Data pipeline | ✅ Not native | ✅ data_pipeline tool | ✅ PARITY+ | — |
| Automation orchestration | ✅ Scheduled tasks | ✅ automation_orchestrate + scheduler with cron/interval polling | ✅ PARITY | — |
| App lifecycle management | ✅ Not native | ✅ app_lifecycle tool | ✅ PARITY+ | — |
| Stripe/payments | ✅ Stripe integration | ✅ Stripe integration | ✅ PARITY | — |
| Scheduled tasks | ✅ Cron/interval | ✅ Scheduler polls automation_schedules, computes nextRunAt on create | ✅ PARITY (cron-parser + interval, execution via agent stream) | — |
| Video analysis | ✅ manus-analyze-video | ✅ analyze_video tool with LLM vision | ✅ PARITY | — |
| Speech-to-text | ✅ manus-speech-to-text | ✅ voiceTranscription integration | ✅ PARITY | — |
| Music generation | ✅ AI music gen | ✅ music.generate with degraded-delivery contract (prompt-only until audio API available) | ⚠️ PARTIAL (no audio generation API, returns structured prompt) | P5-LOW |
| PDF processing | ✅ PDF skill | ✅ document.parse for PDF text extraction + PDF generation | ✅ PARITY | — |

## Critical Gaps Summary (Ordered by Priority)

### P1 — AI Reasoning (Top Priority)
1. ~~**Loop depth limits**~~ — RESOLVED: 4-tier system (speed=30, quality=100, max=200, limitless=∞ turns)
2. ~~**Context compression**~~ — RESOLVED: compressConversationContext with selective preservation + WORKING MEMORY injection
3. ~~**Parallel subtask spawning**~~ — RESOLVED: parallel_map tool for structured batch processing + parallel_execute for ad-hoc
4. ~~**Richer thinking display**~~ — RESOLVED: show_thinking tool emits structured reasoning to UI

### P2 — App Development & Production
5. **Server-side deployment** — Support Express/API deployment, not just static
6. ~~**Checkpoint management UI**~~ — RESOLVED: Deployments panel with version history + rollback
7. **Database for user apps** — Allow user-built apps to have databases
8. ~~**Encrypted secrets management**~~ — RESOLVED: Secrets tab + per-project env var management

### P3 — Task Structure/Flow/UI/UX
9. **Native mobile app** — PWA wrapper or Capacitor build of our own app
10. **Richer tool result previews** — Inline previews for documents, images, code

### P4 — Native App Development
11. **Actual build pipeline** — Cloud builds for PWA/Capacitor/Expo
12. **Store submission automation** — Guided store submission flow

### P5 — Other
13. ~~**Actual cron execution**~~ — RESOLVED: Scheduler polls automation_schedules with nextRunAt, computes next run on create
14. **Python code execution** — Add Python runtime support
15. ~~**Video analysis**~~ — RESOLVED: analyze_video tool with LLM vision
16. ~~**PDF processing**~~ — RESOLVED: document.parse for PDF text extraction
17. ~~**Music generation**~~ — RESOLVED (partial): degraded-delivery contract, returns structured prompt

## Remaining Open Items (8 of original 17)

| # | Item | Priority | Effort | Notes |
|---|---|---|---|---|
| 1 | Deep research multi-agent | P1-HIGH | Large | Requires multi-agent orchestration for research |
| 2 | Server-side deployment | P2-HIGH | Large | Need CloudRun or similar for SSR/API |
| 3 | Visual editor | P2-MEDIUM | Large | Select-and-edit in preview iframe |
| 4 | Database for user apps | P2-HIGH | Medium | Provision per-app databases |
| 5 | Native mobile app | P3-HIGH | Large | PWA wrapper or Capacitor build |
| 6 | Richer tool result previews | P3-MEDIUM | Medium | Inline document/image previews |
| 7 | Actual build pipeline | P4-HIGH | Large | Cloud builds for native apps |
| 8 | Python code execution | P5-MEDIUM | Medium | Add Python runtime to execute_code |
