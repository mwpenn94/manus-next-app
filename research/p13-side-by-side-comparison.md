# Side-by-Side Comparison: Manus vs Manus Next

## Captured: 2026-04-20

### Manus (Reference) Screenshot:
- Dark theme, warm tones
- Left sidebar: logo, New task, Agent, Search, Library, Projects, All tasks, task list, Share promo, bottom icons + "from Meta"
- Top bar: "Manus 1.6 Max" mode selector, notification bell, "92.2K" credits, user avatar
- Main: "What can I do for you?" heading, input box, attachment icons, tool connection row, quick action chips, business agent banner

### Manus Next (Our App) Screenshot:
- Dark theme, warm amber/gold tones
- Left sidebar: "manus next" logo, 3400 credits + v2.0 badge, search bar, task filters (All/Running/Done/Error), + New task, task list, nav items (Usage & Billing, Memory, Projects, Schedules, Replay, Skills), user profile + logout
- Main: agent illustration, "Hello." heading, "What can I do for you?" subtitle, input box with paperclip + mic, category tabs (Featured/Research/Life/Data Analysis/Education/Productivity), 4 suggestion cards, quick action chips at bottom

### Detailed Comparison Table:

| Feature | Manus | Manus Next | Parity |
|---------|-------|------------|--------|
| Dark theme | Yes, warm | Yes, warm amber | MATCH |
| Sidebar logo | "manus" with icon | "manus next" with icon | MATCH |
| Credits display | "92.2K" top-right | "3,400 credits" sidebar top | CLOSE (different position) |
| Version/mode | "Manus 1.6 Max" top-center | "v2.0" badge sidebar | CLOSE |
| New task button | Sidebar, no shortcut shown | Sidebar, ⌘K shortcut | EXCEED |
| Search | Sidebar nav item | Sidebar search bar (always visible) | EXCEED |
| Task list | In sidebar with status dots | In sidebar with status dots + filters | EXCEED |
| Task filters | None visible | All/Running/Done/Error tabs | EXCEED |
| Agent nav | Yes | Not separate (agent is the task view) | EQUIVALENT |
| Library nav | Yes | Not present | GAP |
| Projects | "Projects >" with + | "Projects" nav item | MATCH |
| Memory | Not visible on home | "Memory" nav item | EXCEED |
| Schedules | Not visible on home | "Schedules" nav item | EXCEED |
| Replay | Not visible on home | "Replay" nav item | EXCEED |
| Skills | Not visible on home | "Skills" nav item | EXCEED |
| Heading | "What can I do for you?" | "Hello." + "What can I do for you?" | EXCEED (warmer) |
| Input placeholder | "Assign a task or ask anything" | "Give Manus Next a task to work on..." | MATCH |
| Attachment icons | Paperclip, camera, GitHub, code, file | Paperclip, mic | GAP (fewer icons) |
| Voice input | Mic icon | Mic icon | MATCH |
| Tool connections | "Connect your tools to Manus" row | Not present | GAP |
| Quick actions | Create slides, Build website, Develop desktop apps, Design, More | Build a website, Create slides, Write a document, Generate images, Research a topic | EXCEED (more specific) |
| Category tabs | None | Featured/Research/Life/Data Analysis/Education/Productivity | EXCEED |
| Suggestion cards | None | 4 cards with icons + descriptions | EXCEED |
| Agent illustration | None | Yes, subtle illustration above heading | EXCEED |
| Share/referral | "Share Manus with a friend" card | Not present | GAP |
| Business agent banner | "Customize your AI agent" bottom | Not present | GAP |
| User profile | Avatar circle top-right | Name + avatar bottom-left | MATCH |
| Notification | Bell icon top-right | NotificationCenter in sidebar | MATCH |
| Mobile nav | Not visible | MobileBottomNav component | EXCEED |

### Summary:
- MATCH: 10 features
- EXCEED: 12 features (we do more)
- CLOSE: 2 features (minor positional differences)
- GAP: 5 features (Library nav, extra attachment icons, tool connections, share/referral, business agent banner)

### Actionable Gaps:
1. Library nav — Would need artifact storage system (significant feature)
2. Extra attachment icons (camera, GitHub, code) — Quick UI addition
3. Tool connections row — Quick UI addition
4. Share/referral — Nice-to-have, not core
5. Business agent banner — Nice-to-have, not core

### Priority Fixes:
- Add camera and code attachment icons to input area (quick win)
- Add "Connect your tools" integration hint below input (quick win)
