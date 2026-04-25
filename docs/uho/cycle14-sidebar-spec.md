# Real Manus Sidebar — Precise Specification

## Sidebar Structure (top to bottom, in a single scrollable column)

### Fixed Header (shrink-0)
- Logo: "manus" sparkle icon + text
- Top-right: copy/new-window icon button

### Nav Items (shrink-0)
- "New task" — pen/edit icon
- "Agent" — crosshair/target icon  
- "Search" — magnifying glass, shows "Ctrl+K" hint
- "Library" — bookshelf icon

### Projects Section (scrollable, flex-1)
- Section header: "Projects" muted label + "+" button (right-aligned)
- Each project is a tree node:
  - Folder icon + project name
  - Clicking expands/collapses to show child tasks
  - When expanded, child tasks are indented ~24px
  - Each child task shows: status icon + task title (truncated) + "..." menu on hover
  - Active/selected task has highlighted background (slightly lighter)
  - Running tasks show animated blue circle
  - Completed tasks show document/gear icons based on type

### All Tasks Section (at bottom of scrollable area)
- Section header: "All tasks" muted label + filter/settings icon
- Shows currently active/running task(s) — quick access
- Same task item format: status icon + title + "..." menu

### Share Banner (shrink-0)
- "Share Manus with a friend" + "Get 500 credits each" + chevron

### Bottom Icon Bar (shrink-0, pinned to bottom)
- Settings gear icon
- Grid/apps icon
- Monitor/display icon
- "from ∞ Meta" text

## Visual Details
- Sidebar width: ~260px
- Background: dark (matches app theme)
- Text: muted-foreground for labels, foreground for items
- Active task: slightly lighter bg highlight
- Hover: subtle bg change
- "..." menu: appears on hover, right-aligned
- Folder icons: outline style, muted color
- Task status icons: colored (blue for running, muted for completed)
- Indentation for child tasks: ~24px left padding
