# Mobile Screenshot Audit — Manus Reference Library (IMG_7192–7245)

## Key Manus UI Patterns Observed

### 1. Home / Task Input (IMG_7192-7196)
- **Clean minimalist home**: centered greeting "Hello, [Name]", single large text input area
- **Dark theme**: true black/near-black background (#0a0a0a or similar), not gray
- **Input area**: rounded card with placeholder "Give Manus a task to work on...", attachment + voice buttons bottom-left, send button bottom-right
- **Category pills**: horizontal scrollable row — Featured, Research, Life, Data Analysis, Education, Productivity
- **Suggestion cards**: 2-column grid below categories, each with icon + title + description
- **Bottom nav**: 4 items — Home (house), Tasks (list), Billing (credit card), More (grid)
- **NO sidebar on mobile** — everything through bottom nav + "More" sheet
- **Package badges at bottom**: tiny pills showing "browser", "computer", "document", etc.

### 2. Task View / Chat (IMG_7198-7210)
- **Task chat is THE core interaction** — not separate capability pages
- **Left-aligned agent messages** with subtle card styling
- **"Manus's Computer" pane**: shows what agent is doing — browser screenshots, terminal, file edits
- **Real-time to-do list**: visible checklist of agent's plan steps, checked off as completed
- **Streaming text**: agent responses stream in real-time
- **Artifact cards**: inline cards for generated files (PDFs, slides, code, images)
- **Action buttons on artifacts**: Download, Preview, Share
- **Task header**: back arrow + task title + share button + more menu (3 dots)
- **NO separate pages for browser, slides, documents** — all happen WITHIN the task chat

### 3. Task List (IMG_7200-7202)
- **Simple list**: each task shows title, timestamp, status badge
- **Status badges**: "Completed", "Running", "Stopped"
- **Swipe actions**: delete on swipe
- **Search bar at top**
- **Clean, minimal — no complex filtering UI**

### 4. Billing / Subscription (IMG_7203-7208)
- **Credit display**: large number showing remaining credits, circular progress ring
- **Plan cards**: Free / Basic / Plus / Pro tiers in vertical stack
- **Each plan card**: price, credit amount, feature bullets, "Current Plan" or "Upgrade" button
- **Usage breakdown**: credits used today, credits remaining, reset time
- **Simple, clean layout** — no complex dashboards or charts

### 5. More Menu / Settings (IMG_7209-7220)
- **"More" bottom sheet or page**: grid of capability icons
- **Items**: Projects, Library, Skills, Schedule, Connectors, Settings, Help
- **NOT individual capability pages** — these are management/config surfaces
- **Settings page**: profile, theme, notifications, data, about sections
- **Profile**: avatar, name, email, plan badge
- **Connectors**: list of integrations (GitHub, Slack, Google Drive, etc.)

### 6. Projects / Web App Builder (IMG_7221-7228)
- **Projects list**: cards showing project name, last updated, status
- **Project detail**: preview iframe + chat for iteration
- **NOT a separate "Web App Builder" page** — it's a project view within the task flow
- **Deploy button**: prominent in project detail header

### 7. Library (IMG_7229-7232)
- **File browser**: list of files generated across tasks
- **Categories**: Documents, Images, Code, Data, All
- **Each file**: thumbnail/icon, name, task source, date
- **Download/share actions**

### 8. Skills (IMG_7233-7236)
- **Skills list**: cards with icon, name, description
- **Create skill button**: prominent CTA
- **Skill detail**: description, trigger phrases, configuration

### 9. Schedule (IMG_7237-7239)
- **Scheduled tasks list**: name, frequency, next run, status
- **Create schedule**: task prompt + cron/interval picker

### 10. Replay (IMG_7240-7243)
- **Session replay**: video-like playback of agent actions
- **Timeline scrubber**: horizontal timeline with action markers
- **Step-by-step**: each action shown with timestamp

### 11. Design View (IMG_7244-7245)
- **Image canvas**: full-screen image with region selection
- **Edit toolbar**: select region, describe change, apply
- **This is WITHIN a task**, not a separate page

## CRITICAL REDUNDANCY FINDINGS

### Pages We Built That DON'T Exist in Manus as Separate Pages:
1. **BrowserPage** — Manus shows browser WITHIN task view, not as standalone page
2. **ComputerUsePage** — "My Computer" is a capability triggered from task, not a page
3. **DocumentStudioPage** — Documents are created WITHIN tasks, viewed in Library
4. **MusicStudioPage** — Music generation happens WITHIN tasks
5. **DataAnalysisPage** — Data analysis happens WITHIN tasks
6. **SlidesPage** — Slides are created WITHIN tasks
7. **VideoGeneratorPage** — Video generation happens WITHIN tasks
8. **DeepResearchPage** — Research is a task type, not a separate page
9. **DesktopAppPage** — Desktop app is a deployment option, not a standalone builder
10. **WebAppBuilderPage** — This IS a Manus feature but accessed through Projects, not as separate page
11. **FigmaImportPage** — Not a Manus feature at all
12. **ClientInferencePage** — Not a Manus feature
13. **QATestingPage** — Not a Manus feature
14. **DataPipelinesPage** — Not a Manus feature
15. **MeetingsPage** — Not a standalone Manus page
16. **MessagingAgentPage** — Not a standalone Manus page
17. **MailManusPage** — This is a feature but accessed differently (email forwarding)
18. **ConnectDevicePage** — "My Computer" desktop setup, not a separate page
19. **AnalyticsPage** — Not a Manus user-facing page
20. **SovereignDashboard** — Not a Manus concept
21. **HeroIllustration on every page** — Manus has NO hero illustrations on capability pages

### Pages That DO Align with Manus:
1. **Home** — YES, the main task input page ✓
2. **TaskView** — YES, the core interaction surface ✓
3. **BillingPage** — YES, subscription/credits ✓
4. **ProjectsPage** — YES, web app projects list ✓
5. **Library** — YES, file browser across tasks ✓
6. **SkillsPage** — YES, skills management ✓
7. **SchedulePage** — YES, scheduled tasks ✓
8. **SettingsPage** — YES, user settings ✓
9. **ProfilePage** — YES, user profile ✓
10. **ConnectorsPage** — YES, integrations ✓
11. **GitHubPage** — YES, GitHub integration ✓
12. **HelpPage** — YES, help/support ✓
13. **ReplayPage** — YES, session replay ✓
14. **SharedTaskView** — YES, shared task viewing ✓
15. **DiscoverPage** — Partially (Manus has suggestion cards on home, not a separate discover page)

### Visual Issues Visible in Screenshots:
- Some pages show content cut off by bottom nav (known issue, supposedly fixed)
- HeroIllustration banners on capability pages look nothing like Manus — Manus is minimal
- Too many navigation items in "More" menu — Manus has ~7, we have 20+
- Color scheme may be slightly off — Manus uses very dark blacks, not grays
- Font weight/sizing differs — Manus uses lighter weights, more whitespace
- Card styling differs — Manus cards are more subtle, less bordered

## ACTION PLAN

### Phase 1: Remove/Consolidate Redundant Pages
- Remove standalone capability pages that should be task-initiated
- Consolidate into the task flow (capabilities triggered from task chat)
- Keep only the pages that match Manus's actual navigation structure

### Phase 2: Fix Navigation
- Reduce "More" menu to match Manus: Projects, Library, Skills, Schedule, Connectors, Settings, Help
- Remove capability pages from navigation entirely

### Phase 3: Visual Alignment
- Remove HeroIllustration from all pages (Manus doesn't have these)
- Tighten dark theme — true blacks, less gray
- Reduce card borders, increase whitespace
- Match font weights and sizing

### Phase 4: Empty States + Stripe
- Add empty states to aligned pages (tasks, library, projects)
- Wire Stripe subscription flow on billing page
