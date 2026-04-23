# Mobile Fix Progress

## After Fix 1 (Playwright iPhone 14 Pro, 390x844)
- FeedbackWidget FAB now positioned above bottom nav area (visible in bottom-right)
- Quick action pills still show "Write a docu..." cutoff — the fade mask is working but the text is still truncated
- Suggestion cards show partial second card — this is expected for horizontal scroll
- The double header issue remains: AppLayout header (hamburger + logo + theme) + Home header (ModelSelector + Credits) 
- Too much vertical whitespace between headers and greeting on mobile
- Content is vertically centered which pushes it down too much on mobile — should be top-aligned on mobile

## Remaining Issues to Fix
1. Reduce vertical centering on mobile — use top alignment instead of center
2. Reduce gap between Home header and greeting
3. Consider hiding AppLayout header on Home route on mobile (since Home has its own header)
4. Bottom nav is not visible in Playwright screenshot — may be below viewport or hidden by preview banner
5. The input pill wraps to 2 lines on mobile — "Give Manus Next a task to work on..." is too long for the available width
