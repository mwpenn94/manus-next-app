# NS19 Screenshot Catalog — Comprehensive Manus UI Analysis

## Chat Panel Features

### Task Progress Card (in-chat)
- Collapsible card showing "Task Progress X/Y" with chevron toggle
- Each phase: green check (done), blue dot + elapsed timer (active), gray clock (pending)
- Phase names like "Implement gap fixes", "Run convergence passes"
- Active phase shows elapsed time "04:24" in blue
- Card has subtle border, rounded corners, sits in the chat stream

### Active Tool Indicator (in-chat during streaming)
- Shows "Manus is using Editor" with pencil icon in circle
- Subtitle: "Reading file manus-next-app/client/..." or "Searching file client/**/*"
- Icon varies: pencil (editor), globe (browser), terminal (terminal)
- Appears below the streaming content area

### Streaming Content
- Agent avatar (Manus logo) + "manus" name label
- Action steps in collapsible list (green checks for done, spinner for active)
- Markdown rendered content below action steps
- Bouncing dots when waiting for content

## Sandbox Viewer (Full-screen overlay)

### Header
- X close button (left), "Manus's computer" title (center), takeover icon (right)
- Clean minimal header

### Code Viewer
- File name in header bar above code ("index.html")
- Monospace code with syntax highlighting on dark bg
- Bottom tab bar: Diff | Original | Modified (segmented control)

### Diff View
- Green highlighted lines for additions
- Red highlighted lines for deletions (with strikethrough)
- Line-by-line diff display

### Browser View
- Shows browser preview with URL bar
- Floating left toolbar (vertical, rounded):
  - Back arrow, Hand/interact, Keyboard, Clipboard, Phone, Close
  - Separated by thin dividers

### Progress Controls
- Horizontal progress scrubber bar
- Step navigation: |◀ (skip back) | • Live (green dot) | ▶| (skip forward)

## Input Bar

### Layout: [+] [attachment badges] [textarea] [mic] [send]
- Plus (+) button: circle with plus icon, opens attachment menu
- Attachment badges: e.g., GitHub icon with "+1" count overlay
- Textarea: expandable text input
- Mic: microphone icon button
- Send: up-arrow in filled circle

## Sidebar

### Task List Items
- Each task shows: title, timestamp, status indicator
- Status: green dot (running), checkmark (done), red dot (error)
- Active task highlighted with accent bg
- Truncated title with ellipsis

### Navigation
- Home, Projects, GitHub, Settings, Billing links
- User avatar at bottom with dropdown
- Collapse/expand toggle

## Settings Page
- Multiple tabs: Account, General, Notifications, Secrets, Capabilities, Bridge
- Clean card-based layout per section
- Toggle switches for capabilities
- Text inputs for API keys/URLs

## Home Page
- Centered greeting "Hello." with subtitle
- Large text input area with placeholder
- Category filter tabs (Featured, Research, Life, Data, Education, Productivity)
- Suggestion cards in 2-column grid
- Package badges strip at bottom
