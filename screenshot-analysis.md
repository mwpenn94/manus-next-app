# Screenshot Analysis — User's Deployed App (IMG_7246-7258)

These are screenshots from the USER'S OWN DEPLOYED Sovereign AI app, NOT from Manus.
The task is to fix bugs visible here and then achieve deeper alignment with real Manus.

## Bugs/Issues Identified

### IMG_7246 — CRITICAL: MIME Type Error
- Error page: "'text/html' is not a valid JavaScript MIME type."
- This is a deployment/build error — the server is returning HTML instead of JS files
- Likely a routing issue where SPA fallback serves index.html for .js asset requests
- Need to investigate server/_core/index.ts static file serving

### IMG_7247 — Settings > Secrets Page (scrolled down)
- Shows OPENAI_API_KEY (not set), STRIPE_SECRET_KEY (set), DATABASE_URL (set)
- "Secrets are encrypted at rest" notice at bottom
- Page looks functional

### IMG_7248 — Settings > Secrets Page (top)
- Shows "Secrets & Environment Variables" header
- GITHUB_TOKEN (not set), OPENAI_API_KEY (not set), STRIPE_SECRET_KEY (set)
- Tab bar: General, Notifications, Secrets, Capabilities
- Active tab has pill-shaped amber/primary fill — matches our design

### IMG_7249-7250 — Connectors Page (full view)
- Header: plug icon + "Connectors" + "1 connected" badge
- Tab bar: Apps, Custom API, Custom MCP
- Search bar: "Search connectors..."
- Categories: COMMUNICATION (Slack, Email SMTP, Gmail, Outlook Mail), DEVELOPMENT (GitHub with OAuth badge)
- GitHub shows green dot + OAuth badge + toggle
- Each connector has icon, name, description, "Connect" action in primary color

### IMG_7251 — Cloud Browser Page
- Tab bar: ...abilities, Connectors, Cloud Browser, Data Con...
- "Cloud Browser" header with description
- Card with: Persist login state toggle (on), Saved cookies section (empty), Clear browser data + Clear All button

### IMG_7252 — Bridge Page
- Tab bar: Browser, Data Controls, Bridge, Feedback
- "Bridge" header + "@manus/bridge" code badge
- Card: Manus Bridge title, description, "Disconnected" status
- Bridge URL input (mono font), API Key input, Connect button (primary)
- Developer Guide + GitHub external links

### IMG_7253-7254 — Notifications Popover
- Header: "Notifications" + "Read all" checkmark + X close
- Summary: "28 auto-completed tasks" + "Resume All" action (amber)
- Individual notifications with clock icon, title, description, timestamp
- Amber unread dot on right side of unread items
- Bug Report section at bottom with red bug icon

### IMG_7255-7256 — Sidebar Menu (More menu)
- Items with emoji icons:
  - Projects (folder), Library (books), Skills (lightning), Schedule (calendar)
  - Connectors (plug), Memory (brain), GitHub (link), Billing (credit card)
  - Discover (compass), Help (question mark), Webhooks (hook), Data Controls (shield)
- Bottom bar icons: settings, grid, plug, question, monitor
- Mobile bottom nav: Home, Tasks, Billing, More

### IMG_7257-7258 — Connectors Bottom Sheet Modal
- Modal overlay with X close + "Connectors" title + "+" add button
- Connected items at top (GitHub with green dot)
- "AVAILABLE" section header
- Items: My Browser, Gmail, Google Calendar, Google Drive, Outlook Mail, Microsoft 365, Slack, Notion
- Each has icon, name, description, chevron right
- Card-style items with subtle border

## Priority Fixes
1. MIME type error (IMG_7246) — investigate deployment build
2. Ensure all pages shown are working correctly
3. Research real Manus app for deeper parity comparison
