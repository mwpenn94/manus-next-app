# Manus.im Observable Capabilities — Live Session Capture

**Date:** 2026-04-20
**Session:** Authenticated browser session (user: Michael Penn)
**Version:** Manus 1.6 Max
**Credits observed:** 50.5K–52.9K (declining during session)

## Interface Capabilities Observed

### Sidebar Task Types (from user history)
1. **Web App Building** — "Manus Next" project (active, with webapp builder)
2. **Prompt Engineering** — "Build Manus Prompt v8 Using Provided Blueprint and Best Practices"
3. **CRM/Marketing Automation** — "Marketing Automation and CRM Setup in Go High Level"
4. **File Processing** — "Using Uploaded File as Command Input"
5. **Creative/Game Design** — "Optimizing DnD Campaign for Maximum Player Experience"
6. **Monitoring/Troubleshooting** — Multiple "Monitor GHL Bulk Contact Import Sync" tasks
7. **Billing/Payment** — "How to Add Payment Information in GoHighLevel Billing"

### Quick Action Buttons
- Create slides
- Build website
- Develop desktop apps
- Design
- More (expandable)

### Integration Capabilities
- "Connect your tools to Manus" section visible
- GitHub, Google, Microsoft, Slack, Notion icons visible in toolbar
- File attachment support (+ button)
- Voice input (microphone icon)
- Screen/clipboard integration (monitor icon)

### Platform Features
- Collaborate button (multi-user)
- Share button (task sharing)
- Agent mode (sidebar)
- Search (sidebar)
- Library (sidebar)
- Projects (sidebar, with grouping)
- Task history with status indicators (running/done icons)
- Credit tracking (top-right)
- Desktop app download available (Windows/macOS)
- Custom AI agent creation ("Customize your AI agent for your business")
- Custom skills ("Create skills — Automate your workflow")
- Personalization ("Let Manus know more about you")

## Key Differences from manus-next-app

| Feature | manus.im | manus-next-app |
|---------|----------|----------------|
| Browser automation | Full (Chromium sandbox) | Not available |
| Computer use | Full desktop control | Not available |
| File system access | Full sandbox FS | S3 storage only |
| Web app building | Built-in webapp builder | IS the webapp |
| Slides creation | Built-in | Not implemented |
| Desktop app building | Built-in | Not available |
| Design tools | Built-in | Not implemented |
| Agent mode | Dedicated mode | Single agent only |
| Multi-user collab | Collaborate button | Not implemented |
| Task sharing | Share button | Not implemented |
| Voice input | Microphone button | Not implemented |
| Tool integrations | GitHub, Google, MS, Slack, Notion | Connector stubs only |
| Custom agents | "Customize your AI agent" | Not available |
| Custom skills | "Create skills" | Not available |
| Personalization | "Personalize your Manus" | Not available |
| Credit system | Token-based (50K+) | No credit tracking |
| Desktop app | Windows/macOS download | Web-only |
| Task persistence | Full server-side | Fixed in NS13 (dual persistence) |
| Streaming | SSE with rich tool display | SSE with markdown |

## Capability Parity Assessment

### GREEN (Achieved or Exceeded)
- Task creation and management
- Chat-based interaction
- LLM-powered responses with streaming
- Task history and navigation
- Authentication (OAuth)
- Dark theme UI
- Responsive layout
- Message persistence (after NS13 fix)

### YELLOW (Partial)
- Connector integrations (stubs exist, not functional)
- File handling (S3 only, no local FS)
- Error recovery (improved in NS13, but no retry button yet)

### RED (Not Implemented)
- Browser automation
- Computer use
- Slides creation
- Desktop app building
- Design tools
- Agent mode
- Multi-user collaboration
- Task sharing
- Voice input
- Custom agents/skills
- Personalization
- Credit system
- Desktop app
