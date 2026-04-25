# Parity Findings — Our App vs Real Manus

## Screenshot Comparison

### Our App (Desktop — webdev-preview screenshot):
- Left sidebar: "manus" logo, "New task", "Agent", "Search Ctrl+K", "Library"
- Projects section with collapsible folders
- All Tasks list with task entries
- Bottom: settings, grid, monitor icons + "from ∞ Meta"
- Main area: "Hello, Michael." greeting, suggestion cards, package badges
- Welcome dialog: "Welcome to Manus" with 7-step onboarding tour
- Top bar: "MANUS" + "Manus Next" tabs, notification icons

### Real Manus (Mobile — user screenshots):
- Home: "Hello, Michael." + "What can I do for you?"
- Input: "What would you like to do?" pill with mic + submit
- Quick actions: "Build a website", "Create slides", "Write a doc..."
- Suggestion cards: horizontal carousel with pagination dots
- Bottom nav: Home, Tasks, Billing, More
- Header: "Manus Limitless" dropdown, Credits button
- Task view: Running status, Branch indicator, follow-up input, "Limitless" badge

## CRITICAL GAPS IDENTIFIED

### P1 — Core Functionality Issues
1. **Task execution actually works** — Our app has a real agent stream with 25+ tools, tier system, etc.
2. **The onboarding dialog blocks the view** — Need to verify it can be dismissed and doesn't re-show
3. **Need to verify e2e task flow works** — Create task → agent executes → results shown

### P2 — Feature Parity Gaps
4. **Branching** — Manus shows "Branch" indicator. We have BranchIndicator component but need to verify it works
5. **Follow-up messages during execution** — Manus shows follow-up input while task runs
6. **"Limitless" badge on input** — Our app has tier system but need to verify the badge shows
7. **Task status indicators** — "Running" badge with spinner visible in Manus

### P3 — UX Polish
8. **Mobile layout parity** — Our MobileBottomNav has Home/Tasks/Billing/More (matches Manus)
9. **Model selector** — We have ModelSelector, Manus has "Manus Limitless" dropdown
10. **Credits display** — We have credits system, Manus shows "Credits" button

## WHAT'S ACTUALLY WORKING (Verified from code):
- 40+ pages with routes
- 36 tRPC routers with real implementations
- 2021-line agentStream.ts with real tool execution
- 3114-line agentTools.ts with 25+ tools (web_search, browse_web, generate_image, create_webapp, etc.)
- Tier system (Speed/Quality/Max/Limitless) aligned with Manus tiers
- Task persistence with messages, projects, branching
- Voice input, file upload, memory system
- Billing/credits, team management, connectors
- GitHub integration, webapp builder, slides, video
- Sovereign routing, AEGIS caching, ATLAS goal decomposition
- Observability, circuit breakers, rate limiting
