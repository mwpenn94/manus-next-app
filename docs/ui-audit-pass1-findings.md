# UI Audit Pass 1 — Comprehensive Findings

## Desktop Pages — All Good
- Home: Clean layout, sidebar visible, suggestion cards, powered-by badges
- Billing: Clean centered sign-in prompt
- Settings: Two-column layout works well on desktop (sidebar nav + content)
- Analytics: Shows loading spinner (expected — no auth)

## Mobile Pages — Issues Found

### Settings Page (CRITICAL)
Two-column layout (left nav + right content) is squeezed on 390px mobile. The right panel content wraps excessively. Need to stack vertically on mobile — show nav as horizontal tabs or collapsible at top, then full-width content below.

### Home Page (FIXED)
- Single header with hamburger + ModelSelector + Credits — GOOD
- Top-aligned content — GOOD
- Scroll indicators on horizontal scrollers — GOOD

### Other Pages (billing, memory, schedule, design, etc.)
- All render correctly with centered sign-in prompts
- Header consistent (hamburger + logo + theme + notifications)
- Bottom nav visible and correct
- FeedbackWidget FAB positioned above bottom nav

## Priority Fix
1. Settings page mobile layout — stack columns vertically on mobile
