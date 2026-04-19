# Virtual User Walkthrough Notes

## Homepage (/)
- **Visual**: Dark theme, warm void aesthetic. "Hello. What can I do for you?" greeting.
- **Sidebar**: Logo, search, filter tabs (All/Running/Done/Error), task list, nav links
- **Nav links**: Usage & Billing, Memory, Projects, Schedules, Replay, Skills
- **Input**: Textarea with paperclip, mic, submit buttons
- **Categories**: Featured, Research, Life, Data Analysis, Education, Productivity
- **Suggestion cards**: 4 visible (Research AI, Analyze Market, Landing Page, Course Material)
- **Footer**: "POWERED BY" badges strip
- **User**: Michael Penn logged in, sign-out button visible
- **Issues found**: None so far — clean, functional homepage

## Task List (sidebar)
- 4 tasks visible with status indicators (running spinner, done checkmark)
- Delete buttons on each task
- Timestamps showing relative time (4h ago, 12h ago, 14h ago)

## TaskView (/task/:id)
- **Header**: Task title, Running status badge, cost (~$0.15), quality mode selector (Speed/Quality/Max), Share/Bookmark/More buttons
- **Chat panel**: Full conversation with user messages and agent responses
- **Agent steps**: Collapsible step indicators (Searching, Browsing, Generating, Reasoning, Writing document, Wide research)
- **Listen button**: Audio playback for responses
- **Workspace panel**: Browser/Code/Terminal/Images tabs with live content
- **Browser tab**: Shows live browsing with URL bar, BBC News screenshot visible
- **Images tab**: Shows "4" count
- **Input area**: Message textarea with paperclip, mic, send buttons
- **Issues found**: 
  - ISSUE-1: Task still shows "Running" status — may be stuck or the status indicator doesn't auto-complete

## Manus Comparison Notes (TaskView)
- Manus shows: task title, steps completed count, expandable tool execution steps — WE HAVE THIS
- Manus shows: workspace with browser/code/terminal tabs — WE HAVE THIS
- Manus shows: cost estimate — WE HAVE THIS (~$0.15)
- Manus shows: quality mode selector — WE HAVE THIS (Speed/Quality/Max)
- Manus shows: share/bookmark — WE HAVE THIS

## Usage & Billing (/billing)
- Stats cards: Total Tasks (13), Completed (7), Running (2), Errors (0)
- Completion Rate: 54% with progress bar
- Plans & Credits: 4 Stripe products (Pro Monthly $39, Pro Yearly $374, Team $99, 100 Credits $10)
- Subscribe/Buy buttons on each plan
- Test card hint: 4242 4242 4242 4242
- Recent Activity table with status, title, date
- VERDICT: FUNCTIONAL, matches Manus billing page

## Memory (/memory)
- 6 entries with auto tag, search, add button
- Entries show title, content, timestamp
- Auto-extracted from conversations (document pref, live demos, NASCAR, D&D)
- VERDICT: FUNCTIONAL, matches Manus memory feature

## Projects (/projects)
- Empty state with "No projects yet" and "Create your first project" CTA
- New Project button in header
- VERDICT: FUNCTIONAL empty state

## Schedules (/schedule)
- Empty state with "No scheduled tasks yet"
- New Schedule button
- How scheduling works explanation card
- VERDICT: FUNCTIONAL empty state

## Connectors (/connectors)
- 8 connectors: Slack, GitHub, Google Drive, Notion, Google Calendar, Zapier, Email SMTP, MCP Protocol
- Each has Connect button, category tag, description
- Search bar
- 0 connected count
- VERDICT: FUNCTIONAL, matches Manus connectors

## App Builder (/webapp-builder)
- Builder/Preview/Code/Publish/History tabs
- App name input, description textarea, Build App button
- Build Progress panel
- Mobile and Publish buttons in header
- VERDICT: FUNCTIONAL

## Team (/team)
- Create Team (name input + Create button)
- Join Team (invite code input + Join button)
- Empty state: "No teams yet"
- VERDICT: FUNCTIONAL

## Settings (/settings)
- 4 tabs: Account, General, Capabilities, Bridge
- General tab: Notifications toggle, Sound effects toggle, Auto-expand actions toggle, Compact mode toggle
- Default System Prompt textarea
- VERDICT: FUNCTIONAL
