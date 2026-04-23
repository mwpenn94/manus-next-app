# Mobile UI Issues — Screenshot Analysis (2026-04-23)

## From user screenshot (iPhone, ~390px width):

1. **Sidebar icons bleeding through on left edge**: Two square bracket-like icons visible on the left side of the home page, overlapping the greeting area. These appear to be sidebar toggle/collapse icons that should be hidden on mobile.

2. **Connector/share icon floating**: A small branching icon (likely the connectors or share icon from the sidebar) is visible on the left edge near the input area.

3. **Horizontal line/divider visible on left**: A thin horizontal line appears on the left side, likely a sidebar border or divider bleeding through.

4. **Input area**: The main input textarea appears to work but the left edge may be slightly obscured by the sidebar bleed.

5. **Category pills**: "Build a website", "Create slides", "Write a doc..." — the rightmost pills are cut off, which is expected for horizontal scroll but needs proper overflow handling.

6. **Suggestion cards**: Appear to render correctly but may need padding adjustments.

7. **Bottom nav**: Home, Tasks, Billing, More tabs appear correctly positioned.

## Root cause hypothesis:
The sidebar component is likely using CSS that makes it partially visible even when collapsed on mobile. Need to check:
- App.tsx layout structure
- DashboardLayout or sidebar component
- Home page wrapper and z-index stacking
- Mobile breakpoint handling for sidebar visibility
