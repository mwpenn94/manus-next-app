# Standalone App Testing — April 19, 2026

## TASK VIEW (Completed Task)

### What's Working Well
- Task title in header bar with "Completed" badge (green)
- Cost display "~$0.15" next to title
- Speed/Quality toggle visible
- Model selector "Max" visible
- Workspace panel on right: Browser, Code, Terminal, Images tabs
- "Session ended" shown in workspace when task is done
- Chat messages with markdown formatting (bold, headers, paragraphs)
- "1 steps completed" collapsible section
- "Listen" and "Regenerate" action buttons below response
- Input area at bottom: "Send a message..." with paperclip, mic, send icons
- "Manus Next may make mistakes. Verify important information." disclaimer
- Bookmark and share icons in header
- Feedback button (bottom-right)

### Issues Found
1. Task header shows "~$0.15 a..." — the cost text appears truncated
2. No "Task completed" inline badge in chat (like Manus has) — only in header
3. No suggested follow-ups after completion
4. No star rating for task quality
5. Workspace shows "No browser activity yet" — could show final state instead

### Sidebar Observations
- All nav items visible: Usage & Billing, Memory, Projects, Schedules, Replay, Skills
- Additional items visible when scrolled: Slides, Design, Meetings, Connectors, App Builder, Team, Computer, Figma Import, Desktop App, Messaging, Settings
- User profile at bottom: "Michael Penn" with initials avatar and sign-out icon

## TASK VIEW — DETAILED OBSERVATIONS (scrolled to bottom)

### Header Bar
- Task title (truncated with "...")
- "Completed" green badge
- "~$0.15 a..." — cost text truncated (BUG: needs more space or tooltip)
- "quality" text below Speed/Quality/Max toggle — looks like a label, not a bug
- Speed | Quality | Max toggle buttons with tooltips
- Share, Bookmark, More options buttons

### Chat Area
- User message with timestamp "01:35 PM"
- Agent response with paw icon + "manus next" label + timestamp
- Full markdown rendering (headers, bold, paragraphs)
- "1 steps completed" collapsible section
- Step detail: "Searching 'Casting Crowns Does Anybody Hear Her lyrics meaning'" with "show" button
- "Listen" and "Regenerate" buttons below response

### Input Area
- "Send a message..." placeholder
- Paperclip (attach), microphone (voice), send button
- "Manus Next may make mistakes. Verify important information." disclaimer

### Workspace Panel (Right)
- "Manus's Computer" header with expand button
- Tabs: Browser, Code, Terminal, Images
- "No browser activity yet" with placeholder text
- "Session ended" indicator

### Issues Found in Task View
1. Cost text "~$0.15 a..." is truncated — the "a..." seems like a rendering issue
2. No inline "Task completed" badge in chat body (only in header)
3. No suggested follow-ups after task completion
4. No star rating for task quality feedback
5. The "quality" label below the toggle looks odd — should it be hidden or styled differently?
6. Workspace shows "No browser activity yet" even for completed tasks — could show summary

## BILLING PAGE — LOOKS GREAT
- Usage stats: Total Tasks (14), Completed (9), Running (1), Errors (0)
- Completion Rate: 64% with green progress bar
- Plans & Credits section with 4 cards:
  - Manus Next Pro Monthly ($39/mo) — Subscribe button
  - Manus Next Pro Yearly ($374/yr, save 20%) — Subscribe button
  - Manus Next Team Monthly ($99/mo) — Subscribe button
  - 100 Agent Credits ($10) — Buy button
- Test card notice at bottom
- Recent Activity list with task history
- LOOKS GOOD — no issues found

## MEMORY PAGE — LOOKS GREAT
- "Memory" header with "7 entries" badge and back arrow
- Description text explaining memory persistence
- Search bar for memories
- "Add Memory Entry" button
- Memory entries with: title, source badge (user/auto), description, timestamp
- Entries show both user-created ("test-vu-form") and auto-generated memories
- Clean card layout with good spacing
- LOOKS GOOD — no issues found

## PROJECTS PAGE — LOOKS GOOD
- Empty state with "No projects yet" and "Create your first project" CTA
- "New Project" button top-right
- Clean empty state design

## SCHEDULES PAGE — 404 ERROR (BUG!)
- Shows 404 page instead of schedules content
- The sidebar link goes to /schedules but route doesn't exist
- NEEDS FIX: Either add the route or remove the nav item

## REPLAY PAGE — LOOKS GOOD
- "Session Replay" header with description
- Empty state: "Select a task to replay" with icon
- Clean design, appropriate empty state

