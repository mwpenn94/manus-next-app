# Manus Task View Reference — App Development E2E Flow

## From Screenshots: "create a demo app" task

### Task Header Bar
- Task title: "create a demo app"
- Status badge: "Completed" (green)
- Cost: "~$2.00+ limitless"
- Model selector dropdown: "Manus Limitless ∨"
- Action icons (right): screen share, share, bookmark, three-dot menu

### Right Panel: "Manus's Computer"
- Header: "Manus's Computer" with expand icon
- Tabs: Browser | All 7 | Docs | Images | Code 5 | Links 2
- Content: Shows "No browser activity yet" with globe icon
- "Screenshots will appear here when the agent browses the web"
- "Session ended" at bottom

### Chat Messages Flow
1. User message bubble (right-aligned, dark bg): "create a demo app"
2. Agent clarification message: asks what kind of content/features, design preferences
3. Agent action message: "Producing the requested output..."
4. Agent creates React app, modifies src/App.tsx
5. Agent adds index.css styling
6. "[Response interrupted — partial content saved]" indicator
7. Collapsible "8 steps completed" section with:
   - "Creating file: src/App.tsx" [show]
   - "Reasoning about next steps..." [show]
   - "File operations App.tsx, index.css, App.tsx" [3/3 ∨]
   - "Reasoning about next steps..." [show]
   - "Creating file: src/index.css" [show]
   - "Deploying webapp: v1.0-counter-app" [show]
8. Action buttons below steps: "Listen" | "Regenerate" | "Branch"

### Webapp Project Card (inline in chat)
Two card variants seen:

**Variant 1 — Published card (compact):**
- App icon (green rocket) + "demo-app"
- Status: "Published ·"
- URL: "d2xsxph8kpxj0f.cloudfront.net/310519663357..."
- Action bar: Preview | Code | Dashboard | Settings | external-link
- Device preview toggles: desktop | tablet | mobile icons
- "Preview (port 4200)" with copy + refresh buttons

**Variant 2 — Live card (rich):**
- App icon (green rocket) + "demo-app"
- Badge: "● Live" (green) + "v1.0-counter-app"
- URL: "d2xsxph8kpxj0f.cloudfront.net/310519663357..." + copy button
- Two action buttons: "Visit Site" | "Manage"
- Below card: "Listen" | "Branch"

### Post-Completion Section
- "Task completed" badge (green checkmark)
- "Rate this response ★★★★★" (5 stars)
- Suggestion chips: "Make it more concise" | "Expand on the key points" | "Adjust the tone to be more formal" | "Translate to another language"

### Message Input
- Placeholder: "Message Manus..."
- Left icons: + (attach) | mic | headphones
- Right: send arrow button
- Footer: "Manus may make mistakes. Verify important information."

### Mobile Bottom Nav (from task view)
- Home | Tasks | Billing | More (...)
- "Manage Project" + "Publish" buttons visible

### Deployed App Preview
- URL: d2xsxph8kpxj0f.cloudfront.net/.../demo-app-.../index_4f0449aa.html
- Shows: Simple card with "demo-app" title + "A simple demo application to showcase capabilities."
- Light gray background, centered white card

## Key Parity Gaps vs Our Current TaskView
1. No webapp project card (inline in chat showing app status, preview, management)
2. No collapsible agent steps (file operations, reasoning, deploying)
3. No right panel "Manus's Computer" with artifact tabs
4. No "Task completed" badge with rating stars
5. No suggestion chips after completion
6. No Listen/Branch/Regenerate actions
7. No "[Response interrupted]" handling
8. No cost display in task header
9. No model selector in task header
10. No device preview toggles (desktop/tablet/mobile) in webapp card
