# Manus UI Alignment Notes — Session 11

## Manus Homepage (manus.im)
- Clean, minimal layout with centered "What can I do for you?" heading
- Input area at center with + button, up arrow send button
- Quick action chips below: Create slides, Build website, Develop desktop apps
- NO floating FAB button anywhere
- Light theme by default (#f8f8f7 background)
- Top nav: Features, Solutions, Resources, Events, Business, Pricing
- Mobile: hamburger menu, same clean layout

## Key Observations for Alignment
1. NO FeedbackWidget FAB visible anywhere in Manus — confirmed on manus.im
2. Feedback is accessed through settings/menu, not a floating button
3. Task view has clean input area at bottom, no overlapping elements
4. Model selector in header area, not overlapping with input
5. App cards show proper preview with exposed URL, not localhost
6. Agent creates NEW projects, doesn't edit itself
7. Light theme default (#f8f8f7 background)
8. Clean minimal design — no floating buttons, no visual clutter

## FeedbackWidget Decision
Remove the floating FAB entirely. Move feedback to Settings page (accessible from sidebar/More menu).
This aligns with Manus which has NO floating buttons on any page.
