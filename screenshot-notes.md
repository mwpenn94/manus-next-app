# Screenshot Observations

## Latest (after AppLayout rewrite)
- Sidebar shows: Search input with "Search tasks & messages..." placeholder
- Status filter tabs: All | Running | Done | Error — rendering correctly
- New task button with ⌘K shortcut
- One existing task "What can you do?" with clock icon (idle status) and "2h ago"
- Footer: Usage & Billing, Settings, user "Michael Penn" with logout
- No TypeScript errors
- Home page renders correctly with suggestion cards
- Status filter tabs are compact and well-styled

## Remaining work for this pass:
1. TaskView workspace panel needs real artifact rendering (read current TaskView)
2. TaskContext needs to persist workspace artifacts from bridge events
3. Voice input needs MediaRecorder integration
4. System prompt editor in TaskView
5. Task favorite toggle in TaskView
6. Tests for new features