## SKILLS PAGE — LOOKS GREAT
- "Skills Library" header with "0 installed" counter
- Search bar for skills
- Category filter tabs: All, Research, Development, Creative, Productivity, Analytics, Core, Communication
- Skills cards in 2-column grid with: name, "Available" badge, description, rating (stars), category tag, Install button
- 12 skills visible: Web Search, Wide Research, Code Execution, Image Generation, Document Generation, Data Analysis, Memory Search, Image Analysis, Slide Generation, Email Drafting, Meeting Notes, Web Browsing
- LOOKS GREAT — professional skill marketplace feel

## CONNECTORS PAGE — LOOKS GREAT
- "Connectors" header with "0 connected" counter
- Search bar for connectors
- 8 connector cards in 2-column grid: Slack, GitHub, Google Drive, Notion, Google Calendar, Zapier, Email (SMTP), MCP Protocol
- Each card has: emoji icon, name, status indicator (circle), description, category tag, Connect button
- Clean professional layout
- LOOKS GOOD — no issues found

## SETTINGS PAGE — LOOKS GREAT
- Left sub-nav: Account, General, Capabilities, Bridge
- General tab showing:
  - Notifications toggle (switch)
  - Sound effects toggle
  - Auto-expand actions toggle
  - Compact mode toggle
  - Default System Prompt textarea with "Save prompt" button
  - "Using built-in default" indicator
- Clean professional layout with proper toggle switches
- LOOKS GOOD — no issues found

## OVERALL STANDALONE TEST SUMMARY

### Pages Working Well (No Issues)
- Home page
- Task view (completed task)
- Usage & Billing
- Memory
- Projects
- Replay
- Skills Library
- Connectors
- Settings

### Issues Found
1. SCHEDULES PAGE — 404 error (route missing)
2. Task header cost text truncated ("~$0.15 a...")
3. No inline "Task completed" badge in chat body
4. No suggested follow-ups after task completion
5. No star rating for task quality
6. "quality" label below Speed/Quality/Max toggle looks odd
7. Express trust proxy warning in console (not user-facing but should fix)

## SLIDES PAGE — LOOKS GREAT
- "Slides" header with "0 decks" counter
- "Generate New Presentation" card with topic input and slide count (default 8)
- Generate button
- Empty state: "No presentations yet. Generate your first one above."
- LOOKS GOOD

## DESIGN PAGE — LOOKS GREAT
- "Untitled Design" editable title with back arrow
- Header: History (0), Save, Export, Poster dropdown
- Left panel: Generate Image (textarea + Generate button), Add Text (input + Add Text Layer), Layers (0)
- Right panel: Canvas area "Poster — 800×1200" with placeholder
- Clean design tool layout
- LOOKS GOOD

## MEETINGS PAGE — LOOKS GREAT
- "Meeting Notes" header with back arrow
- "Capture Meeting" section with title input
- Tabs: Record, Paste Transcript, Upload
- Microphone icon with "Start Recording" button
- "Recent Meetings" sidebar: "No meetings yet"
- LOOKS GOOD

## REMAINING PAGES TO TEST
Need to check: App Builder, Team, Computer, Figma Import, Desktop App, Messaging

## APP BUILDER PAGE — 404 ERROR (BUG!)
- Shows 404 instead of content
- Sidebar nav link goes to /app-builder but route doesn't exist

## TEAM PAGE — LOOKS GREAT
- "Teams" header with back arrow
- "Create Team" card with name input + Create button
- "Join Team" card with invite code input + Join button
- Empty state: "No teams yet. Create one or join with an invite code."
- LOOKS GOOD

## COMPUTER PAGE — LOOKS GREAT
- "Manus Desktop" header
- Top taskbar: Terminal, Text Editor, Browser, Files, Screenshot, Connect Device
- Center: "Open an application from the taskbar to get started"
- Bottom dock: Terminal, Text Editor, Browser, Files icons
- Desktop-like UI feel
- LOOKS GOOD

## APP BUILDER PAGE — 404 ERROR (BUG!)
- Same as Schedules — route missing

## MESSAGING PAGE — LOOKS GREAT
- "Messaging Agent" header with back arrow and "Add Connection" button
- Inbound Webhook URL with copy button
- "Connections (0)" with empty state
- "Test Message" panel with "Select a connection to send a test message"
- LOOKS GOOD

## FIGMA IMPORT AND DESKTOP APP — need to check

## FIGMA IMPORT PAGE — LOOKS GREAT
- "Import from Figma" header with back arrow
- Figma URL input, Design Description textarea, "Import & Generate" button
- Preview panel: "Import a design to see results"
- LOOKS GOOD

## DESKTOP APP PAGE — 404 ERROR (BUG!)
- Route missing for /desktop

## FINAL 404 PAGES SUMMARY
Three sidebar nav items lead to 404:
1. /schedules
2. /app-builder  
3. /desktop
