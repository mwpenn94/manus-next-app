# Landscape Pass Findings — Recursive Optimization

## Summary
- 46 pages, 54 components, 50 routers, 176 test files, 149,964 LOC
- 4,841 tests all passing, TypeScript clean
- Scheduler poll error resolved (tables exist, no current errors)

## Priority-Ranked Findings (Expected Value-Add)

### TIER 1 — HIGH VALUE (Manus Parity Critical)

**F1: 24 routers have ZERO test coverage**
- aegis, appPublish, branches, browserAutomation, cache, dataAnalysis, design, device, file, library, llm, mobileProject, music, ogImage, payment, research, skill, slides, systemHealth, team, templates, usage, videoWorker, webappProject
- Impact: Production reliability, regression prevention
- Fix: Write test suites for each

**F2: 21 pages have LOW mobile responsiveness (≤2 breakpoints)**
- BillingPage, BrowserPage, ClientInferencePage, ConnectDevicePage, ConnectorDetailPage, ConnectorsPage, DeepResearchPage, DeployedWebsitesPage, DesktopAppPage, DocumentStudioPage, FigmaImportPage, HelpPage, MeetingsPage, MessagingAgentPage, MusicStudioPage, ProfilePage, ProjectsPage, SchedulePage, TeamPage, VideoGeneratorPage, WebhooksPage
- Impact: Mobile UX parity with Manus (three-pane responsive collapse)
- Fix: Add responsive breakpoints for mobile-first layout

**F3: 20+ `as any` casts in agentStream.ts (non-test, non-core)**
- Lines 692, 847, 852, 853, 866, 1061, 1264, 1340, 1359, 1391, 1512, 1517, 1788, 1793, 1825, 1828, 1877, 1952, 2145
- Impact: Type safety, runtime error prevention
- Fix: Define proper types for tool_calls, message content arrays

### TIER 2 — MEDIUM VALUE (Quality & Polish)

**F4: Accessibility baseline is thin**
- 69 aria attributes across 46 pages (avg 1.5/page)
- 58 focus/keyboard handlers across 46 pages (avg 1.3/page)
- Impact: WCAG compliance, keyboard navigation
- Fix: Add aria-labels to all interactive elements, focus management

**F5: 6 hardcoded colors in pages (5 hex, 1 rgb)**
- Impact: Theme consistency, dark/light mode support
- Fix: Replace with CSS variable tokens

**F6: Components with zero mobile breakpoints**
- ActiveToolIndicator, BranchCompareView, BranchIndicator, BranchTreeView, HandsFreeOverlay, ShareDialog
- Impact: Mobile usability for core interaction components
- Fix: Add responsive classes

### TIER 3 — LOW VALUE (Cleanup)

**F7: `as any` casts in agentStream.ts**
- Already identified above, lower priority than test coverage
- Can be addressed during Depth pass

**F8: Scheduler poll error (RESOLVED)**
- Tables exist in DB, no current errors in dev server log
- Was transient connection issue, self-healed

## Manus Parity Gap Analysis

| Manus Feature | Our Status | Gap |
|---|---|---|
| Dark-mode-first palette | ✅ Implemented | Minor token hardcoding |
| Serif+system-sans typography | ✅ Implemented | Verified |
| Background-thinking shimmer | ✅ Implemented | Verified |
| Colleague-grade tone | ✅ System prompt enforced | Verified |
| Universal composer | ✅ Multimodal input | Verified |
| Task decomposition visibility | ✅ ExecutionPlanDisplay | Verified |
| Specialized workflows | ✅ Design, Music, Video, Slides, Docs | Verified |
| Connector system | ✅ 49+ connectors | Verified |
| Trust/consent model | ✅ 5 trust boundaries | Verified |
| Collaboration/async | ✅ Share, replay, notifications | Verified |
| Mobile three-pane collapse | ⚠️ Partial — 21 pages need work | F2 |
| GitHub repo creation | ✅ Just added | Verified |
| Test coverage | ⚠️ 24 routers untested | F1 |
| Type safety | ⚠️ 20+ as any casts | F3 |
| Accessibility | ⚠️ Thin baseline | F4 |

## Next Pass: DEPTH
Target F1 (test coverage) and F2 (mobile responsiveness) as highest-value items.
Use parallel workers for F1 (24 independent test files can be written in parallel).
