# Mobile UI Analysis — Playwright iPhone 14 Pro (390x844)

## Current State (Playwright headless)
The Playwright screenshot shows the mobile layout is **mostly correct**:
- AppLayout header with hamburger menu, logo, theme toggle, notifications — renders properly
- Home page sticky header with ModelSelector and Credits — renders below AppLayout header
- Input pill shape renders correctly with + button, mic, and send
- Quick action chips ("Build a website", "Create slides") — horizontal scroll works but last items cut off
- Suggestion cards — horizontal scroll works, partially visible

## Issues Identified from User's Screenshot (actual iPhone)
The user's screenshot shows different behavior than Playwright headless:
1. **Left sidebar icons bleeding through** — visible on left edge (copy/paste icons?)
2. **Input area has slight overlap** with sidebar elements
3. **Category pills cut off** on right edge — "Write a docu..." truncated

## Root Cause Analysis
1. The "bleeding icons" on the left in the user's screenshot appear to be **copy/clipboard icons** from the iOS system, not sidebar elements. The sidebar is properly hidden with `-translate-x-full` on mobile.
2. The actual layout issues are:
   - **Double header**: AppLayout header (h-14) + Home sticky header (ModelSelector + Credits) = wasted vertical space
   - **Quick action pills**: overflow-x-auto works but no edge fade indicator for scrollability
   - **Bottom nav overlap**: MobileBottomNav is fixed at bottom with z-50, and main content has pb-[calc(3.5rem+env(safe-area-inset-bottom))] but content may still be obscured
   - **Suggestion cards**: horizontal scroll works but no scroll indicator

## Fixes Needed
1. On mobile Home, hide the AppLayout top header OR merge it with Home's own header
2. Add scroll fade indicators on horizontal scroll containers
3. Ensure bottom nav doesn't overlap content
4. Add proper safe-area padding for notched devices
