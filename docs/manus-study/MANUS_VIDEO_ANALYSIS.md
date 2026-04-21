# Manus Video Analysis — UX Patterns Extracted

**Source:** Google Drive video provided by user (2026-04-21)
**Analysis method:** manus-analyze-video on local file

## 1) UI Layout

- **Three-panel layout:** Left sidebar (task list) + Center (chat/conversation) + Right (workspace/preview)
- **Sidebar:** Dark background, task list with timestamps, search, new task button at top
- **Chat panel:** Message bubbles with agent action steps inline
- **Workspace panel:** Shows agent's computer — live terminal, code editor, browser preview
- **Mobile:** Collapses to single panel with swipe/tab navigation

## 2) Color Scheme

- **Dark theme primary:** Deep charcoal/near-black background
- **Accent:** Subtle purple/blue undertones
- **Text:** White/light gray for primary, muted gray for secondary
- **Action indicators:** Tool-specific colors (blue for browsing, green for code, orange for file ops)
- **Cards:** Slightly lighter than background, subtle borders

## 3) Key Features Observed

- Conversational task creation
- Inline tool execution with live status ("Manus is using Editor")
- User confirmation blocks for destructive actions
- Interactive outputs (Dashboard/Preview buttons in chat)
- Skill Creator agent (conversational tool creation)
- Agentic autonomy with convergence loops
- Workspace panel showing live terminal/code/browser

## 4) Animation Patterns

- Smooth slide-in for panels
- Fade transitions between views
- Pulsing dots for thinking state
- Character-by-character code writing in workspace
- Smooth scroll for terminal output

## 5) Typography

- Clean sans-serif (Inter/Roboto-like)
- Strong hierarchy: large bold titles, medium list items, small metadata
- Generous padding and margins throughout

## 6) Interaction Patterns

- Text prompt as primary interaction
- "+" icon opens attachment bottom sheet (Camera, Add files, Connect My Computer, Add Skills, Build website, Create slides, Create image, Generate audio)
- Inline tool execution blocks in chat
- User confirmation gates for complex operations
- Interactive output elements (buttons for Dashboard/Preview)

## 7) Unique UX Patterns

- **Workspace/Computer split:** Exposes agent's working environment alongside chat
- **Conversational Skill Creation:** Chat-based tool definition
- **Agentic autonomy with checkpoints:** Self-debugging loops (Pass N Convergence)
- **Transparency:** Users watch agent write code, run commands, browse web in real-time

## 8) Presence/Typing Indicators

- **"Manus is thinking..."** — immediate after user prompt, pulsing dots
- **"Manus is working"** — active execution with sub-status (Loading skill, Inspect skill scripts, Reading file...)
- **Live terminal/editor view** — real-time scrolling output as detailed presence indicator

## 9) File Upload/Attachment UI

- "+" icon in chat input
- Bottom sheet menu with:
  - Horizontal carousel of recent Photos/Collections
  - List: Add files, Connect My Computer, Add Skills, Build website, Create slides, Create image, Generate audio
- Attached items appear as rounded pills/preview cards above input

## 10) Settings & Navigation

- **Account & Billing:** Manus Pro subscription, credit usage (Free/Monthly/Add-on)
- **Data Controls:** Shared tasks, files, websites, apps, purchased domains
- **Cloud Browser:** Persist login state toggle, cookie management
- **Skills:** Official library + personal skills with enable/disable toggles
- **Connectors:** Extensive third-party services with auth/permissions management
- **General:** Language, Appearance (Light/Dark/System), Communication preferences, Clear cache
